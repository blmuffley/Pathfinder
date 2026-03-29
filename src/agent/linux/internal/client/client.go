package client

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/blmuffley/Pathfinder/src/proto"
	"github.com/blmuffley/Pathfinder/src/agent/linux/internal/capture"
)

const stateDir = "/var/lib/pathfinder"
const stateFile = "agent-id"

// Client manages the gRPC connection to the Pathfinder Gateway.
type Client struct {
	conn     *grpc.ClientConn
	gateway  pb.PathfinderGatewayClient
	agentID  string
	hostname string
	logger   *zap.Logger
}

// New creates a new gateway client and establishes the gRPC connection.
func New(ctx context.Context, address string, useTLS bool, hostname string, logger *zap.Logger) (*Client, error) {
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
		logger:   logger,
	}

	// Try to load persisted agent ID
	c.agentID = c.loadAgentID()

	return c, nil
}

// Enroll registers this agent with the gateway. If already enrolled (persisted ID), re-enrolls.
func (c *Client) Enroll(ctx context.Context, enrollmentToken, agentVersion string) error {
	if c.agentID != "" {
		c.logger.Info("agent already enrolled", zap.String("agent_id", c.agentID))
		return nil
	}

	resp, err := c.gateway.Enroll(ctx, &pb.EnrollmentRequest{
		EnrollmentToken: enrollmentToken,
		Hostname:        c.hostname,
		OsType:          "linux",
		AgentVersion:    agentVersion,
	})
	if err != nil {
		return fmt.Errorf("enroll: %w", err)
	}

	c.agentID = resp.AgentId
	c.saveAgentID(c.agentID)

	c.logger.Info("enrolled with gateway",
		zap.String("agent_id", c.agentID),
	)
	return nil
}

// AgentID returns the enrolled agent ID.
func (c *Client) AgentID() string {
	return c.agentID
}

// SendFlows opens a streaming RPC and sends a batch of flow records.
func (c *Client) SendFlows(ctx context.Context, flows []capture.FlowRecord) error {
	if len(flows) == 0 {
		return nil
	}

	stream, err := c.gateway.SendFlows(ctx)
	if err != nil {
		return fmt.Errorf("open flow stream: %w", err)
	}

	// Convert to proto
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
		return fmt.Errorf("send flow batch: %w", err)
	}

	ack, err := stream.CloseAndRecv()
	if err != nil {
		return fmt.Errorf("close flow stream: %w", err)
	}

	if !ack.Success {
		return fmt.Errorf("gateway rejected flows: %s", ack.Message)
	}

	c.logger.Debug("sent flow batch",
		zap.Int("count", len(flows)),
		zap.String("ack", ack.Message),
	)
	return nil
}

// Heartbeat sends a heartbeat to the gateway.
func (c *Client) Heartbeat(ctx context.Context, agentVersion string, uptimeSeconds int64) error {
	ack, err := c.gateway.Heartbeat(ctx, &pb.AgentHeartbeat{
		AgentId:       c.agentID,
		Hostname:      c.hostname,
		OsType:        "linux",
		AgentVersion:  agentVersion,
		UptimeSeconds: uptimeSeconds,
		TimestampNs:   time.Now().UnixNano(),
	})
	if err != nil {
		return fmt.Errorf("heartbeat: %w", err)
	}

	if !ack.Success {
		return fmt.Errorf("heartbeat rejected: %s", ack.Message)
	}

	c.logger.Debug("heartbeat sent")
	return nil
}

// RunHeartbeat sends periodic heartbeats. Blocks until ctx is cancelled.
func (c *Client) RunHeartbeat(ctx context.Context, interval time.Duration, agentVersion string) {
	start := time.Now()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			uptime := int64(time.Since(start).Seconds())
			if err := c.Heartbeat(ctx, agentVersion, uptime); err != nil {
				c.logger.Error("heartbeat failed", zap.Error(err))
			}
		}
	}
}

// Close shuts down the gRPC connection.
func (c *Client) Close() error {
	return c.conn.Close()
}

// loadAgentID reads the persisted agent ID from disk.
func (c *Client) loadAgentID() string {
	path := filepath.Join(stateDir, stateFile)
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	id := string(data)
	if id != "" {
		c.logger.Info("loaded persisted agent ID", zap.String("agent_id", id))
	}
	return id
}

// saveAgentID persists the agent ID to disk so it survives restarts.
func (c *Client) saveAgentID(id string) {
	if err := os.MkdirAll(stateDir, 0o755); err != nil {
		c.logger.Warn("failed to create state dir", zap.Error(err))
		return
	}
	path := filepath.Join(stateDir, stateFile)
	if err := os.WriteFile(path, []byte(id), 0o600); err != nil {
		c.logger.Warn("failed to save agent ID", zap.Error(err))
	}
}
