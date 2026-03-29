package classify

import (
	"context"
	"testing"
	"time"

	"go.uber.org/zap"
)

func testLogger() *zap.Logger {
	logger, _ := zap.NewDevelopment()
	return logger
}

func TestClassifyPortRules(t *testing.T) {
	engine := NewEngine(0.0, testLogger()) // threshold 0 to see all results

	tests := []struct {
		name           string
		dstPort        int
		protocol       string
		processName    string
		wantType       string
		wantMinConf    float64
	}{
		{"PostgreSQL", 5432, "tcp", "", "Database", 0.85},
		{"HTTPS API", 443, "tcp", "", "API", 0.85},
		{"Kafka", 9092, "tcp", "", "Messaging", 0.85},
		{"Redis", 6379, "tcp", "", "Database", 0.85},
		{"RabbitMQ", 5672, "tcp", "", "Messaging", 0.85},
		{"MySQL", 3306, "tcp", "", "Database", 0.85},
		{"LDAP", 389, "tcp", "", "Directory", 0.85},
		{"SMTP", 25, "tcp", "", "Email", 0.85},
		{"SSH", 22, "tcp", "sshd", "Remote Access", 0.80},
		{"SFTP via port 22", 22, "tcp", "sftp-server", "File Transfer", 0.85},
		{"HTTP proxy", 8080, "tcp", "nginx", "API", 0.85},
		{"Unknown high port", 50051, "tcp", "", "Custom", 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			now := time.Now()
			flows := []Flow{
				{
					ID: 1, SrcIP: "10.0.1.1", SrcPort: 40000,
					DstIP: "10.0.2.1", DstPort: tt.dstPort,
					Protocol: tt.protocol, ProcessName: tt.processName,
					BytesSent: 1024, BytesReceived: 512,
					CapturedAt: now,
				},
			}

			results := engine.Classify(context.Background(), flows)
			if len(results) == 0 {
				t.Fatal("expected at least one result")
			}

			r := results[0]
			if r.IntegrationType != tt.wantType {
				t.Errorf("type = %q, want %q", r.IntegrationType, tt.wantType)
			}
			if r.Confidence < tt.wantMinConf {
				t.Errorf("confidence = %.2f, want >= %.2f", r.Confidence, tt.wantMinConf)
			}
		})
	}
}

func TestClassifyGrouping(t *testing.T) {
	engine := NewEngine(0.0, testLogger())
	now := time.Now()

	// Multiple flows to the same destination should group into one result
	flows := []Flow{
		{ID: 1, SrcIP: "10.0.1.1", SrcPort: 40001, DstIP: "10.0.2.1", DstPort: 5432, Protocol: "tcp", BytesSent: 1024, BytesReceived: 2048, ProcessName: "java", CapturedAt: now},
		{ID: 2, SrcIP: "10.0.1.1", SrcPort: 40002, DstIP: "10.0.2.1", DstPort: 5432, Protocol: "tcp", BytesSent: 512, BytesReceived: 1024, ProcessName: "java", CapturedAt: now.Add(time.Second)},
		{ID: 3, SrcIP: "10.0.1.1", SrcPort: 40003, DstIP: "10.0.2.1", DstPort: 5432, Protocol: "tcp", BytesSent: 768, BytesReceived: 1536, ProcessName: "java", CapturedAt: now.Add(2 * time.Second)},
	}

	results := engine.Classify(context.Background(), flows)
	if len(results) != 1 {
		t.Fatalf("expected 1 result (grouped), got %d", len(results))
	}

	r := results[0]
	if r.FlowCount != 3 {
		t.Errorf("flow_count = %d, want 3", r.FlowCount)
	}
	if r.IntegrationType != "Database" {
		t.Errorf("type = %q, want Database", r.IntegrationType)
	}
	if len(r.FlowIDs) != 3 {
		t.Errorf("flow_ids count = %d, want 3", len(r.FlowIDs))
	}
}

func TestClassifyMultipleDestinations(t *testing.T) {
	engine := NewEngine(0.0, testLogger())
	now := time.Now()

	flows := []Flow{
		{ID: 1, SrcIP: "10.0.1.1", DstIP: "10.0.2.1", DstPort: 5432, Protocol: "tcp", BytesSent: 1024, BytesReceived: 512, CapturedAt: now},
		{ID: 2, SrcIP: "10.0.1.1", DstIP: "10.0.2.2", DstPort: 443, Protocol: "tcp", BytesSent: 2048, BytesReceived: 1024, CapturedAt: now},
		{ID: 3, SrcIP: "10.0.1.1", DstIP: "10.0.2.3", DstPort: 9092, Protocol: "tcp", BytesSent: 4096, BytesReceived: 0, CapturedAt: now},
	}

	results := engine.Classify(context.Background(), flows)
	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}

	types := map[string]bool{}
	for _, r := range results {
		types[r.IntegrationType] = true
	}

	for _, expected := range []string{"Database", "API", "Messaging"} {
		if !types[expected] {
			t.Errorf("missing classification type %q", expected)
		}
	}
}

func TestConfidenceModifiers(t *testing.T) {
	engine := NewEngine(0.0, testLogger())
	now := time.Now()

	// High port (>32768) should decrease confidence
	flows := []Flow{
		{ID: 1, SrcIP: "10.0.1.1", DstIP: "10.0.2.1", DstPort: 45000, Protocol: "tcp", BytesSent: 100, BytesReceived: 50, CapturedAt: now},
	}

	results := engine.Classify(context.Background(), flows)
	if len(results) != 1 {
		t.Fatal("expected 1 result")
	}
	// Custom (0.30) - 0.15 (high port) = 0.15
	if results[0].Confidence > 0.20 {
		t.Errorf("high port confidence = %.2f, want <= 0.20", results[0].Confidence)
	}
}

func TestDirectionDetection(t *testing.T) {
	tests := []struct {
		name      string
		sent      int64
		recv      int64
		wantDir   string
	}{
		{"outbound only", 1024, 0, "Outbound"},
		{"inbound only", 0, 1024, "Inbound"},
		{"bidirectional", 1024, 512, "Bidirectional"},
		{"heavily outbound", 10000, 100, "Outbound"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			group := &flowGroup{
				flows: []Flow{
					{BytesSent: tt.sent, BytesReceived: tt.recv},
				},
			}
			dir := determineDirection(group)
			if dir != tt.wantDir {
				t.Errorf("direction = %q, want %q", dir, tt.wantDir)
			}
		})
	}
}

func TestPatternDetection(t *testing.T) {
	now := time.Now()

	// Fire-and-Forget: no response
	group := &flowGroup{
		flows: []Flow{
			{BytesSent: 1024, BytesReceived: 0, CapturedAt: now},
			{BytesSent: 2048, BytesReceived: 0, CapturedAt: now.Add(time.Second)},
		},
		firstSeen: now,
		lastSeen:  now.Add(time.Second),
	}
	if p := determinePattern(group); p != "Fire-and-Forget" {
		t.Errorf("pattern = %q, want Fire-and-Forget", p)
	}

	// Request-Reply: normal bidirectional
	group2 := &flowGroup{
		flows: []Flow{
			{BytesSent: 1024, BytesReceived: 512, CapturedAt: now},
			{BytesSent: 2048, BytesReceived: 1024, CapturedAt: now.Add(time.Second)},
		},
		firstSeen: now,
		lastSeen:  now.Add(time.Second),
	}
	if p := determinePattern(group2); p != "Request-Reply" {
		t.Errorf("pattern = %q, want Request-Reply", p)
	}
}

func TestEmptyFlows(t *testing.T) {
	engine := NewEngine(0.8, testLogger())
	results := engine.Classify(context.Background(), nil)
	if results != nil {
		t.Errorf("expected nil results for empty input, got %d", len(results))
	}
}

func TestConfidenceThreshold(t *testing.T) {
	// With threshold 0.8, custom (0.30) flows should still be returned
	// (they're returned with low confidence for marking purposes)
	engine := NewEngine(0.8, testLogger())
	now := time.Now()

	flows := []Flow{
		{ID: 1, SrcIP: "10.0.1.1", DstIP: "10.0.2.1", DstPort: 5432, Protocol: "tcp", BytesSent: 1024, BytesReceived: 512, CapturedAt: now},
		{ID: 2, SrcIP: "10.0.1.1", DstIP: "10.0.2.2", DstPort: 55555, Protocol: "tcp", BytesSent: 100, BytesReceived: 50, CapturedAt: now},
	}

	results := engine.Classify(context.Background(), flows)
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
}
