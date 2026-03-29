package main

import (
	"context"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"os/signal"
	"syscall"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/blmuffley/Pathfinder/src/proto"
)

var (
	gatewayAddr = flag.String("gateway", "localhost:8443", "gateway address")
	flowRate    = flag.Int("rate", 10, "flows per batch")
	interval    = flag.Duration("interval", 10*time.Second, "batch send interval")
	hostname    = flag.String("hostname", "mock-agent-01", "simulated hostname")
)

// Simulated source/destination pairs for realistic flow generation.
var simulatedApps = []struct {
	srcIP       string
	dstIP       string
	dstPort     uint32
	protocol    string
	processName string
}{
	{"10.0.1.10", "10.0.2.20", 5432, "tcp", "java"},          // App → PostgreSQL
	{"10.0.1.10", "10.0.2.30", 443, "tcp", "java"},           // App → HTTPS API
	{"10.0.1.10", "10.0.2.40", 9092, "tcp", "java"},          // App → Kafka
	{"10.0.1.10", "10.0.2.50", 6379, "tcp", "python3"},       // App → Redis
	{"10.0.1.10", "10.0.2.60", 5672, "tcp", "node"},          // App → RabbitMQ
	{"10.0.1.10", "10.0.3.10", 8080, "tcp", "nginx"},         // App → HTTP Service
	{"10.0.1.10", "10.0.3.20", 3306, "tcp", "python3"},       // App → MySQL
	{"10.0.1.10", "10.0.3.30", 389, "tcp", "httpd"},          // App → LDAP
	{"10.0.1.10", "10.0.3.40", 25, "tcp", "postfix"},         // App → SMTP
	{"10.0.1.10", "10.0.3.50", 22, "tcp", "sftp-server"},     // App → SFTP
	{"10.0.1.10", "10.0.4.10", 8443, "tcp", "envoy"},         // App → gRPC service
	{"10.0.1.10", "10.0.4.20", 27017, "tcp", "mongod"},       // App → MongoDB
	{"10.0.1.10", "10.0.4.30", 50051, "tcp", "python3"},      // App → Custom port
}

func main() {
	flag.Parse()
	fmt.Printf("Mock Agent starting → %s\n", *gatewayAddr)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		fmt.Println("\nShutting down...")
		cancel()
	}()

	// Connect to gateway
	conn, err := grpc.NewClient(*gatewayAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to connect: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close()

	client := pb.NewPathfinderGatewayClient(conn)

	// Enroll
	enrollResp, err := client.Enroll(ctx, &pb.EnrollmentRequest{
		EnrollmentToken: "dev-token",
		Hostname:        *hostname,
		OsType:          "linux",
		AgentVersion:    "0.1.0-mock",
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "enrollment failed: %v\n", err)
		os.Exit(1)
	}
	agentID := enrollResp.AgentId
	fmt.Printf("Enrolled: agent_id=%s\n", agentID)

	// Start heartbeat in background
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_, err := client.Heartbeat(ctx, &pb.AgentHeartbeat{
					AgentId:       agentID,
					Hostname:      *hostname,
					OsType:        "linux",
					AgentVersion:  "0.1.0-mock",
					UptimeSeconds: time.Now().Unix(),
					TimestampNs:   time.Now().UnixNano(),
				})
				if err != nil {
					fmt.Fprintf(os.Stderr, "heartbeat failed: %v\n", err)
				} else {
					fmt.Println("heartbeat sent")
				}
			}
		}
	}()

	// Stream flows
	ticker := time.NewTicker(*interval)
	defer ticker.Stop()

	batchNum := 0
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			batchNum++
			if err := sendFlowBatch(ctx, client, agentID, batchNum); err != nil {
				fmt.Fprintf(os.Stderr, "send flows failed: %v\n", err)
			}
		}
	}
}

func sendFlowBatch(ctx context.Context, client pb.PathfinderGatewayClient, agentID string, batchNum int) error {
	stream, err := client.SendFlows(ctx)
	if err != nil {
		return fmt.Errorf("open stream: %w", err)
	}

	flows := generateFlows(agentID, *flowRate)
	batch := &pb.FlowBatch{Flows: flows}

	if err := stream.Send(batch); err != nil {
		return fmt.Errorf("send batch: %w", err)
	}

	ack, err := stream.CloseAndRecv()
	if err != nil {
		return fmt.Errorf("close stream: %w", err)
	}

	fmt.Printf("batch %d: sent %d flows → %s\n", batchNum, len(flows), ack.Message)
	return nil
}

func generateFlows(agentID string, count int) []*pb.FlowRecord {
	flows := make([]*pb.FlowRecord, 0, count)
	now := time.Now()

	for i := 0; i < count; i++ {
		app := simulatedApps[rand.Intn(len(simulatedApps))]
		flows = append(flows, &pb.FlowRecord{
			AgentId:       agentID,
			SrcIp:         app.srcIP,
			SrcPort:       uint32(30000 + rand.Intn(35000)),
			DstIp:         app.dstIP,
			DstPort:       app.dstPort,
			Protocol:      app.protocol,
			BytesSent:     uint64(256 + rand.Intn(8192)),
			BytesReceived: uint64(128 + rand.Intn(4096)),
			TimestampNs:   now.Add(-time.Duration(rand.Intn(10000)) * time.Millisecond).UnixNano(),
			ProcessName:   app.processName,
			ProcessPid:    uint32(1000 + rand.Intn(50000)),
		})
	}
	return flows
}
