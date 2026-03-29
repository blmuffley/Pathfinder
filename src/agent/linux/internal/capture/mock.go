package capture

import (
	"context"
	"math/rand"
	"time"
)

// MockSource generates synthetic flow records for testing without eBPF.
type MockSource struct {
	interval time.Duration
}

// NewMockSource creates a mock flow source that emits synthetic flows.
func NewMockSource(interval time.Duration) *MockSource {
	return &MockSource{interval: interval}
}

var mockApps = []struct {
	srcIP       string
	dstIP       string
	dstPort     uint16
	protocol    string
	processName string
}{
	{"10.0.1.10", "10.0.2.20", 5432, "tcp", "java"},
	{"10.0.1.10", "10.0.2.30", 443, "tcp", "java"},
	{"10.0.1.10", "10.0.2.40", 9092, "tcp", "java"},
	{"10.0.1.10", "10.0.2.50", 6379, "tcp", "python3"},
	{"10.0.1.10", "10.0.2.60", 5672, "tcp", "node"},
	{"10.0.1.10", "10.0.3.10", 8080, "tcp", "nginx"},
	{"10.0.1.10", "10.0.3.20", 3306, "tcp", "python3"},
	{"10.0.1.10", "10.0.3.30", 389, "tcp", "httpd"},
}

// Start generates mock flows at the configured interval.
func (m *MockSource) Start(ctx context.Context, out chan<- FlowRecord) error {
	ticker := time.NewTicker(m.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			app := mockApps[rand.Intn(len(mockApps))]
			flow := FlowRecord{
				SrcIP:         app.srcIP,
				SrcPort:       uint16(30000 + rand.Intn(35000)),
				DstIP:         app.dstIP,
				DstPort:       app.dstPort,
				Protocol:      app.protocol,
				BytesSent:     uint64(256 + rand.Intn(8192)),
				BytesReceived: uint64(128 + rand.Intn(4096)),
				TimestampNs:   time.Now().UnixNano(),
				ProcessName:   app.processName,
				ProcessPID:    uint32(1000 + rand.Intn(50000)),
			}
			select {
			case out <- flow:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
}

// Close is a no-op for mock source.
func (m *MockSource) Close() error {
	return nil
}
