package snsync

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/blmuffley/Pathfinder/src/gateway/internal/store"
)

// SyncLoop periodically pushes unsynced data from PostgreSQL to ServiceNow.
type SyncLoop struct {
	store     *store.Store
	client    *Client
	interval  time.Duration
	batchSize int
	logger    *zap.Logger
}

// NewSyncLoop creates a ServiceNow sync loop.
func NewSyncLoop(s *store.Store, c *Client, interval time.Duration, batchSize int, logger *zap.Logger) *SyncLoop {
	return &SyncLoop{
		store:     s,
		client:    c,
		interval:  interval,
		batchSize: batchSize,
		logger:    logger,
	}
}

// Run starts the sync loop. Blocks until ctx is cancelled.
func (l *SyncLoop) Run(ctx context.Context) {
	ticker := time.NewTicker(l.interval)
	defer ticker.Stop()

	l.logger.Info("ServiceNow sync loop started",
		zap.Duration("interval", l.interval),
		zap.Int("batch_size", l.batchSize),
	)

	for {
		select {
		case <-ctx.Done():
			l.logger.Info("ServiceNow sync loop stopped")
			return
		case <-ticker.C:
			l.syncOnce(ctx)
		}
	}
}

func (l *SyncLoop) syncOnce(ctx context.Context) {
	// Sync integrations
	l.syncIntegrations(ctx)
}

func (l *SyncLoop) syncIntegrations(ctx context.Context) {
	integrations, err := l.store.GetUnsyncedIntegrations(ctx, l.batchSize)
	if err != nil {
		l.logger.Error("failed to get unsynced integrations", zap.Error(err))
		return
	}

	if len(integrations) == 0 {
		return
	}

	l.logger.Info("syncing integrations to ServiceNow", zap.Int("count", len(integrations)))

	// Build request payload
	payloads := make([]IntegrationPayload, 0, len(integrations))
	for _, integ := range integrations {
		payloads = append(payloads, IntegrationPayload{
			SourceCI:                integ.SourceApp,
			TargetCI:                integ.TargetApp,
			IntegrationType:        integ.IntegrationType,
			ClassificationConfidence: integ.ClassificationConfidence,
			DiscoveryMethod:        "Pathfinder",
			FirstDiscovered:        integ.FirstSeen.Format(time.RFC3339),
			LastObserved:           integ.LastSeen.Format(time.RFC3339),
			FlowCount:              integ.FlowCount,
		})
	}

	resp, err := l.client.UpsertIntegrations(ctx, &UpsertIntegrationsRequest{
		Integrations: payloads,
	})
	if err != nil {
		l.logger.Error("failed to sync integrations to ServiceNow", zap.Error(err))
		// Log failures
		for _, integ := range integrations {
			l.store.InsertSyncLog(ctx, "integration", integ.ID, "", "create", "failed", err.Error())
		}
		return
	}

	// Mark as synced and log
	for _, result := range resp.Results {
		// Find the matching integration by source/target
		for _, integ := range integrations {
			if integ.SourceApp == result.SourceCI && integ.TargetApp == result.TargetCI {
				if err := l.store.MarkIntegrationSynced(ctx, integ.ID, result.SysID); err != nil {
					l.logger.Error("failed to mark integration synced",
						zap.String("id", integ.ID),
						zap.Error(err),
					)
				}
				l.store.InsertSyncLog(ctx, "integration", integ.ID, result.SysID, result.Operation, "success", "")

				l.logger.Info("synced integration",
					zap.String("source", integ.SourceApp),
					zap.String("target", integ.TargetApp),
					zap.String("sn_sys_id", result.SysID),
					zap.String("operation", result.Operation),
				)
				break
			}
		}
	}
}
