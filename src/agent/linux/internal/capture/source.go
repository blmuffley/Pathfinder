package capture

import (
	"context"
	"fmt"
	"net"
	"time"
)

// FlowRecord represents a captured network flow ready for transmission.
type FlowRecord struct {
	SrcIP         string
	SrcPort       uint16
	DstIP         string
	DstPort       uint16
	Protocol      string // "tcp" or "udp"
	BytesSent     uint64
	BytesReceived uint64
	TimestampNs   int64
	DurationNs    int64
	ProcessName   string
	ProcessPID    uint32
}

// FlowSource is the interface for flow capture backends.
// The eBPF implementation is used on Linux; a mock can be used for testing.
type FlowSource interface {
	// Start begins capturing flows. Sends records on the output channel.
	// Blocks until ctx is cancelled or an error occurs.
	Start(ctx context.Context, out chan<- FlowRecord) error

	// Close releases all resources (eBPF programs, maps, etc).
	Close() error
}

// uint32ToIP converts a network-byte-order uint32 to a dotted IPv4 string.
func uint32ToIP(n uint32) string {
	ip := net.IPv4(byte(n), byte(n>>8), byte(n>>16), byte(n>>24))
	return ip.String()
}

// Batcher collects FlowRecords and flushes them as batches.
type Batcher struct {
	maxSize  int
	interval time.Duration
	out      chan<- []FlowRecord
}

// NewBatcher creates a flow batcher.
func NewBatcher(maxSize int, interval time.Duration, out chan<- []FlowRecord) *Batcher {
	return &Batcher{
		maxSize:  maxSize,
		interval: interval,
		out:      out,
	}
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
		// Copy batch to avoid race
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
