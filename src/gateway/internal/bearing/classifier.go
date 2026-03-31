package bearing

import (
	"time"
)

// Traffic state thresholds
const (
	IdleThresholdBytes    = 1024       // < 1KB in window = idle (only ICMP/ARP-level)
	DeprecatedThresholdDays = 7        // No traffic for 7+ days = deprecated
)

// ClassifyTrafficState determines the traffic state for a CI based on
// observed flow data within the observation window.
//
// active     — meaningful traffic observed in current window
// idle       — CI is reachable but minimal/no application traffic
// deprecated — was active in previous windows, zero traffic for 7+ days
// unknown    — insufficient data to classify
func ClassifyTrafficState(
	totalBytes int64,
	flowCount int,
	lastObserved time.Time,
	windowHours int,
) string {
	now := time.Now()
	windowStart := now.Add(-time.Duration(windowHours) * time.Hour)

	// No observations at all
	if flowCount == 0 || lastObserved.IsZero() {
		return "unknown"
	}

	// Last observation older than window + deprecated threshold
	daysSinceLastSeen := now.Sub(lastObserved).Hours() / 24
	if daysSinceLastSeen > float64(DeprecatedThresholdDays) {
		return "deprecated"
	}

	// Observation within window but minimal traffic
	if lastObserved.After(windowStart) && totalBytes < IdleThresholdBytes {
		return "idle"
	}

	// Meaningful traffic in window
	if lastObserved.After(windowStart) && totalBytes >= IdleThresholdBytes {
		return "active"
	}

	// Last seen within deprecated threshold but outside current window
	if daysSinceLastSeen <= float64(DeprecatedThresholdDays) {
		return "idle"
	}

	return "unknown"
}

// BehavioralRule maps port patterns to ServiceNow CI class suggestions.
type BehavioralRule struct {
	Ports          []int
	SuggestedClass string
	Reasoning      string
	Confidence     int
	MinFlows       int // minimum inbound flows to trigger
}

// DefaultBehavioralRules maps common port patterns to CI classifications.
var DefaultBehavioralRules = []BehavioralRule{
	{
		Ports:          []int{80, 443, 8080, 8443},
		SuggestedClass: "cmdb_ci_app_server",
		Reasoning:      "Receiving HTTP/HTTPS traffic from multiple sources — likely a web/application server",
		Confidence:     80,
		MinFlows:       10,
	},
	{
		Ports:          []int{5432},
		SuggestedClass: "cmdb_ci_db_instance",
		Reasoning:      "Receiving PostgreSQL connections (port 5432) — database server",
		Confidence:     90,
		MinFlows:       5,
	},
	{
		Ports:          []int{3306},
		SuggestedClass: "cmdb_ci_db_instance",
		Reasoning:      "Receiving MySQL connections (port 3306) — database server",
		Confidence:     90,
		MinFlows:       5,
	},
	{
		Ports:          []int{1433},
		SuggestedClass: "cmdb_ci_db_instance",
		Reasoning:      "Receiving MSSQL connections (port 1433) — database server",
		Confidence:     90,
		MinFlows:       5,
	},
	{
		Ports:          []int{27017},
		SuggestedClass: "cmdb_ci_db_instance",
		Reasoning:      "Receiving MongoDB connections (port 27017) — database server",
		Confidence:     85,
		MinFlows:       5,
	},
	{
		Ports:          []int{6379},
		SuggestedClass: "cmdb_ci_db_instance",
		Reasoning:      "Receiving Redis connections (port 6379) — cache/database server",
		Confidence:     85,
		MinFlows:       5,
	},
	{
		Ports:          []int{9092},
		SuggestedClass: "cmdb_ci_app_server",
		Reasoning:      "Receiving Kafka connections (port 9092) — message broker",
		Confidence:     85,
		MinFlows:       5,
	},
	{
		Ports:          []int{5672},
		SuggestedClass: "cmdb_ci_app_server",
		Reasoning:      "Receiving RabbitMQ connections (port 5672) — message broker",
		Confidence:     85,
		MinFlows:       5,
	},
	{
		Ports:          []int{22},
		SuggestedClass: "cmdb_ci_linux_server",
		Reasoning:      "Only SSH traffic observed — likely a jump host or management server",
		Confidence:     60,
		MinFlows:       1,
	},
	{
		Ports:          []int{3389},
		SuggestedClass: "cmdb_ci_win_server",
		Reasoning:      "RDP traffic observed — Windows server",
		Confidence:     70,
		MinFlows:       1,
	},
	{
		Ports:          []int{389, 636},
		SuggestedClass: "cmdb_ci_app_server",
		Reasoning:      "Receiving LDAP/LDAPS connections — directory server",
		Confidence:     85,
		MinFlows:       5,
	},
	{
		Ports:          []int{25, 465, 587},
		SuggestedClass: "cmdb_ci_app_server",
		Reasoning:      "Receiving SMTP traffic — mail server",
		Confidence:     80,
		MinFlows:       3,
	},
}

// InferBehavioralClass analyzes inbound traffic patterns to suggest a CI class.
// inboundPorts maps destination port → flow count for traffic TO this CI.
func InferBehavioralClass(inboundPorts map[int]int) *BehavioralClassification {
	var bestMatch *BehavioralClassification
	bestConfidence := 0

	for _, rule := range DefaultBehavioralRules {
		for _, port := range rule.Ports {
			if count, ok := inboundPorts[port]; ok && count >= rule.MinFlows {
				if rule.Confidence > bestConfidence {
					bestConfidence = rule.Confidence
					bestMatch = &BehavioralClassification{
						SuggestedClass:           rule.SuggestedClass,
						ClassificationConfidence: rule.Confidence,
						Reasoning:                rule.Reasoning,
					}
				}
			}
		}
	}

	return bestMatch
}
