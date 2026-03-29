package client

import (
	"context"
	"fmt"
	"net"
	"testing"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/blmuffley/Pathfinder/src/proto"
	"github.com/blmuffley/Pathfinder/src/agent/linux/internal/capture"
)

// mockGatewayServer implements PathfinderGatewayServer for testing.
type mockGatewayServer struct {
	pb.UnimplementedPathfinderGatewayServer
	enrollCount    int
	heartbeatCount int
	flowCount      int
}

func (m *mockGatewayServer) Enroll(_ context.Context, req *pb.EnrollmentRequest) (*pb.EnrollmentResponse, error) {
	m.enrollCount++
	return &pb.EnrollmentResponse{
		AgentId: fmt.Sprintf("test-agent-%d", m.enrollCount),
	}, nil
}

func (m *mockGatewayServer) Heartbeat(_ context.Context, req *pb.AgentHeartbeat) (*pb.Ack, error) {
	m.heartbeatCount++
	return &pb.Ack{Success: true, Message: "ok"}, nil
}

func (m *mockGatewayServer) SendFlows(stream grpc.ClientStreamingServer[pb.FlowBatch, pb.Ack]) error {
	for {
		batch, err := stream.Recv()
		if err != nil {
			break
		}
		m.flowCount += len(batch.Flows)
	}
	return stream.SendAndClose(&pb.Ack{
		Success: true,
		Message: fmt.Sprintf("received %d flows", m.flowCount),
	})
}

func startMockServer(t *testing.T) (string, *mockGatewayServer) {
	t.Helper()
	lis, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}

	srv := grpc.NewServer()
	mock := &mockGatewayServer{}
	pb.RegisterPathfinderGatewayServer(srv, mock)

	go srv.Serve(lis)
	t.Cleanup(func() { srv.Stop() })

	return lis.Addr().String(), mock
}

func TestEnrollAndHeartbeat(t *testing.T) {
	addr, mock := startMockServer(t)
	logger, _ := zap.NewDevelopment()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	c, err := New(ctx, addr, false, "test-host", logger)
	if err != nil {
		t.Fatalf("new client: %v", err)
	}
	defer c.Close()

	// Force fresh enrollment (no persisted ID)
	c.agentID = ""

	if err := c.Enroll(ctx, "test-token", "0.1.0"); err != nil {
		t.Fatalf("enroll: %v", err)
	}

	if c.AgentID() == "" {
		t.Fatal("expected non-empty agent ID after enrollment")
	}
	if mock.enrollCount != 1 {
		t.Errorf("enroll count = %d, want 1", mock.enrollCount)
	}

	// Heartbeat
	if err := c.Heartbeat(ctx, "0.1.0", 60); err != nil {
		t.Fatalf("heartbeat: %v", err)
	}
	if mock.heartbeatCount != 1 {
		t.Errorf("heartbeat count = %d, want 1", mock.heartbeatCount)
	}
}

func TestSendFlows(t *testing.T) {
	addr, mock := startMockServer(t)
	logger, _ := zap.NewDevelopment()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	c, err := New(ctx, addr, false, "test-host", logger)
	if err != nil {
		t.Fatalf("new client: %v", err)
	}
	defer c.Close()

	c.agentID = "test-agent-1"

	flows := []capture.FlowRecord{
		{SrcIP: "10.0.0.1", SrcPort: 40000, DstIP: "10.0.0.2", DstPort: 5432, Protocol: "tcp", BytesSent: 1024, BytesReceived: 512, TimestampNs: time.Now().UnixNano(), ProcessName: "java", ProcessPID: 1234},
		{SrcIP: "10.0.0.1", SrcPort: 40001, DstIP: "10.0.0.3", DstPort: 443, Protocol: "tcp", BytesSent: 2048, BytesReceived: 1024, TimestampNs: time.Now().UnixNano(), ProcessName: "nginx", ProcessPID: 5678},
	}

	if err := c.SendFlows(ctx, flows); err != nil {
		t.Fatalf("send flows: %v", err)
	}

	if mock.flowCount != 2 {
		t.Errorf("flow count = %d, want 2", mock.flowCount)
	}
}

func TestSkipEnrollWhenAlreadyEnrolled(t *testing.T) {
	addr, mock := startMockServer(t)
	logger, _ := zap.NewDevelopment()

	ctx := context.Background()
	c, err := New(ctx, addr, false, "test-host", logger)
	if err != nil {
		t.Fatalf("new client: %v", err)
	}
	defer c.Close()

	// Pre-set agent ID (simulates persisted state)
	c.agentID = "already-enrolled-id"

	if err := c.Enroll(ctx, "token", "0.1.0"); err != nil {
		t.Fatalf("enroll: %v", err)
	}

	// Should NOT have called the server
	if mock.enrollCount != 0 {
		t.Errorf("expected no enrollment RPC when already enrolled, got %d", mock.enrollCount)
	}
}

func TestSendEmptyFlows(t *testing.T) {
	logger, _ := zap.NewDevelopment()

	// No server needed — empty flows should be a no-op
	c := &Client{
		agentID: "test",
		logger:  logger,
	}

	if err := c.SendFlows(context.Background(), nil); err != nil {
		t.Fatalf("send empty flows: %v", err)
	}
}

// Reference to suppress import warning
var _ = insecure.NewCredentials
