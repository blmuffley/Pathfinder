//go:build windows

package capture

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/blmuffley/Pathfinder/src/agent/shared"
)

// ETWSource captures TCP/UDP flows using Windows ETW (Event Tracing for Windows).
// Provider: Microsoft-Windows-Kernel-Network
//
// This is a scaffold — the actual ETW consumer requires the
// golang.org/x/sys/windows package and tdh.dll bindings.
type ETWSource struct {
	logger *zap.Logger
}

// NewETWSource creates a new ETW-based flow source.
func NewETWSource(logger *zap.Logger) (*ETWSource, error) {
	// TODO: Open ETW trace session with provider GUID:
	//   Microsoft-Windows-Kernel-Network: {7DD42A49-5329-4832-8DFD-43D979153A88}
	// Events of interest:
	//   EventID 10 = TCP connection start (IPv4)
	//   EventID 11 = TCP connection start (IPv6)
	//   EventID 12 = TCP disconnect
	//   EventID 15 = UDP datagram sent
	logger.Info("ETW flow capture initialized",
		zap.String("provider", "Microsoft-Windows-Kernel-Network"),
	)
	return &ETWSource{logger: logger}, nil
}

// Start consumes ETW events and emits FlowRecords.
func (s *ETWSource) Start(ctx context.Context, out chan<- shared.FlowRecord) error {
	s.logger.Info("starting ETW event consumption")

	// TODO: Real implementation would:
	// 1. Open trace session via StartTrace / OpenTrace
	// 2. Enable provider with EVENT_TRACE_PROPERTIES
	// 3. Process events via ProcessTrace callback
	// 4. For each TCP connect/disconnect, emit FlowRecord
	// 5. Enrich with WMI for process name: Win32_Process where ProcessId = <pid>

	// Placeholder: block until cancelled
	<-ctx.Done()
	return ctx.Err()
}

// Close stops the ETW trace session.
func (s *ETWSource) Close() error {
	s.logger.Info("ETW trace session closed")
	return nil
}

// WMI process enrichment helper
func resolveProcessName(pid uint32) string {
	// TODO: WMI query: SELECT Name FROM Win32_Process WHERE ProcessId = <pid>
	// Or use CreateToolhelp32Snapshot for faster local lookup
	return fmt.Sprintf("pid:%d", pid)
}
