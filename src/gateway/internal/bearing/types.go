// Package bearing integrates Pathfinder with Avennorth Bearing.
// Publishes CI confidence data, traffic state, behavioral classification,
// and relationship confirmations so Bearing can produce fusion findings.
package bearing

// PathfinderConfidenceFeed is the payload Bearing expects at
// POST {BEARING_URL}/api/webhooks/pathfinder
type PathfinderConfidenceFeed struct {
	SchemaVersion        string                `json:"schema_version"`
	PathfinderInstanceID string                `json:"pathfinder_instance_id"`
	ServiceNowInstanceURL string              `json:"servicenow_instance_url"`
	ObservationWindowHrs int                   `json:"observation_window_hours"`
	GeneratedAt          string                `json:"generated_at"`
	CIConfidenceRecords  []CIConfidenceRecord  `json:"ci_confidence_records"`
	CoverageSummary      CoverageSummary       `json:"coverage_summary"`
}

// CIConfidenceRecord represents confidence data for a single CI.
type CIConfidenceRecord struct {
	CISysID                 string                    `json:"ci_sys_id"`
	CIClass                 string                    `json:"ci_class"`
	ConfidenceScore         int                       `json:"confidence_score"`
	TrafficState            string                    `json:"traffic_state"` // active, idle, deprecated, unknown
	LastObservation         string                    `json:"last_observation"`
	ObservationCount        int                       `json:"observation_count"`
	CommunicationPartners   []CommunicationPartner    `json:"communication_partners"`
	RelationshipConfirmations []RelationshipConfirmation `json:"relationship_confirmations"`
	BehavioralClassification *BehavioralClassification `json:"behavioral_classification,omitempty"`
}

// CommunicationPartner is a peer CI observed in traffic.
type CommunicationPartner struct {
	PartnerCISysID       string `json:"partner_ci_sys_id"`
	Protocol             string `json:"protocol"`
	Port                 int    `json:"port"`
	LastSeen             string `json:"last_seen"`
	TrafficVolumeBytes24h int64  `json:"traffic_volume_bytes_24h"`
}

// RelationshipConfirmation indicates whether a CMDB relationship is backed by observed traffic.
type RelationshipConfirmation struct {
	RelCISysID    string `json:"rel_ci_sys_id"`
	ParentCISysID string `json:"parent_ci_sys_id"`
	ChildCISysID  string `json:"child_ci_sys_id"`
	RelType       string `json:"rel_type"`
	Confirmed     bool   `json:"confirmed"`
	Confidence    int    `json:"confidence"`
}

// BehavioralClassification is Pathfinder's inference of what a CI does.
type BehavioralClassification struct {
	SuggestedClass           string `json:"suggested_class"`
	ClassificationConfidence int    `json:"classification_confidence"`
	Reasoning                string `json:"reasoning"`
}

// CoverageSummary aggregates monitoring state across the estate.
type CoverageSummary struct {
	TotalMonitoredHosts       int      `json:"total_monitored_hosts"`
	ActiveCIs                 int      `json:"active_cis"`
	IdleCIs                   int      `json:"idle_cis"`
	DeprecatedCIs             int      `json:"deprecated_cis"`
	UnknownCIs                int      `json:"unknown_cis"`
	MonitoredSubnets          []string `json:"monitored_subnets"`
	UnmonitoredSubnetsDetected []string `json:"unmonitored_subnets_detected"`
}

// BearingResponse is what Bearing returns on success.
type BearingResponse struct {
	Received int `json:"received"`
	Upserted int `json:"upserted"`
}
