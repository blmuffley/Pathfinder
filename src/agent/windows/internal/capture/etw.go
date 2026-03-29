// Package capture provides network flow capture for Windows using ETW
// (Event Tracing for Windows) and WMI for process enrichment.
//
// On non-Windows platforms, this compiles but uses a mock source.
package capture

import (
	"context"

	"github.com/blmuffley/Pathfinder/src/agent/shared"
)

// FlowSource captures network flows. Platform-specific implementations
// are in etw_windows.go (real ETW) and etw_stub.go (mock for dev).
type FlowSource interface {
	Start(ctx context.Context, out chan<- shared.FlowRecord) error
	Close() error
}
