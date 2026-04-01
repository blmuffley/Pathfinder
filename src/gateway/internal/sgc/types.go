// Package sgc implements the Service Graph Connector publisher for Pathfinder.
// It publishes discovered CIs to ServiceNow via the Identification and
// Reconciliation Engine (IRE) API, enabling CMDB population from observed
// network traffic.
package sgc

import (
	"fmt"
	"strings"
	"time"
)

// IREPayload is the top-level request body for POST /api/now/identifyreconcile.
type IREPayload struct {
	Items     []IREItem     `json:"items"`
	Relations []IRERelation `json:"relations,omitempty"`
}

// IREItem represents a single CI to create or update via the IRE.
type IREItem struct {
	ClassName string            `json:"className"`
	Values    map[string]string `json:"values"`
	Lookup    []IRELookup       `json:"lookup"`
}

// IRELookup specifies a column-value pair used by IRE to match existing CIs.
type IRELookup struct {
	Column string `json:"column"`
	Value  string `json:"value"`
}

// IRERelation defines a relationship between two CIs for the IRE.
type IRERelation struct {
	Parent IRERelRef         `json:"parent"`
	Child  IRERelRef         `json:"child"`
	Type   string            `json:"type"`
	Values map[string]string `json:"values,omitempty"`
}

// IRERelRef identifies one end of a CI relationship by class and lookup keys.
type IRERelRef struct {
	ClassName string      `json:"className"`
	Lookup    []IRELookup `json:"lookup"`
}

// IREResponse is the response body from POST /api/now/identifyreconcile.
type IREResponse struct {
	Result IREResult `json:"result"`
}

// IREResult wraps the array of per-item results from the IRE.
type IREResult struct {
	Items []IREResultItem `json:"items"`
}

// IREResultItem describes the outcome for a single CI submitted to the IRE.
type IREResultItem struct {
	SysID     string `json:"sysId"`
	ClassName string `json:"className"`
	Operation string `json:"operation"` // "INSERT", "UPDATE", "NO_CHANGE", "SKIPPED"
	Error     string `json:"error,omitempty"`
}

// --- Source record types (read from PostgreSQL) ---

// AgentRecord represents a Pathfinder agent / server discovered via enrollment.
type AgentRecord struct {
	ID            string
	AgentID       string
	Hostname      string
	OSType        string // "linux", "windows"
	IPAddress     string
	AgentVersion  string
	SerialNumber  string
	CPUCount      int
	RAMMb         int
	LastHeartbeat time.Time
	SyncedToSGC   bool
	SGCSysID      string
}

// AppRecord represents an application instance discovered from process/port data.
type AppRecord struct {
	ID           string
	Name         string
	Version      string
	Vendor       string
	HostSysID    string // cmdb_ci_server sys_id this app runs on
	ListenPort   int
	Protocol     string
	ProcessName  string
	InstallPath  string
	DiscoveredAt time.Time
	LastObserved time.Time
	SyncedToSGC  bool
	SGCSysID     string
}

// IntegrationRecord represents a classified integration between two applications.
type IntegrationRecord struct {
	ID              string
	SourceApp       string // sys_id or name of source application
	TargetApp       string // sys_id or name of target application
	IntegrationType string // "API", "Database", "Messaging", "Email", "File"
	Protocol        string
	Port            int
	Confidence      float64
	FirstSeen       time.Time
	LastSeen        time.Time
	FlowCount       int64
	SyncedToSGC     bool
	SGCSysID        string
}

// CloudServiceRecord represents a discovered cloud service endpoint.
type CloudServiceRecord struct {
	ID           string
	Name         string
	ServiceType  string // "SaaS", "PaaS", "IaaS"
	ProviderName string // "AWS", "Azure", "GCP"
	FQDN         string
	IPAddress    string
	Region       string
	AccountID    string
	DiscoveredAt time.Time
	LastObserved time.Time
	SyncedToSGC  bool
	SGCSysID     string
}

// MedicalDeviceRecord represents a discovered medical device (healthcare vertical).
type MedicalDeviceRecord struct {
	ID                string
	Name              string
	Manufacturer      string
	ModelNumber       string
	SerialNumber      string
	IPAddress         string
	MACAddress        string
	DeviceClass       string // "Class I", "Class II", "Class III"
	FDAClassification string
	OperatingSystem   string
	DiscoveredAt      time.Time
	LastObserved      time.Time
	SyncedToSGC       bool
	SGCSysID          string
}

// --- Mapping functions ---

// ServerToIREItem maps a Pathfinder agent record to an IRE item for the
// appropriate cmdb_ci_server subclass based on OS type.
func ServerToIREItem(agent AgentRecord) IREItem {
	className := "cmdb_ci_server"
	switch strings.ToLower(agent.OSType) {
	case "linux":
		className = "cmdb_ci_linux_server"
	case "windows":
		className = "cmdb_ci_win_server"
	}

	values := map[string]string{
		"name":             agent.Hostname,
		"host_name":        agent.Hostname,
		"os_type":          agent.OSType,
		"ip_address":       agent.IPAddress,
		"discovery_source": "Pathfinder",
	}

	if agent.SerialNumber != "" {
		values["serial_number"] = agent.SerialNumber
	}
	if agent.CPUCount > 0 {
		values["cpu_count"] = fmt.Sprintf("%d", agent.CPUCount)
	}
	if agent.RAMMb > 0 {
		values["ram"] = fmt.Sprintf("%d", agent.RAMMb)
	}

	return IREItem{
		ClassName: className,
		Values:    values,
		Lookup: []IRELookup{
			{Column: "host_name", Value: agent.Hostname},
			{Column: "ip_address", Value: agent.IPAddress},
		},
	}
}

// AppInstanceToIREItem maps an application record to a cmdb_ci_app_server IRE item.
func AppInstanceToIREItem(app AppRecord) IREItem {
	values := map[string]string{
		"name":             app.Name,
		"version":          app.Version,
		"discovery_source": "Pathfinder",
	}

	if app.Vendor != "" {
		values["vendor"] = app.Vendor
	}
	if app.ListenPort > 0 {
		values["tcp_port"] = fmt.Sprintf("%d", app.ListenPort)
	}
	if app.InstallPath != "" {
		values["install_directory"] = app.InstallPath
	}
	if app.HostSysID != "" {
		values["host"] = app.HostSysID
	}

	return IREItem{
		ClassName: "cmdb_ci_app_server",
		Values:    values,
		Lookup: []IRELookup{
			{Column: "name", Value: app.Name},
			{Column: "host", Value: app.HostSysID},
		},
	}
}

// IntegrationToIRERelation maps a classified integration to an IRE relationship.
// API and Database integrations use "Depends on::Used by"; Messaging and Email
// integrations use "Sends data to::Receives data from".
func IntegrationToIRERelation(integ IntegrationRecord) IRERelation {
	relType := "Depends on::Used by"
	switch strings.ToLower(integ.IntegrationType) {
	case "messaging", "email":
		relType = "Sends data to::Receives data from"
	}

	values := map[string]string{
		"discovery_source":    "Pathfinder",
		"port":                fmt.Sprintf("%d", integ.Port),
		"connection_strength": fmt.Sprintf("%.0f", integ.Confidence*100),
	}

	return IRERelation{
		Parent: IRERelRef{
			ClassName: "cmdb_ci_app_server",
			Lookup: []IRELookup{
				{Column: "name", Value: integ.SourceApp},
			},
		},
		Child: IRERelRef{
			ClassName: "cmdb_ci_app_server",
			Lookup: []IRELookup{
				{Column: "name", Value: integ.TargetApp},
			},
		},
		Type:   relType,
		Values: values,
	}
}

// CloudServiceToIREItem maps a cloud service record to a cmdb_ci_cloud_service IRE item.
func CloudServiceToIREItem(svc CloudServiceRecord) IREItem {
	values := map[string]string{
		"name":             svc.Name,
		"service_type":     svc.ServiceType,
		"provider":         svc.ProviderName,
		"fqdn":             svc.FQDN,
		"ip_address":       svc.IPAddress,
		"discovery_source": "Pathfinder",
	}

	if svc.Region != "" {
		values["region"] = svc.Region
	}
	if svc.AccountID != "" {
		values["object_id"] = svc.AccountID
	}

	return IREItem{
		ClassName: "cmdb_ci_cloud_service",
		Values:    values,
		Lookup: []IRELookup{
			{Column: "name", Value: svc.Name},
			{Column: "provider", Value: svc.ProviderName},
		},
	}
}

// MedicalDeviceToIREItem maps a medical device record to a cmdb_ci_medical_device IRE item.
func MedicalDeviceToIREItem(dev MedicalDeviceRecord) IREItem {
	values := map[string]string{
		"name":             dev.Name,
		"manufacturer":     dev.Manufacturer,
		"model_number":     dev.ModelNumber,
		"ip_address":       dev.IPAddress,
		"mac_address":      dev.MACAddress,
		"discovery_source": "Pathfinder",
	}

	if dev.SerialNumber != "" {
		values["serial_number"] = dev.SerialNumber
	}
	if dev.DeviceClass != "" {
		values["device_class"] = dev.DeviceClass
	}
	if dev.FDAClassification != "" {
		values["fda_classification"] = dev.FDAClassification
	}
	if dev.OperatingSystem != "" {
		values["os"] = dev.OperatingSystem
	}

	return IREItem{
		ClassName: "cmdb_ci_medical_device",
		Values:    values,
		Lookup: []IRELookup{
			{Column: "serial_number", Value: dev.SerialNumber},
			{Column: "name", Value: dev.Name},
		},
	}
}
