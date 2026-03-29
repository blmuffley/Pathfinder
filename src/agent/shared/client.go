// Package shared provides a reusable gRPC client for all Pathfinder agents
// (Linux, Windows, K8s). Each agent platform uses this package for enrollment,
// flow streaming, and heartbeat — only the capture layer differs.
package shared

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/blmuffley/Pathfinder/src/proto"
)

// FlowRecord is a platform-agnostic network flow captured by any agent.
type FlowRecord struct {
	SrcIP         string
	SrcPort       uint16
	DstIP         string
	DstPort       uint16
	Protocol      string
	BytesSent     uint64
	BytesReceived uint64
	TimestampNs   int64
	ProcessName   string
	ProcessPID    uint32
}

// Client manages the gRPC connection to the Pathfinder Gateway.
type Client struct {
	conn     *grpc.ClientConn
	gateway  pb.PathfinderGatewayClient
	agentID  string
	hostname string
	osType   string
	logger   *zap.Logger
	stateDir string
}

// NewClient creates a gateway client and establishes the gRPC connection.
func NewClient(ctx context.Context, address string, useTLS bool, hostname, osType string, logger *zap.Logger) (*Client, error) {
	var opts []grpc.DialOption
	if !useTLS {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	}

	conn, err := grpc.NewClient(address, opts...)
	if err != nil {
		return nil, fmt.Errorf("connect to gateway %s: %w", address, err)
	}

	c := &Client{
		conn:     conn,
		gateway:  pb.NewPathfinderGatewayClient(conn),
		hostname: hostname,
		osType:   osType,
		logger:   logger,
		stateDir: defaultStateDir(),
	}

	c.agentID = c.loadAgentID()
	return c, nil
}

// Enroll registers this agent with the gateway.
func (c *Client) Enroll(ctx context.Context, token, version string) error {
	if c.agentID != "" {
		c.logger.Info("agent already enrolled", zap.String("agent_id", c.agentID))
		return nil
	}

	resp, err := c.gateway.Enroll(ctx, &pb.EnrollmentRequest{
		EnrollmentToken: token,
		Hostname:        c.hostname,
		OsType:          c.osType,
		AgentVersion:    version,
	})
	if err != nil {
		return fmt.Errorf("enroll: %w", err)
	}

	c.agentID = resp.AgentId
	c.saveAgentID(c.agentID)
	c.logger.Info("enrolled", zap.String("agent_id", c.agentID))
	return nil
}

// AgentID returns the enrolled agent ID.
func (c *Client) AgentID() string { return c.agentID }

// SendFlows streams a batch of flow records to the gateway.
func (c *Client) SendFlows(ctx context.Context, flows []FlowRecord) error {
	if len(flows) == 0 {
		return nil
	}

	stream, err := c.gateway.SendFlows(ctx)
	if err != nil {
		return fmt.Errorf("open flow stream: %w", err)
	}

	pbFlows := make([]*pb.FlowRecord, 0, len(flows))
	for _, f := range flows {
		pbFlows = append(pbFlows, &pb.FlowRecord{
			AgentId:       c.agentID,
			SrcIp:         f.SrcIP,
			SrcPort:       uint32(f.SrcPort),
			DstIp:         f.DstIP,
			DstPort:       uint32(f.DstPort),
			Protocol:      f.Protocol,
			BytesSent:     f.BytesSent,
			BytesReceived: f.BytesReceived,
			TimestampNs:   f.TimestampNs,
			ProcessName:   f.ProcessName,
			ProcessPid:    f.ProcessPID,
		})
	}

	if err := stream.Send(&pb.FlowBatch{Flows: pbFlows}); err != nil {
		return fmt.Errorf("send batch: %w", err)
	}

	ack, err := stream.CloseAndRecv()
	if err != nil {
		return fmt.Errorf("close stream: %w", err)
	}
	if !ack.Success {
		return fmt.Errorf("rejected: %s", ack.Message)
	}

	c.logger.Debug("sent flows", zap.Int("count", len(flows)))
	return nil
}

// Heartbeat sends a heartbeat to the gateway.
func (c *Client) Heartbeat(ctx context.Context, version string, uptimeSeconds int64) error {
	ack, err := c.gateway.Heartbeat(ctx, &pb.AgentHeartbeat{
		AgentId:       c.agentID,
		Hostname:      c.hostname,
		OsType:        c.osType,
		AgentVersion:  version,
		UptimeSeconds: uptimeSeconds,
		TimestampNs:   time.Now().UnixNano(),
	})
	if err != nil {
		return fmt.Errorf("heartbeat: %w", err)
	}
	if !ack.Success {
		return fmt.Errorf("heartbeat rejected: %s", ack.Message)
	}
	return nil
}

// RunHeartbeat sends periodic heartbeats. Blocks until ctx is cancelled.
func (c *Client) RunHeartbeat(ctx context.Context, interval time.Duration, version string) {
	start := time.Now()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := c.Heartbeat(ctx, version, int64(time.Since(start).Seconds())); err != nil {
				c.logger.Error("heartbeat failed", zap.Error(err))
			}
		}
	}
}

// Close shuts down the gRPC connection.
func (c *Client) Close() error { return c.conn.Close() }

// Hostname returns the system hostname.
func Hostname() string {
	h, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return h
}

func defaultStateDir() string {
	if runtime.GOOS == "windows" {
		return `C:\ProgramData\Pathfinder`
	}
	return "/var/lib/pathfinder"
}

func (c *Client) loadAgentID() string {
	data, err := os.ReadFile(filepath.Join(c.stateDir, "agent-id"))
	if err != nil {
		return ""
	}
	id := string(data)
	if id != "" {
		c.logger.Info("loaded persisted agent ID", zap.String("agent_id", id))
	}
	return id
}

func (c *Client) saveAgentID(id string) {
	if err := os.MkdirAll(c.stateDir, 0o755); err != nil {
		c.logger.Warn("failed to create state dir", zap.Error(err))
		return
	}
	if err := os.WriteFile(filepath.Join(c.stateDir, "agent-id"), []byte(id), 0o600); err != nil {
		c.logger.Warn("failed to save agent ID", zap.Error(err))
	}
}
