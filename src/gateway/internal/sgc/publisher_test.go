package sgc

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.uber.org/zap"
)

func testLogger() *zap.Logger {
	logger, _ := zap.NewDevelopment()
	return logger
}

// --- Mapping tests ---

func TestServerToIREItem(t *testing.T) {
	tests := []struct {
		name          string
		agent         AgentRecord
		wantClass     string
		wantHostname  string
		wantIP        string
		wantCPU       string
		wantRAM       string
		wantSerial    bool
	}{
		{
			name: "linux server",
			agent: AgentRecord{
				Hostname:     "web-01.prod.internal",
				OSType:       "linux",
				IPAddress:    "10.0.1.50",
				SerialNumber: "SN-12345",
				CPUCount:     4,
				RAMMb:        8192,
			},
			wantClass:    "cmdb_ci_linux_server",
			wantHostname: "web-01.prod.internal",
			wantIP:       "10.0.1.50",
			wantCPU:      "4",
			wantRAM:      "8192",
			wantSerial:   true,
		},
		{
			name: "windows server",
			agent: AgentRecord{
				Hostname:  "dc-01.corp.local",
				OSType:    "windows",
				IPAddress: "10.0.2.10",
			},
			wantClass:    "cmdb_ci_win_server",
			wantHostname: "dc-01.corp.local",
			wantIP:       "10.0.2.10",
			wantSerial:   false,
		},
		{
			name: "unknown OS defaults to cmdb_ci_server",
			agent: AgentRecord{
				Hostname:  "appliance-01",
				OSType:    "freebsd",
				IPAddress: "10.0.3.5",
			},
			wantClass:    "cmdb_ci_server",
			wantHostname: "appliance-01",
			wantIP:       "10.0.3.5",
			wantSerial:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			item := ServerToIREItem(tt.agent)

			if item.ClassName != tt.wantClass {
				t.Errorf("ClassName = %q, want %q", item.ClassName, tt.wantClass)
			}
			if item.Values["host_name"] != tt.wantHostname {
				t.Errorf("host_name = %q, want %q", item.Values["host_name"], tt.wantHostname)
			}
			if item.Values["ip_address"] != tt.wantIP {
				t.Errorf("ip_address = %q, want %q", item.Values["ip_address"], tt.wantIP)
			}
			if item.Values["discovery_source"] != "Pathfinder" {
				t.Errorf("discovery_source = %q, want %q", item.Values["discovery_source"], "Pathfinder")
			}

			if tt.wantCPU != "" {
				if item.Values["cpu_count"] != tt.wantCPU {
					t.Errorf("cpu_count = %q, want %q", item.Values["cpu_count"], tt.wantCPU)
				}
			}
			if tt.wantRAM != "" {
				if item.Values["ram"] != tt.wantRAM {
					t.Errorf("ram = %q, want %q", item.Values["ram"], tt.wantRAM)
				}
			}
			if tt.wantSerial {
				if _, ok := item.Values["serial_number"]; !ok {
					t.Error("expected serial_number in values")
				}
			}

			// Verify lookup keys
			if len(item.Lookup) != 2 {
				t.Errorf("expected 2 lookup keys, got %d", len(item.Lookup))
			}
		})
	}
}

func TestAppInstanceToIREItem(t *testing.T) {
	tests := []struct {
		name      string
		app       AppRecord
		wantName  string
		wantPort  string
		wantHost  string
	}{
		{
			name: "web application",
			app: AppRecord{
				Name:       "nginx",
				Version:    "1.24.0",
				Vendor:     "Nginx Inc",
				HostSysID:  "sys_abc123",
				ListenPort: 443,
				InstallPath: "/usr/sbin/nginx",
			},
			wantName: "nginx",
			wantPort: "443",
			wantHost: "sys_abc123",
		},
		{
			name: "database",
			app: AppRecord{
				Name:      "PostgreSQL",
				Version:   "15.4",
				HostSysID: "sys_def456",
			},
			wantName: "PostgreSQL",
			wantHost: "sys_def456",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			item := AppInstanceToIREItem(tt.app)

			if item.ClassName != "cmdb_ci_app_server" {
				t.Errorf("ClassName = %q, want cmdb_ci_app_server", item.ClassName)
			}
			if item.Values["name"] != tt.wantName {
				t.Errorf("name = %q, want %q", item.Values["name"], tt.wantName)
			}
			if tt.wantPort != "" {
				if item.Values["tcp_port"] != tt.wantPort {
					t.Errorf("tcp_port = %q, want %q", item.Values["tcp_port"], tt.wantPort)
				}
			}
			if item.Values["host"] != tt.wantHost {
				t.Errorf("host = %q, want %q", item.Values["host"], tt.wantHost)
			}
		})
	}
}

func TestIntegrationToIRERelation(t *testing.T) {
	tests := []struct {
		name     string
		integ    IntegrationRecord
		wantType string
	}{
		{
			name: "API integration uses Depends on",
			integ: IntegrationRecord{
				SourceApp:       "order-service",
				TargetApp:       "inventory-api",
				IntegrationType: "API",
				Port:            8080,
				Confidence:      0.95,
			},
			wantType: "Depends on::Used by",
		},
		{
			name: "Database integration uses Depends on",
			integ: IntegrationRecord{
				SourceApp:       "billing-app",
				TargetApp:       "postgres-main",
				IntegrationType: "Database",
				Port:            5432,
				Confidence:      0.92,
			},
			wantType: "Depends on::Used by",
		},
		{
			name: "Messaging integration uses Sends data to",
			integ: IntegrationRecord{
				SourceApp:       "order-service",
				TargetApp:       "notification-queue",
				IntegrationType: "Messaging",
				Port:            5672,
				Confidence:      0.88,
			},
			wantType: "Sends data to::Receives data from",
		},
		{
			name: "Email integration uses Sends data to",
			integ: IntegrationRecord{
				SourceApp:       "alerts-service",
				TargetApp:       "smtp-relay",
				IntegrationType: "Email",
				Port:            25,
				Confidence:      0.85,
			},
			wantType: "Sends data to::Receives data from",
		},
		{
			name: "File integration defaults to Depends on",
			integ: IntegrationRecord{
				SourceApp:       "etl-job",
				TargetApp:       "data-lake",
				IntegrationType: "File",
				Port:            22,
				Confidence:      0.80,
			},
			wantType: "Depends on::Used by",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rel := IntegrationToIRERelation(tt.integ)

			if rel.Type != tt.wantType {
				t.Errorf("Type = %q, want %q", rel.Type, tt.wantType)
			}
			if rel.Parent.Lookup[0].Value != tt.integ.SourceApp {
				t.Errorf("parent lookup = %q, want %q", rel.Parent.Lookup[0].Value, tt.integ.SourceApp)
			}
			if rel.Child.Lookup[0].Value != tt.integ.TargetApp {
				t.Errorf("child lookup = %q, want %q", rel.Child.Lookup[0].Value, tt.integ.TargetApp)
			}
			if rel.Values["discovery_source"] != "Pathfinder" {
				t.Errorf("discovery_source = %q, want Pathfinder", rel.Values["discovery_source"])
			}
		})
	}
}

func TestCloudServiceToIREItem(t *testing.T) {
	svc := CloudServiceRecord{
		Name:         "S3 Bucket - prod-assets",
		ServiceType:  "SaaS",
		ProviderName: "AWS",
		FQDN:         "prod-assets.s3.amazonaws.com",
		IPAddress:    "52.216.100.1",
		Region:       "us-east-1",
		AccountID:    "123456789012",
	}

	item := CloudServiceToIREItem(svc)

	if item.ClassName != "cmdb_ci_cloud_service" {
		t.Errorf("ClassName = %q, want cmdb_ci_cloud_service", item.ClassName)
	}
	if item.Values["name"] != svc.Name {
		t.Errorf("name = %q, want %q", item.Values["name"], svc.Name)
	}
	if item.Values["provider"] != "AWS" {
		t.Errorf("provider = %q, want AWS", item.Values["provider"])
	}
	if item.Values["region"] != "us-east-1" {
		t.Errorf("region = %q, want us-east-1", item.Values["region"])
	}
	if item.Values["object_id"] != "123456789012" {
		t.Errorf("object_id = %q, want 123456789012", item.Values["object_id"])
	}
	if item.Values["discovery_source"] != "Pathfinder" {
		t.Errorf("discovery_source = %q, want Pathfinder", item.Values["discovery_source"])
	}
}

func TestMedicalDeviceToIREItem(t *testing.T) {
	dev := MedicalDeviceRecord{
		Name:              "Infusion Pump - ICU-3",
		Manufacturer:      "Baxter",
		ModelNumber:       "Sigma Spectrum",
		SerialNumber:      "BXT-98765",
		IPAddress:         "10.50.1.100",
		MACAddress:        "00:1A:2B:3C:4D:5E",
		DeviceClass:       "Class II",
		FDAClassification: "510(k)",
		OperatingSystem:   "VxWorks",
	}

	item := MedicalDeviceToIREItem(dev)

	if item.ClassName != "cmdb_ci_medical_device" {
		t.Errorf("ClassName = %q, want cmdb_ci_medical_device", item.ClassName)
	}
	if item.Values["manufacturer"] != "Baxter" {
		t.Errorf("manufacturer = %q, want Baxter", item.Values["manufacturer"])
	}
	if item.Values["serial_number"] != "BXT-98765" {
		t.Errorf("serial_number = %q, want BXT-98765", item.Values["serial_number"])
	}
	if item.Values["device_class"] != "Class II" {
		t.Errorf("device_class = %q, want Class II", item.Values["device_class"])
	}
	if item.Values["os"] != "VxWorks" {
		t.Errorf("os = %q, want VxWorks", item.Values["os"])
	}

	// Verify lookup uses serial_number for unique identification.
	if len(item.Lookup) < 1 || item.Lookup[0].Column != "serial_number" {
		t.Error("expected first lookup key to be serial_number")
	}
}

// --- Batch splitting ---

func TestSplitIntoBatches(t *testing.T) {
	tests := []struct {
		name       string
		itemCount  int
		batchSize  int
		wantBatches int
		wantLastLen int
	}{
		{
			name:        "exact multiple",
			itemCount:   200,
			batchSize:   100,
			wantBatches: 2,
			wantLastLen: 100,
		},
		{
			name:        "remainder",
			itemCount:   250,
			batchSize:   100,
			wantBatches: 3,
			wantLastLen: 50,
		},
		{
			name:        "less than one batch",
			itemCount:   30,
			batchSize:   100,
			wantBatches: 1,
			wantLastLen: 30,
		},
		{
			name:        "empty",
			itemCount:   0,
			batchSize:   100,
			wantBatches: 0,
		},
		{
			name:        "single item",
			itemCount:   1,
			batchSize:   100,
			wantBatches: 1,
			wantLastLen: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			items := make([]map[string]interface{}, tt.itemCount)
			for i := range items {
				items[i] = map[string]interface{}{"id": i}
			}

			batches := splitIntoBatches(items, tt.batchSize)

			if len(batches) != tt.wantBatches {
				t.Errorf("got %d batches, want %d", len(batches), tt.wantBatches)
			}
			if tt.wantBatches > 0 {
				lastLen := len(batches[len(batches)-1])
				if lastLen != tt.wantLastLen {
					t.Errorf("last batch length = %d, want %d", lastLen, tt.wantLastLen)
				}
			}

			// Verify total count across batches.
			total := 0
			for _, batch := range batches {
				total += len(batch)
			}
			if total != tt.itemCount {
				t.Errorf("total items across batches = %d, want %d", total, tt.itemCount)
			}
		})
	}
}

// --- OAuth2 and IRE HTTP tests ---

func TestOAuth2TokenCachingAndRefresh(t *testing.T) {
	tokenCalls := 0

	handler := http.NewServeMux()
	handler.HandleFunc("/oauth_token.do", func(w http.ResponseWriter, r *http.Request) {
		tokenCalls++
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "sgc-token-v1",
			"token_type":   "Bearer",
			"expires_in":   3600,
		})
	})
	handler.HandleFunc("/api/now/identifyreconcile", func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != "Bearer sgc-token-v1" {
			t.Errorf("expected Bearer sgc-token-v1, got %s", auth)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(IREResponse{
			Result: IREResult{Items: []IREResultItem{}},
		})
	})

	srv := httptest.NewServer(handler)
	defer srv.Close()

	pub := NewPublisher(Config{
		InstanceURL:   srv.URL,
		ClientID:      "test-id",
		ClientSecret:  "test-secret",
		BatchSize:     100,
		SyncInterval:  60 * time.Second,
		Enabled:       true,
		RetryAttempts: 1,
		RetryDelay:    time.Millisecond,
	}, nil, testLogger())

	ctx := context.Background()

	// First call should authenticate.
	payload := &IREPayload{Items: []IREItem{}}
	_, err := pub.postToIRE(ctx, payload)
	if err != nil {
		t.Fatalf("first postToIRE: %v", err)
	}

	// Second call should use cached token.
	_, err = pub.postToIRE(ctx, payload)
	if err != nil {
		t.Fatalf("second postToIRE: %v", err)
	}

	if tokenCalls != 1 {
		t.Errorf("expected 1 token call (cached), got %d", tokenCalls)
	}
}

func TestOAuth2AuthFailure(t *testing.T) {
	handler := http.NewServeMux()
	handler.HandleFunc("/oauth_token.do", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("invalid_client"))
	})

	srv := httptest.NewServer(handler)
	defer srv.Close()

	pub := NewPublisher(Config{
		InstanceURL:   srv.URL,
		ClientID:      "bad-id",
		ClientSecret:  "bad-secret",
		Enabled:       true,
		RetryAttempts: 1,
		RetryDelay:    time.Millisecond,
	}, nil, testLogger())

	_, err := pub.postToIRE(context.Background(), &IREPayload{})
	if err == nil {
		t.Fatal("expected error for failed authentication")
	}
}

func TestIREResponseHandling(t *testing.T) {
	tests := []struct {
		name       string
		response   IREResponse
		wantOps    []string
		wantErrors []string
	}{
		{
			name: "all inserted",
			response: IREResponse{
				Result: IREResult{
					Items: []IREResultItem{
						{SysID: "sys_001", ClassName: "cmdb_ci_linux_server", Operation: "INSERT"},
						{SysID: "sys_002", ClassName: "cmdb_ci_linux_server", Operation: "INSERT"},
					},
				},
			},
			wantOps:    []string{"INSERT", "INSERT"},
			wantErrors: []string{"", ""},
		},
		{
			name: "mixed operations",
			response: IREResponse{
				Result: IREResult{
					Items: []IREResultItem{
						{SysID: "sys_010", ClassName: "cmdb_ci_server", Operation: "UPDATE"},
						{SysID: "sys_011", ClassName: "cmdb_ci_server", Operation: "NO_CHANGE"},
						{SysID: "", ClassName: "cmdb_ci_server", Operation: "SKIPPED", Error: "duplicate key"},
					},
				},
			},
			wantOps:    []string{"UPDATE", "NO_CHANGE", "SKIPPED"},
			wantErrors: []string{"", "", "duplicate key"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			respJSON, _ := json.Marshal(tt.response)

			handler := http.NewServeMux()
			handler.HandleFunc("/oauth_token.do", func(w http.ResponseWriter, r *http.Request) {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"access_token": "tok", "token_type": "Bearer", "expires_in": 3600,
				})
			})
			handler.HandleFunc("/api/now/identifyreconcile", func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.Write(respJSON)
			})

			srv := httptest.NewServer(handler)
			defer srv.Close()

			pub := NewPublisher(Config{
				InstanceURL:   srv.URL,
				ClientID:      "id",
				ClientSecret:  "secret",
				Enabled:       true,
				RetryAttempts: 1,
				RetryDelay:    time.Millisecond,
			}, nil, testLogger())

			resp, err := pub.postToIRE(context.Background(), &IREPayload{Items: []IREItem{}})
			if err != nil {
				t.Fatalf("postToIRE: %v", err)
			}

			if len(resp.Result.Items) != len(tt.wantOps) {
				t.Fatalf("got %d items, want %d", len(resp.Result.Items), len(tt.wantOps))
			}

			for i, item := range resp.Result.Items {
				if item.Operation != tt.wantOps[i] {
					t.Errorf("item[%d].Operation = %q, want %q", i, item.Operation, tt.wantOps[i])
				}
				if item.Error != tt.wantErrors[i] {
					t.Errorf("item[%d].Error = %q, want %q", i, item.Error, tt.wantErrors[i])
				}
			}
		})
	}
}

func TestIREPayloadSerialization(t *testing.T) {
	payload := IREPayload{
		Items: []IREItem{
			{
				ClassName: "cmdb_ci_linux_server",
				Values: map[string]string{
					"name":       "web-01",
					"ip_address": "10.0.1.5",
				},
				Lookup: []IRELookup{
					{Column: "host_name", Value: "web-01"},
				},
			},
		},
		Relations: []IRERelation{
			{
				Parent: IRERelRef{
					ClassName: "cmdb_ci_app_server",
					Lookup:    []IRELookup{{Column: "name", Value: "app-a"}},
				},
				Child: IRERelRef{
					ClassName: "cmdb_ci_app_server",
					Lookup:    []IRELookup{{Column: "name", Value: "app-b"}},
				},
				Type: "Depends on::Used by",
			},
		},
	}

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded IREPayload
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(decoded.Items) != 1 {
		t.Errorf("expected 1 item, got %d", len(decoded.Items))
	}
	if decoded.Items[0].ClassName != "cmdb_ci_linux_server" {
		t.Errorf("className = %q, want cmdb_ci_linux_server", decoded.Items[0].ClassName)
	}
	if len(decoded.Relations) != 1 {
		t.Errorf("expected 1 relation, got %d", len(decoded.Relations))
	}
	if decoded.Relations[0].Type != "Depends on::Used by" {
		t.Errorf("relation type = %q, want 'Depends on::Used by'", decoded.Relations[0].Type)
	}
}

func TestBuildIREPayloadServers(t *testing.T) {
	pub := NewPublisher(Config{
		InstanceURL: "https://example.service-now.com",
		Enabled:     true,
	}, nil, testLogger())

	items := []map[string]interface{}{
		{
			"id":         "rec-001",
			"hostname":   "linux-box-01",
			"os_type":    "linux",
			"ip_address": "10.0.0.1",
			"cpu_count":  8,
			"ram_mb":     16384,
		},
		{
			"id":         "rec-002",
			"hostname":   "win-dc-01",
			"os_type":    "windows",
			"ip_address": "10.0.0.2",
		},
	}

	payload := pub.buildIREPayload("cmdb_ci_server", items)

	if len(payload.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(payload.Items))
	}
	if payload.Items[0].ClassName != "cmdb_ci_linux_server" {
		t.Errorf("first item class = %q, want cmdb_ci_linux_server", payload.Items[0].ClassName)
	}
	if payload.Items[1].ClassName != "cmdb_ci_win_server" {
		t.Errorf("second item class = %q, want cmdb_ci_win_server", payload.Items[1].ClassName)
	}
}

func TestBuildIREPayloadIntegrations(t *testing.T) {
	pub := NewPublisher(Config{
		InstanceURL: "https://example.service-now.com",
		Enabled:     true,
	}, nil, testLogger())

	items := []map[string]interface{}{
		{
			"id":               "int-001",
			"source_app":       "frontend",
			"target_app":       "backend-api",
			"integration_type": "API",
			"port":             8080,
			"confidence":       0.95,
		},
	}

	payload := pub.buildIREPayload("cmdb_rel_ci", items)

	if len(payload.Relations) != 1 {
		t.Fatalf("expected 1 relation, got %d", len(payload.Relations))
	}
	if payload.Relations[0].Type != "Depends on::Used by" {
		t.Errorf("relation type = %q, want 'Depends on::Used by'", payload.Relations[0].Type)
	}
}

// --- Export handler tests ---

func TestExportHandler(t *testing.T) {
	h := NewExportHandler(nil, ExportConfig{
		RateLimitPerMin: 100,
		MaxPageSize:     500,
		DefaultPageSize: 50,
	}, testLogger())

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	// Test method not allowed.
	t.Run("POST to export returns 405", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/api/v1/sgc/export", nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
		}
	})

	// Test GET to ack returns 405.
	t.Run("GET to ack returns 405", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/sgc/ack", nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
		}
	})
}

func TestRateLimiting(t *testing.T) {
	h := NewExportHandler(nil, ExportConfig{
		RateLimitPerMin: 3,
		MaxPageSize:     100,
		DefaultPageSize: 50,
	}, testLogger())

	// First 3 should pass.
	for i := 0; i < 3; i++ {
		if !h.checkRateLimit() {
			t.Errorf("request %d should have been allowed", i+1)
		}
	}

	// Fourth should be blocked.
	if h.checkRateLimit() {
		t.Error("request 4 should have been rate-limited")
	}
}

func TestTruncate(t *testing.T) {
	tests := []struct {
		input  string
		maxLen int
		want   string
	}{
		{"short", 10, "short"},
		{"exactly ten", 11, "exactly ten"},
		{"this is a long string", 10, "this is a ..."},
	}

	for _, tt := range tests {
		got := truncate(tt.input, tt.maxLen)
		if got != tt.want {
			t.Errorf("truncate(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
		}
	}
}
