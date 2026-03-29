package shared

import (
	"context"
	"fmt"
	"time"
)

// Batcher collects FlowRecords and flushes them as batches by size or interval.
type Batcher struct {
	maxSize  int
	interval time.Duration
	out      chan<- []FlowRecord
}

// NewBatcher creates a flow batcher.
func NewBatcher(maxSize int, interval time.Duration, out chan<- []FlowRecord) *Batcher {
	return &Batcher{maxSize: maxSize, interval: interval, out: out}
}

// Run reads individual flows and emits batches. Blocks until ctx is cancelled.
func (b *Batcher) Run(ctx context.Context, in <-chan FlowRecord) error {
	ticker := time.NewTicker(b.interval)
	defer ticker.Stop()

	batch := make([]FlowRecord, 0, b.maxSize)
	flush := func() {
		if len(batch) == 0 {
			return
		}
		out := make([]FlowRecord, len(batch))
		copy(out, batch)
		select {
		case b.out <- out:
		case <-ctx.Done():
			return
		}
		batch = batch[:0]
	}

	for {
		select {
		case <-ctx.Done():
			flush()
			return ctx.Err()
		case flow, ok := <-in:
			if !ok {
				flush()
				return fmt.Errorf("flow channel closed")
			}
			batch = append(batch, flow)
			if len(batch) >= b.maxSize {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}
