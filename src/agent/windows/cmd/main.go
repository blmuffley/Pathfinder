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

	"github.com/blmuffley/Pathfinder/src/agent/shared"
	"github.com/blmuffley/Pathfinder/src/agent/windows/internal/capture"
)

const agentVersion = "0.1.0"

func main() {
	gatewayAddr := flag.String("gateway", "localhost:8443", "gateway address")
	enrollToken := flag.String("token", "", "enrollment token (or PF_ENROLLMENT_TOKEN env)")
	logLevel := flag.String("log-level", "info", "log level")
	flag.Parse()

	logger := initLogger(*logLevel)
	defer logger.Sync()

	logger.Info("Pathfinder Agent (Windows) starting", zap.String("version", agentVersion))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() { <-sigCh; cancel() }()

	token := *enrollToken
	if token == "" {
		token = os.Getenv("PF_ENROLLMENT_TOKEN")
	}

	gwClient, err := shared.NewClient(ctx, *gatewayAddr, false, shared.Hostname(), "windows", logger)
	if err != nil {
		logger.Fatal("connect failed", zap.Error(err))
	}
	defer gwClient.Close()

	if err := gwClient.Enroll(ctx, token, agentVersion); err != nil {
		logger.Fatal("enrollment failed", zap.Error(err))
	}

	go gwClient.RunHeartbeat(ctx, 30*time.Second, agentVersion)

	// ETW capture
	source, err := capture.NewETWSource(logger)
	if err != nil {
		logger.Fatal("ETW init failed", zap.Error(err))
	}
	defer source.Close()

	flowCh := make(chan shared.FlowRecord, 4096)
	batchCh := make(chan []shared.FlowRecord, 64)

	batcher := shared.NewBatcher(100, 10*time.Second, batchCh)
	go batcher.Run(ctx, flowCh)

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case batch := <-batchCh:
				if err := gwClient.SendFlows(ctx, batch); err != nil {
					logger.Error("send failed", zap.Error(err), zap.Int("count", len(batch)))
				}
			}
		}
	}()

	if err := source.Start(ctx, flowCh); err != nil && ctx.Err() == nil {
		logger.Fatal("capture error", zap.Error(err))
	}
}

func initLogger(level string) *zap.Logger {
	var lvl zapcore.Level
	switch level {
	case "debug":
		lvl = zap.DebugLevel
	case "warn":
		lvl = zap.WarnLevel
	default:
		lvl = zap.InfoLevel
	}
	cfg := zap.NewProductionConfig()
	cfg.Level = zap.NewAtomicLevelAt(lvl)
	l, _ := cfg.Build()
	return l
}
