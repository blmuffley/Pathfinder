//go:build !windows

package capture

import (
	"context"
	"math/rand"
	"time"

	"go.uber.org/zap"

	"github.com/blmuffley/Pathfinder/src/agent/shared"
)

// ETWSource is a stub for non-Windows platforms. Uses mock data for development.
type ETWSource struct {
	logger *zap.Logger
}

// NewETWSource on non-Windows returns a mock source.
func NewETWSource(logger *zap.Logger) (*ETWSource, error) {
	logger.Warn("ETW not available — using mock flow source (non-Windows platform)")
	return &ETWSource{logger: logger}, nil
}

var winMockApps = []struct {
	srcIP, dstIP    string
	dstPort         uint16
	protocol, proc  string
}{
	{"10.0.10.10", "10.0.20.20", 1433, "tcp", "sqlservr.exe"},
	{"10.0.10.10", "10.0.20.30", 443, "tcp", "w3wp.exe"},
	{"10.0.10.10", "10.0.20.40", 5672, "tcp", "dotnet.exe"},
	{"10.0.10.10", "10.0.20.50", 389, "tcp", "lsass.exe"},
	{"10.0.10.10", "10.0.20.60", 3389, "tcp", "mstsc.exe"},
	{"10.0.10.10", "10.0.20.70", 8080, "tcp", "java.exe"},
}

// Start emits mock flows for development.
func (s *ETWSource) Start(ctx context.Context, out chan<- shared.FlowRecord) error {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			app := winMockApps[rand.Intn(len(winMockApps))]
			out <- shared.FlowRecord{
				SrcIP: app.srcIP, SrcPort: uint16(30000 + rand.Intn(35000)),
				DstIP: app.dstIP, DstPort: app.dstPort,
				Protocol: app.protocol, ProcessName: app.proc,
				BytesSent: uint64(256 + rand.Intn(8192)),
				BytesReceived: uint64(128 + rand.Intn(4096)),
				TimestampNs: time.Now().UnixNano(),
				ProcessPID: uint32(1000 + rand.Intn(50000)),
			}
		}
	}
}

// Close is a no-op on non-Windows.
func (s *ETWSource) Close() error { return nil }
