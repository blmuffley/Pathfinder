package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/blmuffley/Pathfinder/src/agent/linux/internal/capture"
	"github.com/blmuffley/Pathfinder/src/agent/linux/internal/client"
	"github.com/blmuffley/Pathfinder/src/agent/linux/internal/config"
)

const agentVersion = "0.1.0"

func main() {
	configPath := flag.String("config", "/etc/pathfinder/agent.yaml", "path to agent config file")
	mockMode := flag.Bool("mock", false, "use mock flow source instead of eBPF")
	enrollToken := flag.String("token", "", "enrollment token (or PF_ENROLLMENT_TOKEN env)")
	flag.Parse()

	// Load config
	cfg, err := config.Load(*configPath)
	if err != nil {
		panic("failed to load config: " + err.Error())
	}

	// Logger
	logger := initLogger(cfg.Logging.Level, cfg.Logging.Format)
	defer logger.Sync()

	logger.Info("Pathfinder Agent (Linux) starting",
		zap.String("version", agentVersion),
		zap.String("gateway", cfg.Gateway.Address),
		zap.Bool("mock", *mockMode || cfg.Capture.MockMode),
	)

	// Context with signal handling
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		logger.Info("received signal, shutting down", zap.String("signal", sig.String()))
		cancel()
	}()

	// Enrollment token
	token := *enrollToken
	if token == "" {
		token = os.Getenv("PF_ENROLLMENT_TOKEN")
	}

	// Connect to gateway
	gwClient, err := client.New(ctx, cfg.Gateway.Address, cfg.Gateway.TLS, capture.Hostname(), logger)
	if err != nil {
		logger.Fatal("failed to connect to gateway", zap.Error(err))
	}
	defer gwClient.Close()

	// Enroll
	if err := gwClient.Enroll(ctx, token, agentVersion); err != nil {
		logger.Fatal("enrollment failed", zap.Error(err))
	}

	// Start heartbeat in background
	go gwClient.RunHeartbeat(ctx, cfg.Heartbeat.Interval, agentVersion)

	// Initialize flow source
	var source capture.FlowSource
	if *mockMode || cfg.Capture.MockMode {
		logger.Info("using mock flow source")
		source = capture.NewMockSource(500 * time.Millisecond)
	} else {
		logger.Info("loading eBPF flow capture")
		ebpfSrc, err := capture.NewEBPFSource(logger)
		if err != nil {
			logger.Fatal("failed to load eBPF", zap.Error(err))
		}
		source = ebpfSrc
	}
	defer source.Close()

	// Flow pipeline: source → batcher → sender
	flowCh := make(chan capture.FlowRecord, 4096)
	batchCh := make(chan []capture.FlowRecord, 64)

	// Start batcher
	batcher := capture.NewBatcher(cfg.Capture.BatchSize, cfg.Capture.FlushInterval, batchCh)
	go func() {
		if err := batcher.Run(ctx, flowCh); err != nil && ctx.Err() == nil {
			logger.Error("batcher error", zap.Error(err))
		}
	}()

	// Start sender (reads batches, sends to gateway)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case batch, ok := <-batchCh:
				if !ok {
					return
				}
				if err := gwClient.SendFlows(ctx, batch); err != nil {
					logger.Error("failed to send flows",
						zap.Error(err),
						zap.Int("batch_size", len(batch)),
					)
					// TODO: buffer locally for retry (Phase 8)
				} else {
					logger.Info("sent flow batch", zap.Int("count", len(batch)))
				}
			}
		}
	}()

	// Start capture (blocks until ctx cancelled)
	logger.Info("starting flow capture")
	if err := source.Start(ctx, flowCh); err != nil && ctx.Err() == nil {
		logger.Fatal("capture error", zap.Error(err))
	}

	logger.Info("agent shutdown complete")
}

func initLogger(level, format string) *zap.Logger {
	var lvl zapcore.Level
	switch level {
	case "debug":
		lvl = zap.DebugLevel
	case "warn":
		lvl = zap.WarnLevel
	case "error":
		lvl = zap.ErrorLevel
	default:
		lvl = zap.InfoLevel
	}

	var cfg zap.Config
	if format == "json" {
		cfg = zap.NewProductionConfig()
	} else {
		cfg = zap.NewDevelopmentConfig()
	}
	cfg.Level = zap.NewAtomicLevelAt(lvl)

	logger, err := cfg.Build()
	if err != nil {
		panic("failed to init logger: " + err.Error())
	}
	return logger
}
