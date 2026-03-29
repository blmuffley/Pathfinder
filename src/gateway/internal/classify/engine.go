package classify

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.uber.org/zap"
)

// Result holds the classification outcome for a group of flows.
type Result struct {
	SourceApp       string
	TargetApp       string
	IntegrationType string
	Confidence      float64
	Protocol        string
	Port            int
	Direction       string
	Pattern         string
	ProcessName     string
	AvgBytes        int64
	FlowCount       int64
	FirstSeen       time.Time
	LastSeen        time.Time
	FlowIDs         []int64
}

// Flow represents a raw flow record for classification.
type Flow struct {
	ID            int64
	AgentID       string
	SrcIP         string
	SrcPort       int
	DstIP         string
	DstPort       int
	Protocol      string
	BytesSent     int64
	BytesReceived int64
	ProcessName   string
	CapturedAt    time.Time
}

// Engine is the classification engine that groups flows and assigns integration types.
type Engine struct {
	confidenceThreshold float64
	logger              *zap.Logger
}

// NewEngine creates a classification engine.
func NewEngine(confidenceThreshold float64, logger *zap.Logger) *Engine {
	return &Engine{
		confidenceThreshold: confidenceThreshold,
		logger:              logger,
	}
}

// interfaceKey uniquely identifies an interface within an integration.
type interfaceKey struct {
	srcIP     string
	dstIP     string
	dstPort   int
	protocol  string
}

// flowGroup aggregates flows for a single interface.
type flowGroup struct {
	flows       []Flow
	totalBytes  int64
	firstSeen   time.Time
	lastSeen    time.Time
}

// Classify takes a batch of raw flows and produces classified integration/interface results.
func (e *Engine) Classify(_ context.Context, flows []Flow) []Result {
	if len(flows) == 0 {
		return nil
	}

	// Step 1: Group flows by (srcIP, dstIP, dstPort, protocol)
	groups := make(map[interfaceKey]*flowGroup)
	for _, f := range flows {
		key := interfaceKey{
			srcIP:    f.SrcIP,
			dstIP:    f.DstIP,
			dstPort:  f.DstPort,
			protocol: strings.ToLower(f.Protocol),
		}
		g, ok := groups[key]
		if !ok {
			g = &flowGroup{firstSeen: f.CapturedAt, lastSeen: f.CapturedAt}
			groups[key] = g
		}
		g.flows = append(g.flows, f)
		g.totalBytes += f.BytesSent + f.BytesReceived
		if f.CapturedAt.Before(g.firstSeen) {
			g.firstSeen = f.CapturedAt
		}
		if f.CapturedAt.After(g.lastSeen) {
			g.lastSeen = f.CapturedAt
		}
	}

	// Step 2: Classify each group
	var results []Result
	for key, group := range groups {
		result := e.classifyGroup(key, group)
		if result.Confidence >= e.confidenceThreshold {
			results = append(results, result)
		} else {
			e.logger.Debug("flow group below confidence threshold",
				zap.String("src", key.srcIP),
				zap.String("dst", key.dstIP),
				zap.Int("port", key.dstPort),
				zap.Float64("confidence", result.Confidence),
			)
			// Still return low-confidence results so flow IDs get marked
			results = append(results, result)
		}
	}

	return results
}

func (e *Engine) classifyGroup(key interfaceKey, group *flowGroup) Result {
	// Collect flow IDs and determine dominant process name
	flowIDs := make([]int64, 0, len(group.flows))
	processCount := make(map[string]int)
	for _, f := range group.flows {
		flowIDs = append(flowIDs, f.ID)
		if f.ProcessName != "" {
			processCount[f.ProcessName]++
		}
	}

	dominantProcess := ""
	maxCount := 0
	for p, c := range processCount {
		if c > maxCount {
			dominantProcess = p
			maxCount = c
		}
	}

	// Apply classification rules in priority order
	intType, confidence := e.applyRules(uint32(key.dstPort), key.protocol, dominantProcess)

	// Apply confidence modifiers
	confidence = e.applyModifiers(confidence, group, key.dstPort, dominantProcess, intType)

	// Determine direction based on byte patterns
	direction := determineDirection(group)

	// Determine communication pattern
	pattern := determinePattern(group)

	avgBytes := int64(0)
	if len(group.flows) > 0 {
		avgBytes = group.totalBytes / int64(len(group.flows))
	}

	return Result{
		SourceApp:       resolveApp(key.srcIP, dominantProcess),
		TargetApp:       resolveApp(key.dstIP, ""),
		IntegrationType: intType,
		Confidence:      confidence,
		Protocol:        key.protocol,
		Port:            key.dstPort,
		Direction:       direction,
		Pattern:         pattern,
		ProcessName:     dominantProcess,
		AvgBytes:        avgBytes,
		FlowCount:       int64(len(group.flows)),
		FirstSeen:       group.firstSeen,
		LastSeen:        group.lastSeen,
		FlowIDs:         flowIDs,
	}
}

// applyRules applies classification rules in priority order.
func (e *Engine) applyRules(dstPort uint32, protocol, processName string) (string, float64) {
	// Priority 1: Exact port match
	if rule, ok := portRules[dstPort]; ok {
		// Special case: port 22 — check process name for SFTP vs SSH
		if dstPort == 22 && processName != "" {
			lowerProc := strings.ToLower(processName)
			if strings.Contains(lowerProc, "sftp") {
				return "File Transfer", 0.90
			}
		}
		return rule.IntegrationType, rule.Confidence
	}

	// Priority 3: Process name match
	if processName != "" {
		lowerProc := strings.ToLower(processName)
		if rule, ok := processNameRules[lowerProc]; ok {
			return rule.IntegrationType, rule.Confidence
		}
	}

	// Priority 5: Default — Custom
	return "Custom", 0.30

	// Note: Priority 2 (port-range) and Priority 4 (protocol heuristic)
	// are planned for Phase 2 when DPI capabilities are added.
}

// applyModifiers adjusts confidence based on flow characteristics.
func (e *Engine) applyModifiers(baseConfidence float64, group *flowGroup, dstPort int, processName, intType string) float64 {
	confidence := baseConfidence

	// Flow count > 100 → +0.05
	if len(group.flows) > 100 {
		confidence += 0.05
	}

	// Consistent over 7+ days → +0.05
	duration := group.lastSeen.Sub(group.firstSeen)
	if duration >= 7*24*time.Hour {
		confidence += 0.05
	}

	// Process name confirms port classification → +0.10
	if processName != "" {
		if rule, ok := portRules[uint32(dstPort)]; ok {
			if procRule, ok2 := processNameRules[strings.ToLower(processName)]; ok2 {
				if rule.IntegrationType == procRule.IntegrationType {
					confidence += 0.10
				}
			}
		}
	}

	// Ephemeral/high port (>32768) → -0.15
	if dstPort > 32768 {
		confidence -= 0.15
	}

	// Clamp to [0.0, 1.0]
	if confidence > 1.0 {
		confidence = 1.0
	}
	if confidence < 0.0 {
		confidence = 0.0
	}

	return confidence
}

// determineDirection infers flow direction from byte patterns.
func determineDirection(group *flowGroup) string {
	var totalSent, totalRecv int64
	for _, f := range group.flows {
		totalSent += f.BytesSent
		totalRecv += f.BytesReceived
	}

	if totalRecv == 0 && totalSent > 0 {
		return "Outbound"
	}
	if totalSent == 0 && totalRecv > 0 {
		return "Inbound"
	}

	// Check symmetry ratio
	ratio := float64(0)
	if totalSent > totalRecv {
		ratio = float64(totalRecv) / float64(totalSent)
	} else if totalRecv > 0 {
		ratio = float64(totalSent) / float64(totalRecv)
	}

	if ratio > 0.3 {
		return "Bidirectional"
	}
	if totalSent > totalRecv {
		return "Outbound"
	}
	return "Inbound"
}

// determinePattern infers the communication pattern from flow behavior.
func determinePattern(group *flowGroup) string {
	if len(group.flows) < 2 {
		return "Request-Reply"
	}

	var totalSent, totalRecv int64
	for _, f := range group.flows {
		totalSent += f.BytesSent
		totalRecv += f.BytesReceived
	}

	// Fire-and-Forget: no response data
	if totalRecv == 0 {
		return "Fire-and-Forget"
	}

	// Check for streaming: long-lived with continuous small payloads
	duration := group.lastSeen.Sub(group.firstSeen)
	avgBytes := (totalSent + totalRecv) / int64(len(group.flows))
	if duration > 5*time.Minute && avgBytes < 1024 && len(group.flows) > 10 {
		return "Streaming"
	}

	// Check for batch: regular intervals with large payloads
	if avgBytes > 10240 && len(group.flows) < 20 {
		return "Batch"
	}

	return "Request-Reply"
}

// resolveApp maps an IP + process name to an application identifier.
// In Phase 1, this uses a simple hostname/IP-based resolution.
// Phase 3 will add CMDB lookups.
func resolveApp(ip, processName string) string {
	if processName != "" {
		return fmt.Sprintf("%s@%s", processName, ip)
	}
	return ip
}
