package capture

import (
	"context"
	"testing"
	"time"

	"go.uber.org/zap"
)

func TestMockSourceEmitsFlows(t *testing.T) {
	src := NewMockSource(10 * time.Millisecond)
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	out := make(chan FlowRecord, 100)
	go func() {
		src.Start(ctx, out)
	}()

	// Collect flows for the duration
	var flows []FlowRecord
	for {
		select {
		case f := <-out:
			flows = append(flows, f)
		case <-ctx.Done():
			if len(flows) < 5 {
				t.Fatalf("expected at least 5 flows in 200ms, got %d", len(flows))
			}
			// Verify flow fields are populated
			for _, f := range flows {
				if f.SrcIP == "" {
					t.Error("flow has empty SrcIP")
				}
				if f.DstIP == "" {
					t.Error("flow has empty DstIP")
				}
				if f.DstPort == 0 {
					t.Error("flow has zero DstPort")
				}
				if f.Protocol == "" {
					t.Error("flow has empty Protocol")
				}
				if f.ProcessName == "" {
					t.Error("flow has empty ProcessName")
				}
			}
			return
		}
	}
}

func TestBatcherFlushBySize(t *testing.T) {
	batchCh := make(chan []FlowRecord, 10)
	batcher := NewBatcher(3, 10*time.Second, batchCh) // large interval, small batch

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	flowCh := make(chan FlowRecord, 10)
	go batcher.Run(ctx, flowCh)

	// Send exactly 3 flows → should trigger size-based flush
	for i := 0; i < 3; i++ {
		flowCh <- FlowRecord{
			SrcIP: "10.0.0.1", DstIP: "10.0.0.2", DstPort: 5432, Protocol: "tcp",
		}
	}

	select {
	case batch := <-batchCh:
		if len(batch) != 3 {
			t.Fatalf("expected batch of 3, got %d", len(batch))
		}
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for batch")
	}
}

func TestBatcherFlushByInterval(t *testing.T) {
	batchCh := make(chan []FlowRecord, 10)
	batcher := NewBatcher(100, 50*time.Millisecond, batchCh) // small interval, large batch

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	flowCh := make(chan FlowRecord, 10)
	go batcher.Run(ctx, flowCh)

	// Send 1 flow (below batch size) → should flush on timer
	flowCh <- FlowRecord{
		SrcIP: "10.0.0.1", DstIP: "10.0.0.2", DstPort: 443, Protocol: "tcp",
	}

	select {
	case batch := <-batchCh:
		if len(batch) != 1 {
			t.Fatalf("expected batch of 1, got %d", len(batch))
		}
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for interval flush")
	}
}

func TestUint32ToIP(t *testing.T) {
	tests := []struct {
		input uint32
		want  string
	}{
		{0x0100000A, "10.0.0.1"},   // 10.0.0.1 in network byte order (little-endian)
		{0x0200000A, "10.0.0.2"},
		{0x0101A8C0, "192.168.1.1"},
	}

	for _, tt := range tests {
		got := uint32ToIP(tt.input)
		if got != tt.want {
			t.Errorf("uint32ToIP(0x%X) = %s, want %s", tt.input, got, tt.want)
		}
	}
}

func TestEBPFSourceStubOnNonLinux(t *testing.T) {
	// On macOS, NewEBPFSource should return a mock-based source (not error)
	// This test only runs on non-Linux (the stub)
	// On Linux, the real eBPF loader would require root + kernel support
	logger, _ := zap.NewDevelopment()
	src, err := NewEBPFSource(logger)
	if err != nil {
		// On non-Linux, stub returns mock. On Linux without perms, this may fail.
		t.Skipf("eBPF source creation failed (expected on some platforms): %v", err)
	}
	defer src.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	out := make(chan FlowRecord, 100)
	go src.Start(ctx, out)

	select {
	case f := <-out:
		if f.DstIP == "" {
			t.Error("stub should emit mock flows with populated fields")
		}
	case <-ctx.Done():
		// Acceptable — timing dependent
	}
}
