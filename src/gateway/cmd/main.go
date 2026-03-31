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

	"github.com/blmuffley/Pathfinder/src/gateway/internal/bearing"
	"github.com/blmuffley/Pathfinder/src/gateway/internal/classify"
	"github.com/blmuffley/Pathfinder/src/gateway/internal/config"
	"github.com/blmuffley/Pathfinder/src/gateway/internal/server"
	"github.com/blmuffley/Pathfinder/src/gateway/internal/snsync"
	"github.com/blmuffley/Pathfinder/src/gateway/internal/store"
)

func main() {
	configPath := flag.String("config", "config/gateway-dev.yaml", "path to gateway config file")
	flag.Parse()

	// Load configuration
	cfg, err := config.Load(*configPath)
	if err != nil {
		panic("failed to load config: " + err.Error())
	}

	// Initialize logger
	logger := initLogger(cfg.Logging.Level, cfg.Logging.Format)
	defer logger.Sync()

	logger.Info("Pathfinder Gateway starting",
		zap.Int("port", cfg.Server.Port),
		zap.String("log_level", cfg.Logging.Level),
	)

	// Setup context with signal handling
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		logger.Info("received signal, shutting down", zap.String("signal", sig.String()))
		cancel()
	}()

	// Connect to PostgreSQL
	db, err := store.New(ctx, cfg.Database.URL, cfg.Database.MaxConnections, logger)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Initialize classification engine
	classifier := classify.NewEngine(cfg.Classification.ConfidenceThreshold, logger)

	// Start classification loop in background
	classifyLoop := classify.NewLoop(db, classifier, 10*time.Second, 1000, logger)
	go classifyLoop.Run(ctx)

	// Start ServiceNow sync loop (if SN instance is configured)
	if cfg.ServiceNow.Instance != "" && cfg.ServiceNow.Instance != "https://mock-sn.localhost" {
		snClient := snsync.NewClient(
			cfg.ServiceNow.Instance,
			cfg.ServiceNow.ClientID,
			cfg.ServiceNow.ClientSecret,
			logger,
		)
		syncLoop := snsync.NewSyncLoop(db, snClient, cfg.ServiceNow.SyncInterval, cfg.ServiceNow.BatchSize, logger)
		go syncLoop.Run(ctx)
	} else {
		logger.Warn("ServiceNow sync disabled — no valid instance configured")
	}

	// Start Bearing confidence feed publisher (if configured)
	bearingCfg := bearing.LoadConfigFromEnv()
	if bearingCfg.Enabled {
		if bearingCfg.SNInstanceURL == "" && cfg.ServiceNow.Instance != "https://mock-sn.localhost" {
			bearingCfg.SNInstanceURL = cfg.ServiceNow.Instance
		}
		resolver := bearing.NewResolver(cfg.ServiceNow.Instance, "", logger)
		go resolver.RunCacheRefresh(ctx, 5*time.Minute)
		pub := bearing.NewPublisher(bearingCfg, db, resolver, logger)
		go pub.Run(ctx)
	} else {
		logger.Info("Bearing integration disabled (set BEARING_WEBHOOK_URL to enable)")
	}

	// Start gRPC server
	grpcServer := server.NewGRPCServer(db, classifier, logger)
	if err := grpcServer.Serve(cfg.Server.Port); err != nil {
		logger.Fatal("gRPC server failed", zap.Error(err))
	}
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
