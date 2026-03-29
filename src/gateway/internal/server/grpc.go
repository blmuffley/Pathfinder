package server

import (
	"context"
	"fmt"
	"io"
	"net"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"google.golang.org/grpc"

	pb "github.com/blmuffley/Pathfinder/src/proto"
	"github.com/blmuffley/Pathfinder/src/gateway/internal/classify"
	"github.com/blmuffley/Pathfinder/src/gateway/internal/store"
)

// GRPCServer implements the PathfinderGateway gRPC service.
type GRPCServer struct {
	pb.UnimplementedPathfinderGatewayServer
	store      *store.Store
	classifier *classify.Engine
	logger     *zap.Logger
}

// NewGRPCServer creates a new gRPC server with store and classifier dependencies.
func NewGRPCServer(s *store.Store, c *classify.Engine, logger *zap.Logger) *GRPCServer {
	return &GRPCServer{
		store:      s,
		classifier: c,
		logger:     logger,
	}
}

// Serve starts the gRPC server on the given port.
func (s *GRPCServer) Serve(port int) error {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return fmt.Errorf("listen on port %d: %w", port, err)
	}

	srv := grpc.NewServer()
	pb.RegisterPathfinderGatewayServer(srv, s)

	s.logger.Info("gRPC server listening", zap.Int("port", port))
	return srv.Serve(lis)
}

// Enroll handles agent enrollment requests.
func (s *GRPCServer) Enroll(ctx context.Context, req *pb.EnrollmentRequest) (*pb.EnrollmentResponse, error) {
	s.logger.Info("enrollment request",
		zap.String("hostname", req.Hostname),
		zap.String("os_type", req.OsType),
		zap.String("agent_version", req.AgentVersion),
	)

	// Generate a unique agent ID
	agentID := uuid.New().String()

	// Store the agent record
	if err := s.store.InsertAgent(ctx, agentID, req.Hostname, req.OsType, req.AgentVersion); err != nil {
		s.logger.Error("failed to insert agent", zap.Error(err))
		return nil, fmt.Errorf("insert agent: %w", err)
	}

	s.logger.Info("agent enrolled",
		zap.String("agent_id", agentID),
		zap.String("hostname", req.Hostname),
	)

	return &pb.EnrollmentResponse{
		AgentId: agentID,
	}, nil
}

// SendFlows handles streaming flow data from agents.
func (s *GRPCServer) SendFlows(stream grpc.ClientStreamingServer[pb.FlowBatch, pb.Ack]) error {
	var totalFlows int64

	for {
		batch, err := stream.Recv()
		if err == io.EOF {
			s.logger.Info("flow stream closed", zap.Int64("total_flows", totalFlows))
			return stream.SendAndClose(&pb.Ack{
				Success: true,
				Message: fmt.Sprintf("received %d flows", totalFlows),
			})
		}
		if err != nil {
			s.logger.Error("flow stream error", zap.Error(err))
			return err
		}

		// Convert proto flows to store rows
		rows := make([]store.FlowRow, 0, len(batch.Flows))
		for _, f := range batch.Flows {
			rows = append(rows, store.FlowRow{
				AgentID:       f.AgentId,
				SrcIP:         f.SrcIp,
				SrcPort:       int(f.SrcPort),
				DstIP:         f.DstIp,
				DstPort:       int(f.DstPort),
				Protocol:      f.Protocol,
				BytesSent:     int64(f.BytesSent),
				BytesReceived: int64(f.BytesReceived),
				ProcessName:   f.ProcessName,
				ProcessPID:    int(f.ProcessPid),
				CapturedAt:    time.Unix(0, f.TimestampNs),
			})
		}

		// Insert raw flows
		count, err := s.store.InsertFlows(stream.Context(), rows)
		if err != nil {
			s.logger.Error("failed to insert flows", zap.Error(err))
			return fmt.Errorf("insert flows: %w", err)
		}
		totalFlows += count

		s.logger.Debug("ingested flow batch",
			zap.Int("batch_size", len(batch.Flows)),
			zap.Int64("total_flows", totalFlows),
		)
	}
}

// Heartbeat handles agent heartbeat updates.
func (s *GRPCServer) Heartbeat(ctx context.Context, req *pb.AgentHeartbeat) (*pb.Ack, error) {
	exists, err := s.store.AgentExists(ctx, req.AgentId)
	if err != nil {
		s.logger.Error("heartbeat check failed", zap.Error(err))
		return nil, fmt.Errorf("check agent: %w", err)
	}
	if !exists {
		return &pb.Ack{
			Success: false,
			Message: "agent not enrolled",
		}, nil
	}

	if err := s.store.UpdateHeartbeat(ctx, req.AgentId); err != nil {
		s.logger.Error("heartbeat update failed", zap.Error(err))
		return nil, fmt.Errorf("update heartbeat: %w", err)
	}

	s.logger.Debug("heartbeat received",
		zap.String("agent_id", req.AgentId),
		zap.String("hostname", req.Hostname),
	)

	return &pb.Ack{
		Success: true,
		Message: "ok",
	}, nil
}
