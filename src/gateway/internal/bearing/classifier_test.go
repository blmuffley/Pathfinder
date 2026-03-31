package bearing

import (
	"testing"
	"time"
)

func TestClassifyTrafficState_Active(t *testing.T) {
	state := ClassifyTrafficState(50000, 100, time.Now().Add(-5*time.Minute), 24)
	if state != "active" {
		t.Errorf("expected active, got %s", state)
	}
}

func TestClassifyTrafficState_Idle(t *testing.T) {
	state := ClassifyTrafficState(500, 3, time.Now().Add(-10*time.Minute), 24)
	if state != "idle" {
		t.Errorf("expected idle, got %s", state)
	}
}

func TestClassifyTrafficState_Deprecated(t *testing.T) {
	state := ClassifyTrafficState(50000, 100, time.Now().Add(-10*24*time.Hour), 24)
	if state != "deprecated" {
		t.Errorf("expected deprecated, got %s", state)
	}
}

func TestClassifyTrafficState_Unknown(t *testing.T) {
	state := ClassifyTrafficState(0, 0, time.Time{}, 24)
	if state != "unknown" {
		t.Errorf("expected unknown, got %s", state)
	}
}

func TestInferBehavioralClass_WebServer(t *testing.T) {
	ports := map[int]int{443: 50, 80: 20}
	bc := InferBehavioralClass(ports)
	if bc == nil {
		t.Fatal("expected behavioral classification, got nil")
	}
	if bc.SuggestedClass != "cmdb_ci_app_server" {
		t.Errorf("expected cmdb_ci_app_server, got %s", bc.SuggestedClass)
	}
	if bc.ClassificationConfidence < 70 {
		t.Errorf("expected confidence >= 70, got %d", bc.ClassificationConfidence)
	}
}

func TestInferBehavioralClass_Database(t *testing.T) {
	ports := map[int]int{5432: 100}
	bc := InferBehavioralClass(ports)
	if bc == nil {
		t.Fatal("expected behavioral classification, got nil")
	}
	if bc.SuggestedClass != "cmdb_ci_db_instance" {
		t.Errorf("expected cmdb_ci_db_instance, got %s", bc.SuggestedClass)
	}
	if bc.ClassificationConfidence != 90 {
		t.Errorf("expected confidence 90, got %d", bc.ClassificationConfidence)
	}
}

func TestInferBehavioralClass_MySQL(t *testing.T) {
	ports := map[int]int{3306: 50}
	bc := InferBehavioralClass(ports)
	if bc == nil {
		t.Fatal("expected classification")
	}
	if bc.SuggestedClass != "cmdb_ci_db_instance" {
		t.Errorf("expected cmdb_ci_db_instance, got %s", bc.SuggestedClass)
	}
}

func TestInferBehavioralClass_MessageBroker(t *testing.T) {
	ports := map[int]int{9092: 200}
	bc := InferBehavioralClass(ports)
	if bc == nil {
		t.Fatal("expected classification")
	}
	if bc.SuggestedClass != "cmdb_ci_app_server" {
		t.Errorf("expected cmdb_ci_app_server, got %s", bc.SuggestedClass)
	}
}

func TestInferBehavioralClass_NoMatch(t *testing.T) {
	ports := map[int]int{55555: 2}
	bc := InferBehavioralClass(ports)
	if bc != nil {
		t.Errorf("expected nil for unknown port, got %+v", bc)
	}
}

func TestInferBehavioralClass_BelowMinFlows(t *testing.T) {
	ports := map[int]int{5432: 2} // Below MinFlows=5
	bc := InferBehavioralClass(ports)
	if bc != nil {
		t.Errorf("expected nil when below MinFlows, got %+v", bc)
	}
}

func TestInferBehavioralClass_HighestConfidenceWins(t *testing.T) {
	// Both SSH (60%) and HTTPS (80%) — HTTPS should win
	ports := map[int]int{22: 10, 443: 50}
	bc := InferBehavioralClass(ports)
	if bc == nil {
		t.Fatal("expected classification")
	}
	if bc.ClassificationConfidence != 80 {
		t.Errorf("expected highest confidence 80 (HTTPS), got %d", bc.ClassificationConfidence)
	}
}

func TestUnknownCI(t *testing.T) {
	ci := unknownCI("10.0.1.55")
	if ci.IsKnown {
		t.Error("expected IsKnown=false")
	}
	if ci.SysID == "" || ci.SysID == "pf_unknown_" {
		t.Error("expected generated sys_id")
	}
	if len(ci.SysID) < 15 {
		t.Errorf("sys_id too short: %s", ci.SysID)
	}

	// Same IP should produce same hash
	ci2 := unknownCI("10.0.1.55")
	if ci.SysID != ci2.SysID {
		t.Errorf("same IP should produce same sys_id: %s vs %s", ci.SysID, ci2.SysID)
	}

	// Different IP should produce different hash
	ci3 := unknownCI("10.0.1.56")
	if ci.SysID == ci3.SysID {
		t.Error("different IPs should produce different sys_ids")
	}
}

func TestExtractSubnet(t *testing.T) {
	tests := []struct {
		ip   string
		want string
	}{
		{"10.0.1.55", "10.0.1.0/24"},
		{"192.168.100.200", "192.168.100.0/24"},
		{"invalid", ""},
	}
	for _, tt := range tests {
		got := extractSubnet(tt.ip)
		if got != tt.want {
			t.Errorf("extractSubnet(%s) = %s, want %s", tt.ip, got, tt.want)
		}
	}
}
