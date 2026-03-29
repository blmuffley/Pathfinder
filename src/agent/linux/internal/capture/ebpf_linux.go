//go:build linux

package capture

import (
	"context"
	"encoding/binary"
	"fmt"
	"os"
	"unsafe"

	"github.com/cilium/ebpf"
	"github.com/cilium/ebpf/link"
	"github.com/cilium/ebpf/ringbuf"
	"go.uber.org/zap"
)

//go:generate go run github.com/cilium/ebpf/cmd/bpf2go -cc clang -cflags "-O2 -g -Wall" flowTracker ../../ebpf/flow_tracker.c -- -I../../ebpf

// flowEvent mirrors the C struct flow_event from flow_tracker.c.
type flowEvent struct {
	PID           uint32
	UID           uint32
	SrcIP         uint32
	DstIP         uint32
	SrcPort       uint16
	DstPort       uint16
	Protocol      uint8
	_             [3]byte
	BytesSent     uint64
	BytesReceived uint64
	TimestampNs   uint64
	DurationNs    uint64
	Comm          [16]byte
}

const flowEventSize = int(unsafe.Sizeof(flowEvent{}))

// EBPFSource captures flows using eBPF programs attached to kernel tracepoints.
type EBPFSource struct {
	objs   *flowTrackerObjects
	links  []link.Link
	reader *ringbuf.Reader
	logger *zap.Logger
}

// NewEBPFSource loads the eBPF program and attaches probes.
func NewEBPFSource(logger *zap.Logger) (*EBPFSource, error) {
	// Increase rlimit for eBPF maps
	// On kernels 5.11+, this is handled automatically by cilium/ebpf.

	objs := &flowTrackerObjects{}
	if err := loadFlowTrackerObjects(objs, &ebpf.CollectionOptions{}); err != nil {
		return nil, fmt.Errorf("load ebpf objects: %w", err)
	}

	src := &EBPFSource{
		objs:   objs,
		logger: logger,
	}

	// Attach tracepoint: tcp/tcp_connect
	l1, err := link.Tracepoint("tcp", "tcp_connect", objs.TraceTcpConnect, nil)
	if err != nil {
		objs.Close()
		return nil, fmt.Errorf("attach tcp_connect tracepoint: %w", err)
	}
	src.links = append(src.links, l1)

	// Attach tracepoint: sock/inet_sock_set_state
	l2, err := link.Tracepoint("sock", "inet_sock_set_state", objs.TraceInetSockSetState, nil)
	if err != nil {
		src.Close()
		return nil, fmt.Errorf("attach inet_sock_set_state tracepoint: %w", err)
	}
	src.links = append(src.links, l2)

	// Attach kprobe: udp_sendmsg
	l3, err := link.Kprobe("udp_sendmsg", objs.TraceUdpSendmsg, nil)
	if err != nil {
		// UDP kprobe is optional — some kernels don't export this symbol
		logger.Warn("failed to attach udp_sendmsg kprobe (UDP flows won't be captured)", zap.Error(err))
	} else {
		src.links = append(src.links, l3)
	}

	// Open ring buffer reader
	rd, err := ringbuf.NewReader(objs.Events)
	if err != nil {
		src.Close()
		return nil, fmt.Errorf("open ring buffer: %w", err)
	}
	src.reader = rd

	logger.Info("eBPF programs loaded and attached",
		zap.Int("tracepoints", len(src.links)),
	)

	return src, nil
}

// Start reads flow events from the eBPF ring buffer and sends them on out.
func (s *EBPFSource) Start(ctx context.Context, out chan<- FlowRecord) error {
	go func() {
		<-ctx.Done()
		s.reader.Close()
	}()

	for {
		record, err := s.reader.Read()
		if err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			return fmt.Errorf("read ring buffer: %w", err)
		}

		if len(record.RawSample) < flowEventSize {
			s.logger.Warn("short event", zap.Int("size", len(record.RawSample)))
			continue
		}

		evt := parseFlowEvent(record.RawSample)

		// Skip events with no destination (incomplete data)
		if evt.DstIP == 0 && evt.DstPort == 0 {
			continue
		}

		proto := "tcp"
		if evt.Protocol == 17 {
			proto = "udp"
		}

		flow := FlowRecord{
			SrcIP:         uint32ToIP(evt.SrcIP),
			SrcPort:       evt.SrcPort,
			DstIP:         uint32ToIP(evt.DstIP),
			DstPort:       evt.DstPort,
			Protocol:      proto,
			BytesSent:     evt.BytesSent,
			BytesReceived: evt.BytesReceived,
			TimestampNs:   int64(evt.TimestampNs),
			DurationNs:    int64(evt.DurationNs),
			ProcessName:   nullTerminated(evt.Comm[:]),
			ProcessPID:    evt.PID,
		}

		select {
		case out <- flow:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

// Close releases all eBPF resources.
func (s *EBPFSource) Close() error {
	if s.reader != nil {
		s.reader.Close()
	}
	for _, l := range s.links {
		l.Close()
	}
	if s.objs != nil {
		s.objs.Close()
	}
	return nil
}

func parseFlowEvent(data []byte) flowEvent {
	var evt flowEvent
	evt.PID = binary.LittleEndian.Uint32(data[0:4])
	evt.UID = binary.LittleEndian.Uint32(data[4:8])
	evt.SrcIP = binary.LittleEndian.Uint32(data[8:12])
	evt.DstIP = binary.LittleEndian.Uint32(data[12:16])
	evt.SrcPort = binary.LittleEndian.Uint16(data[16:18])
	evt.DstPort = binary.LittleEndian.Uint16(data[18:20])
	evt.Protocol = data[20]
	evt.BytesSent = binary.LittleEndian.Uint64(data[24:32])
	evt.BytesReceived = binary.LittleEndian.Uint64(data[32:40])
	evt.TimestampNs = binary.LittleEndian.Uint64(data[40:48])
	evt.DurationNs = binary.LittleEndian.Uint64(data[48:56])
	copy(evt.Comm[:], data[56:72])
	return evt
}

func nullTerminated(b []byte) string {
	for i, c := range b {
		if c == 0 {
			return string(b[:i])
		}
	}
	return string(b)
}

// Hostname returns the system hostname.
func Hostname() string {
	h, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return h
}
