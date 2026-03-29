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
	"github.com/blmuffley/Pathfinder/src/agent/k8s/internal/enrichment"
)

const agentVersion = "0.1.0"

func main() {
	gatewayAddr := flag.String("gateway", "localhost:8443", "gateway address")
	enrollToken := flag.String("token", "", "enrollment token (or PF_ENROLLMENT_TOKEN)")
	logLevel := flag.String("log-level", "info", "log level")
	mockMode := flag.Bool("mock", false, "use mock flow source")
	flag.Parse()

	logger := initLogger(*logLevel)
	defer logger.Sync()

	nodeName := os.Getenv("NODE_NAME")
	if nodeName == "" {
		nodeName = shared.Hostname()
	}

	logger.Info("Pathfinder Agent (K8s) starting",
		zap.String("version", agentVersion),
		zap.String("node", nodeName),
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() { <-sigCh; cancel() }()

	token := *enrollToken
	if token == "" {
		token = os.Getenv("PF_ENROLLMENT_TOKEN")
	}
	if *gatewayAddr == "localhost:8443" {
		if v := os.Getenv("PF_GATEWAY_ADDRESS"); v != "" {
			*gatewayAddr = v
		}
	}

	gwClient, err := shared.NewClient(ctx, *gatewayAddr, false, nodeName, "k8s", logger)
	if err != nil {
		logger.Fatal("connect failed", zap.Error(err))
	}
	defer gwClient.Close()

	if err := gwClient.Enroll(ctx, token, agentVersion); err != nil {
		logger.Fatal("enrollment failed", zap.Error(err))
	}

	go gwClient.RunHeartbeat(ctx, 30*time.Second, agentVersion)

	// K8s enricher — refreshes pod cache every 30s
	enricher := enrichment.NewEnricher(logger)
	go enricher.RunCacheRefresh(ctx, 30*time.Second)

	// Flow pipeline
	flowCh := make(chan shared.FlowRecord, 4096)
	batchCh := make(chan []shared.FlowRecord, 64)

	batcher := shared.NewBatcher(100, 10*time.Second, batchCh)
	go batcher.Run(ctx, flowCh)

	// Sender: enrich + send
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case batch := <-batchCh:
				// Enrich process names with K8s metadata
				for i := range batch {
					batch[i].ProcessName = enricher.EnrichProcessName(batch[i].SrcIP, batch[i].ProcessName)
				}
				if err := gwClient.SendFlows(ctx, batch); err != nil {
					logger.Error("send failed", zap.Error(err))
				}
			}
		}
	}()

	// On K8s, the eBPF capture runs on the host network namespace (same as Linux agent).
	// In mock mode, generate synthetic flows.
	if *mockMode {
		logger.Info("using mock flow source")
		mockRun(ctx, flowCh)
	} else {
		logger.Info("K8s agent: eBPF capture should be loaded from host namespace")
		// In production, the DaemonSet mounts /sys/kernel and runs eBPF.
		// Reuse Linux agent's eBPF loader here.
		// For now, wait for ctx cancellation.
		<-ctx.Done()
	}
}

func mockRun(ctx context.Context, out chan<- shared.FlowRecord) {
	counter := 0
	pseudoRand := func(n int) int {
		counter++
		return (counter * 7919) % n // simple deterministic spread
	}

	apps := []struct{ srcIP, dstIP, proc string; port uint16 }{
		{"10.244.1.5", "10.244.2.10", "envoy", 8080},
		{"10.244.1.5", "10.244.2.20", "java", 5432},
		{"10.244.1.5", "10.244.3.10", "python", 9092},
		{"10.244.1.5", "10.244.3.20", "node", 6379},
	}

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			app := apps[pseudoRand(len(apps))]
			out <- shared.FlowRecord{
				SrcIP: app.srcIP, SrcPort: uint16(30000 + pseudoRand(35000)),
				DstIP: app.dstIP, DstPort: app.port,
				Protocol: "tcp", ProcessName: app.proc,
				BytesSent: uint64(256 + pseudoRand(8192)),
				BytesReceived: uint64(128 + pseudoRand(4096)),
				TimestampNs: time.Now().UnixNano(),
				ProcessPID: uint32(1 + pseudoRand(65535)),
			}
		}
	}
}

func initLogger(level string) *zap.Logger {
	var lvl zapcore.Level
	switch level {
	case "debug":
		lvl = zap.DebugLevel
	default:
		lvl = zap.InfoLevel
	}
	cfg := zap.NewProductionConfig()
	cfg.Level = zap.NewAtomicLevelAt(lvl)
	l, _ := cfg.Build()
	return l
}
