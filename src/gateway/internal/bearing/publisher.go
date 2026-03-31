package bearing

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"time"

	"go.uber.org/zap"

	"github.com/blmuffley/Pathfinder/src/gateway/internal/store"
)

// Config holds Bearing integration configuration.
type Config struct {
	WebhookURL       string        `yaml:"webhook_url"`
	APIKey           string        `yaml:"api_key"`
	PushIntervalHrs  int           `yaml:"push_interval_hours"`
	InstanceID       string        `yaml:"instance_id"`
	SNInstanceURL    string        `yaml:"sn_instance_url"`
	ObservationWindow int          `yaml:"observation_window_hours"`
	Enabled          bool          `yaml:"enabled"`
}

// LoadConfigFromEnv creates a Config from environment variables.
func LoadConfigFromEnv() Config {
	return Config{
		WebhookURL:        envOr("BEARING_WEBHOOK_URL", ""),
		APIKey:            envOr("BEARING_API_KEY", ""),
		PushIntervalHrs:   envOrInt("BEARING_PUSH_INTERVAL_HOURS", 24),
		InstanceID:        envOr("PATHFINDER_INSTANCE_ID", "pf-default"),
		SNInstanceURL:     envOr("SERVICENOW_INSTANCE_URL", ""),
		ObservationWindow: envOrInt("BEARING_OBSERVATION_WINDOW_HOURS", 24),
		Enabled:           envOr("BEARING_WEBHOOK_URL", "") != "",
	}
}

// Publisher pushes confidence feed data to Bearing on a schedule.
type Publisher struct {
	config   Config
	store    *store.Store
	resolver *Resolver
	client   *http.Client
	logger   *zap.Logger
}

// NewPublisher creates a Bearing confidence feed publisher.
func NewPublisher(cfg Config, s *store.Store, resolver *Resolver, logger *zap.Logger) *Publisher {
	return &Publisher{
		config:   cfg,
		store:    s,
		resolver: resolver,
		client:   &http.Client{Timeout: 60 * time.Second},
		logger:   logger,
	}
}

// Run starts the scheduled push loop. Blocks until ctx is cancelled.
func (p *Publisher) Run(ctx context.Context) {
	if !p.config.Enabled || p.config.WebhookURL == "" {
		p.logger.Info("Bearing integration disabled (no BEARING_WEBHOOK_URL)")
		return
	}

	interval := time.Duration(p.config.PushIntervalHrs) * time.Hour
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	p.logger.Info("Bearing publisher started",
		zap.String("url", p.config.WebhookURL),
		zap.Int("interval_hours", p.config.PushIntervalHrs),
		zap.Int("observation_window_hours", p.config.ObservationWindow),
	)

	for {
		select {
		case <-ctx.Done():
			p.logger.Info("Bearing publisher stopped")
			return
		case <-ticker.C:
			if err := p.PushNow(ctx); err != nil {
				p.logger.Error("Bearing push failed", zap.Error(err))
			}
		}
	}
}

// PushNow builds and sends the confidence feed immediately.
func (p *Publisher) PushNow(ctx context.Context) error {
	p.logger.Info("building Bearing confidence feed")

	feed, err := p.BuildFeed(ctx)
	if err != nil {
		return fmt.Errorf("build feed: %w", err)
	}

	resp, err := p.Send(ctx, feed)
	if err != nil {
		return fmt.Errorf("send feed: %w", err)
	}

	p.logger.Info("Bearing feed pushed successfully",
		zap.Int("ci_records", len(feed.CIConfidenceRecords)),
		zap.Int("received", resp.Received),
		zap.Int("upserted", resp.Upserted),
	)

	return nil
}

// BuildFeed constructs the complete PathfinderConfidenceFeed from current data.
func (p *Publisher) BuildFeed(ctx context.Context) (*PathfinderConfidenceFeed, error) {
	// Get all classified integrations (for relationship confirmation context)
	_, err := p.store.GetUnsyncedIntegrations(ctx, 10000)
	if err != nil {
		p.logger.Debug("could not get integrations for Bearing feed context", zap.Error(err))
	}

	// Get all unclassified flows for traffic volume data
	flows, err := p.store.GetUnclassifiedFlows(ctx, 50000)
	if err != nil {
		p.logger.Warn("could not get flows for Bearing feed", zap.Error(err))
	}

	// Build per-IP traffic aggregation
	ipTraffic := make(map[string]*ipAggregation)
	for _, f := range flows {
		agg := getOrCreateAgg(ipTraffic, f.SrcIP)
		agg.totalBytesSent += f.BytesSent
		agg.flowCount++
		if f.CapturedAt.After(agg.lastSeen) {
			agg.lastSeen = f.CapturedAt
		}

		aggDst := getOrCreateAgg(ipTraffic, f.DstIP)
		aggDst.totalBytesRecv += f.BytesReceived
		aggDst.flowCount++
		aggDst.inboundPorts[f.DstPort]++
		if f.CapturedAt.After(aggDst.lastSeen) {
			aggDst.lastSeen = f.CapturedAt
		}

		// Track communication partners
		agg.partners[f.DstIP] = append(agg.partners[f.DstIP], partnerInfo{
			port: f.DstPort, protocol: f.Protocol, bytes: f.BytesSent + f.BytesReceived, lastSeen: f.CapturedAt,
		})
	}

	// Build CI confidence records
	records := make([]CIConfidenceRecord, 0, len(ipTraffic))
	subnets := make(map[string]bool)

	for ip, agg := range ipTraffic {
		ci := p.resolver.Resolve(ctx, ip)

		// Track subnets
		subnet := extractSubnet(ip)
		if subnet != "" {
			subnets[subnet] = ci.IsKnown
		}

		// Classify traffic state
		totalBytes := agg.totalBytesSent + agg.totalBytesRecv
		trafficState := ClassifyTrafficState(totalBytes, agg.flowCount, agg.lastSeen, p.config.ObservationWindow)

		// Confidence: known CIs with active traffic get high confidence
		confidence := 50
		if ci.IsKnown && trafficState == "active" {
			confidence = 90
		} else if ci.IsKnown && trafficState == "idle" {
			confidence = 60
		} else if !ci.IsKnown && trafficState == "active" {
			confidence = 70 // shadow IT but confirmed active
		} else if trafficState == "deprecated" {
			confidence = 30
		}

		// Build communication partners
		partners := make([]CommunicationPartner, 0)
		for partnerIP, infos := range agg.partners {
			partnerCI := p.resolver.Resolve(ctx, partnerIP)
			var latestSeen time.Time
			var totalPartnerBytes int64
			bestPort := 0
			bestProto := ""
			for _, info := range infos {
				totalPartnerBytes += info.bytes
				if info.lastSeen.After(latestSeen) {
					latestSeen = info.lastSeen
					bestPort = info.port
					bestProto = info.protocol
				}
			}
			partners = append(partners, CommunicationPartner{
				PartnerCISysID:       partnerCI.SysID,
				Protocol:             bestProto,
				Port:                 bestPort,
				LastSeen:             latestSeen.Format(time.RFC3339),
				TrafficVolumeBytes24h: totalPartnerBytes,
			})
		}

		// Behavioral classification
		var behavioral *BehavioralClassification
		if len(agg.inboundPorts) > 0 {
			behavioral = InferBehavioralClass(agg.inboundPorts)
		}

		record := CIConfidenceRecord{
			CISysID:               ci.SysID,
			CIClass:               ci.Class,
			ConfidenceScore:       confidence,
			TrafficState:          trafficState,
			LastObservation:       agg.lastSeen.Format(time.RFC3339),
			ObservationCount:      agg.flowCount,
			CommunicationPartners: partners,
			BehavioralClassification: behavioral,
		}

		records = append(records, record)
	}

	// Coverage summary
	var monitoredSubs, unmonitoredSubs []string
	for subnet, hasKnownCI := range subnets {
		if hasKnownCI {
			monitoredSubs = append(monitoredSubs, subnet)
		} else {
			unmonitoredSubs = append(unmonitoredSubs, subnet)
		}
	}

	active, idle, deprecated, unknown := 0, 0, 0, 0
	for _, r := range records {
		switch r.TrafficState {
		case "active":
			active++
		case "idle":
			idle++
		case "deprecated":
			deprecated++
		default:
			unknown++
		}
	}

	feed := &PathfinderConfidenceFeed{
		SchemaVersion:         "1.0",
		PathfinderInstanceID:  p.config.InstanceID,
		ServiceNowInstanceURL: p.config.SNInstanceURL,
		ObservationWindowHrs:  p.config.ObservationWindow,
		GeneratedAt:           time.Now().Format(time.RFC3339),
		CIConfidenceRecords:   records,
		CoverageSummary: CoverageSummary{
			TotalMonitoredHosts:        len(records),
			ActiveCIs:                  active,
			IdleCIs:                    idle,
			DeprecatedCIs:              deprecated,
			UnknownCIs:                 unknown,
			MonitoredSubnets:           monitoredSubs,
			UnmonitoredSubnetsDetected: unmonitoredSubs,
		},
	}

	return feed, nil
}

// Send posts the feed to Bearing's webhook endpoint.
func (p *Publisher) Send(ctx context.Context, feed *PathfinderConfidenceFeed) (*BearingResponse, error) {
	body, err := json.Marshal(feed)
	if err != nil {
		return nil, fmt.Errorf("marshal feed: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", p.config.WebhookURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Bearing-API-Key", p.config.APIKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send to Bearing: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Bearing returned %d: %s", resp.StatusCode, string(respBody)[:200])
	}

	var bearingResp BearingResponse
	if err := json.Unmarshal(respBody, &bearingResp); err != nil {
		return nil, fmt.Errorf("decode Bearing response: %w", err)
	}

	return &bearingResp, nil
}

// --- helpers ---

type ipAggregation struct {
	totalBytesSent int64
	totalBytesRecv int64
	flowCount      int
	lastSeen       time.Time
	inboundPorts   map[int]int                  // dstPort → flow count (for behavioral classification)
	partners       map[string][]partnerInfo      // partnerIP → partner details
}

type partnerInfo struct {
	port     int
	protocol string
	bytes    int64
	lastSeen time.Time
}

func getOrCreateAgg(m map[string]*ipAggregation, ip string) *ipAggregation {
	if agg, ok := m[ip]; ok {
		return agg
	}
	agg := &ipAggregation{
		inboundPorts: make(map[int]int),
		partners:     make(map[string][]partnerInfo),
	}
	m[ip] = agg
	return agg
}

func extractSubnet(ip string) string {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return ""
	}
	ipv4 := parsed.To4()
	if ipv4 == nil {
		return ""
	}
	// /24 subnet
	return fmt.Sprintf("%d.%d.%d.0/24", ipv4[0], ipv4[1], ipv4[2])
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envOrInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	var n int
	fmt.Sscanf(v, "%d", &n)
	if n == 0 {
		return fallback
	}
	return n
}
