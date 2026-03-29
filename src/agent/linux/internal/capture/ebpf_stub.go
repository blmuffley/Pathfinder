//go:build !linux

package capture

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.uber.org/zap"
)

// EBPFSource is a stub for non-Linux platforms (macOS dev).
// It uses MockSource instead of real eBPF.
type EBPFSource struct {
	mock   *MockSource
	logger *zap.Logger
}

// NewEBPFSource on non-Linux platforms returns a mock source with a warning.
func NewEBPFSource(logger *zap.Logger) (*EBPFSource, error) {
	logger.Warn("eBPF not available on this platform — using mock flow source")
	return &EBPFSource{
		mock:   NewMockSource(500 * time.Millisecond),
		logger: logger,
	}, nil
}

// Start delegates to the mock source.
func (s *EBPFSource) Start(ctx context.Context, out chan<- FlowRecord) error {
	return s.mock.Start(ctx, out)
}

// Close is a no-op on non-Linux.
func (s *EBPFSource) Close() error {
	return nil
}

// Hostname returns the system hostname.
func Hostname() string {
	h, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return h
}

// Stub types for generated eBPF code (so the package compiles without bpf2go output)
type flowTrackerObjects struct{}

func (o *flowTrackerObjects) Close() error { return nil }

func loadFlowTrackerObjects(_ *flowTrackerObjects, _ interface{}) error {
	return fmt.Errorf("eBPF not supported on this platform")
}
