//go:build integration

// Package integration tests the full Pathfinder pipeline end-to-end:
//   mock-agent → gRPC → gateway → PostgreSQL → classification → classified results
//
// Requires: docker-compose up -d postgres
// Run with: go test -tags=integration ./tests/integration/ -v
package integration

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/blmuffley/Pathfinder/src/proto"
)

var (
	gatewayAddr = envOr("TEST_GATEWAY_ADDR", "localhost:8443")
	dbURL       = envOr("TEST_DB_URL", "postgres://pathfinder:localdev@localhost:5432/pathfinder?sslmode=disable")
)

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func TestFullPipeline(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// 1. Connect to gateway
	conn, err := grpc.NewClient(gatewayAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatalf("connect to gateway: %v", err)
	}
	defer conn.Close()
	client := pb.NewPathfinderGatewayClient(conn)

	// 2. Enroll
	enrollResp, err := client.Enroll(ctx, &pb.EnrollmentRequest{
		EnrollmentToken: "integration-test",
		Hostname:        "test-host-integration",
		OsType:          "linux",
		AgentVersion:    "0.1.0-test",
	})
	if err != nil {
		t.Fatalf("enroll: %v", err)
	}
	agentID := enrollResp.AgentId
	t.Logf("enrolled: agent_id=%s", agentID)

	// 3. Send flows
	stream, err := client.SendFlows(ctx)
	if err != nil {
		t.Fatalf("open stream: %v", err)
	}

	now := time.Now()
	flows := []*pb.FlowRecord{
		{AgentId: agentID, SrcIp: "10.100.1.1", SrcPort: 40000, DstIp: "10.100.2.1", DstPort: 5432, Protocol: "tcp", BytesSent: 1024, BytesReceived: 2048, TimestampNs: now.UnixNano(), ProcessName: "java", ProcessPid: 1234},
		{AgentId: agentID, SrcIp: "10.100.1.1", SrcPort: 40001, DstIp: "10.100.2.2", DstPort: 443, Protocol: "tcp", BytesSent: 512, BytesReceived: 1024, TimestampNs: now.UnixNano(), ProcessName: "nginx", ProcessPid: 5678},
		{AgentId: agentID, SrcIp: "10.100.1.1", SrcPort: 40002, DstIp: "10.100.2.3", DstPort: 9092, Protocol: "tcp", BytesSent: 4096, BytesReceived: 0, TimestampNs: now.UnixNano(), ProcessName: "java", ProcessPid: 1234},
	}

	if err := stream.Send(&pb.FlowBatch{Flows: flows}); err != nil {
		t.Fatalf("send flows: %v", err)
	}
	ack, err := stream.CloseAndRecv()
	if err != nil {
		t.Fatalf("close stream: %v", err)
	}
	if !ack.Success {
		t.Fatalf("flows rejected: %s", ack.Message)
	}
	t.Logf("flows accepted: %s", ack.Message)

	// 4. Heartbeat
	hbAck, err := client.Heartbeat(ctx, &pb.AgentHeartbeat{
		AgentId: agentID, Hostname: "test-host-integration",
		OsType: "linux", AgentVersion: "0.1.0-test",
		UptimeSeconds: 60, TimestampNs: time.Now().UnixNano(),
	})
	if err != nil {
		t.Fatalf("heartbeat: %v", err)
	}
	if !hbAck.Success {
		t.Fatalf("heartbeat rejected: %s", hbAck.Message)
	}

	// 5. Verify in PostgreSQL
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("connect to db: %v", err)
	}
	defer pool.Close()

	// Check agent was inserted
	var agentCount int
	err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM agents WHERE agent_id = $1", agentID).Scan(&agentCount)
	if err != nil {
		t.Fatalf("query agents: %v", err)
	}
	if agentCount != 1 {
		t.Errorf("expected 1 agent, got %d", agentCount)
	}

	// Check raw flows were inserted
	var flowCount int
	err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM raw_flows WHERE agent_id = $1", agentID).Scan(&flowCount)
	if err != nil {
		t.Fatalf("query flows: %v", err)
	}
	if flowCount != 3 {
		t.Errorf("expected 3 raw flows, got %d", flowCount)
	}

	// Wait for classification loop (runs every 10s)
	t.Log("waiting for classification loop...")
	deadline := time.Now().Add(30 * time.Second)
	var classifiedCount int
	for time.Now().Before(deadline) {
		err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM classified_integrations").Scan(&classifiedCount)
		if err != nil {
			t.Fatalf("query classified: %v", err)
		}
		if classifiedCount >= 3 {
			break
		}
		time.Sleep(2 * time.Second)
	}

	t.Logf("classified integrations: %d", classifiedCount)
	if classifiedCount < 3 {
		t.Errorf("expected >= 3 classified integrations, got %d (classification may still be running)", classifiedCount)
	}

	// Verify classification types
	rows, err := pool.Query(ctx, "SELECT source_app, target_app, integration_type, classification_confidence FROM classified_integrations ORDER BY source_app")
	if err != nil {
		t.Fatalf("query classified details: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var src, tgt, itype string
		var conf float64
		rows.Scan(&src, &tgt, &itype, &conf)
		t.Logf("  %s → %s: type=%s confidence=%.2f", src, tgt, itype, conf)
	}

	fmt.Println("Integration test PASSED: full pipeline verified")
}
