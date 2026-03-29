package classify

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/blmuffley/Pathfinder/src/gateway/internal/store"
)

// Loop runs the classification engine periodically against unclassified flows.
type Loop struct {
	store    *store.Store
	engine   *Engine
	interval time.Duration
	batch    int
	logger   *zap.Logger
}

// NewLoop creates a classification loop.
func NewLoop(s *store.Store, engine *Engine, interval time.Duration, batchSize int, logger *zap.Logger) *Loop {
	return &Loop{
		store:    s,
		engine:   engine,
		interval: interval,
		batch:    batchSize,
		logger:   logger,
	}
}

// Run starts the classification loop. Blocks until ctx is cancelled.
func (l *Loop) Run(ctx context.Context) {
	ticker := time.NewTicker(l.interval)
	defer ticker.Stop()

	l.logger.Info("classification loop started",
		zap.Duration("interval", l.interval),
		zap.Int("batch_size", l.batch),
	)

	for {
		select {
		case <-ctx.Done():
			l.logger.Info("classification loop stopped")
			return
		case <-ticker.C:
			l.runOnce(ctx)
		}
	}
}

func (l *Loop) runOnce(ctx context.Context) {
	// Fetch unclassified flows
	unclassified, err := l.store.GetUnclassifiedFlows(ctx, l.batch)
	if err != nil {
		l.logger.Error("failed to get unclassified flows", zap.Error(err))
		return
	}

	if len(unclassified) == 0 {
		return
	}

	l.logger.Info("classifying flows", zap.Int("count", len(unclassified)))

	// Convert store flows to classify flows
	flows := make([]Flow, 0, len(unclassified))
	for _, uf := range unclassified {
		flows = append(flows, Flow{
			ID:            uf.ID,
			AgentID:       uf.AgentID,
			SrcIP:         uf.SrcIP,
			SrcPort:       uf.SrcPort,
			DstIP:         uf.DstIP,
			DstPort:       uf.DstPort,
			Protocol:      uf.Protocol,
			BytesSent:     uf.BytesSent,
			BytesReceived: uf.BytesReceived,
			ProcessName:   uf.ProcessName,
			CapturedAt:    uf.CapturedAt,
		})
	}

	// Run classification
	results := l.engine.Classify(ctx, flows)

	// Persist results
	var classifiedIDs []int64
	for _, r := range results {
		integrationID, err := l.store.UpsertIntegration(ctx,
			r.SourceApp, r.TargetApp, r.IntegrationType,
			r.Confidence, r.FirstSeen, r.LastSeen, r.FlowCount,
		)
		if err != nil {
			l.logger.Error("failed to upsert integration",
				zap.String("source", r.SourceApp),
				zap.String("target", r.TargetApp),
				zap.Error(err),
			)
			continue
		}

		if err := l.store.UpsertInterface(ctx,
			integrationID, r.Protocol, r.Port, r.Direction,
			r.Pattern, r.ProcessName, r.AvgBytes, r.FlowCount,
			r.FirstSeen, r.LastSeen,
		); err != nil {
			l.logger.Error("failed to upsert interface",
				zap.String("integration_id", integrationID),
				zap.Error(err),
			)
			continue
		}

		classifiedIDs = append(classifiedIDs, r.FlowIDs...)

		l.logger.Info("classified integration",
			zap.String("source", r.SourceApp),
			zap.String("target", r.TargetApp),
			zap.String("type", r.IntegrationType),
			zap.Float64("confidence", r.Confidence),
			zap.Int64("flows", r.FlowCount),
		)
	}

	// Mark flows as classified
	if err := l.store.MarkFlowsClassified(ctx, classifiedIDs); err != nil {
		l.logger.Error("failed to mark flows classified", zap.Error(err))
	}
}
