package snsync

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.uber.org/zap"
)

func testLogger() *zap.Logger {
	logger, _ := zap.NewDevelopment()
	return logger
}

func TestUpsertIntegrations(t *testing.T) {
	// Mock ServiceNow server
	handler := http.NewServeMux()

	// OAuth token endpoint
	handler.HandleFunc("/oauth_token.do", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "test-token-123",
			"token_type":   "Bearer",
			"expires_in":   3600,
		})
	})

	// Integrations endpoint
	handler.HandleFunc("/api/x_avnth/pathfinder/v1/integrations", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}

		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-token-123" {
			t.Errorf("expected Bearer token, got %s", auth)
		}

		var req UpsertIntegrationsRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("decode request: %v", err)
		}

		if len(req.Integrations) != 2 {
			t.Errorf("expected 2 integrations, got %d", len(req.Integrations))
		}

		results := make([]UpsertIntegrationsResult, 0)
		for _, integ := range req.Integrations {
			results = append(results, UpsertIntegrationsResult{
				SysID:     "sys_" + integ.SourceCI,
				SourceCI:  integ.SourceCI,
				TargetCI:  integ.TargetCI,
				Operation: "create",
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(UpsertIntegrationsResponse{
			Results: results,
			Count:   len(results),
		})
	})

	srv := httptest.NewServer(handler)
	defer srv.Close()

	client := NewClient(srv.URL, "test-client-id", "test-secret", testLogger())

	resp, err := client.UpsertIntegrations(context.Background(), &UpsertIntegrationsRequest{
		Integrations: []IntegrationPayload{
			{SourceCI: "app-a", TargetCI: "app-b", IntegrationType: "API", ClassificationConfidence: 0.95},
			{SourceCI: "app-c", TargetCI: "app-d", IntegrationType: "Database", ClassificationConfidence: 0.90},
		},
	})
	if err != nil {
		t.Fatalf("upsert integrations: %v", err)
	}

	if resp.Count != 2 {
		t.Errorf("expected 2 results, got %d", resp.Count)
	}
	if resp.Results[0].SysID != "sys_app-a" {
		t.Errorf("expected sys_app-a, got %s", resp.Results[0].SysID)
	}
	if resp.Results[0].Operation != "create" {
		t.Errorf("expected create, got %s", resp.Results[0].Operation)
	}
}

func TestUpsertInterfaces(t *testing.T) {
	handler := http.NewServeMux()
	handler.HandleFunc("/oauth_token.do", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "test-token", "token_type": "Bearer", "expires_in": 3600,
		})
	})
	handler.HandleFunc("/api/x_avnth/pathfinder/v1/interfaces", func(w http.ResponseWriter, r *http.Request) {
		var req UpsertInterfacesRequest
		json.NewDecoder(r.Body).Decode(&req)
		if len(req.Interfaces) != 1 {
			t.Errorf("expected 1 interface, got %d", len(req.Interfaces))
		}
		json.NewEncoder(w).Encode(map[string]interface{}{"results": []interface{}{}, "count": 1})
	})

	srv := httptest.NewServer(handler)
	defer srv.Close()

	client := NewClient(srv.URL, "id", "secret", testLogger())
	err := client.UpsertInterfaces(context.Background(), &UpsertInterfacesRequest{
		Interfaces: []InterfacePayload{
			{Integration: "sys_123", Protocol: "tcp", Port: 5432, Direction: "Outbound", FlowCount: 100},
		},
	})
	if err != nil {
		t.Fatalf("upsert interfaces: %v", err)
	}
}

func TestUpsertAgents(t *testing.T) {
	handler := http.NewServeMux()
	handler.HandleFunc("/oauth_token.do", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "test-token", "token_type": "Bearer", "expires_in": 3600,
		})
	})
	handler.HandleFunc("/api/x_avnth/pathfinder/v1/agents", func(w http.ResponseWriter, r *http.Request) {
		var req UpsertAgentsRequest
		json.NewDecoder(r.Body).Decode(&req)
		if len(req.Agents) != 1 {
			t.Errorf("expected 1 agent, got %d", len(req.Agents))
		}
		json.NewEncoder(w).Encode(map[string]interface{}{"results": []interface{}{}, "count": 1})
	})

	srv := httptest.NewServer(handler)
	defer srv.Close()

	client := NewClient(srv.URL, "id", "secret", testLogger())
	err := client.UpsertAgents(context.Background(), &UpsertAgentsRequest{
		Agents: []AgentPayload{
			{AgentID: "agent-1", Hostname: "host-1", OSType: "linux", AgentVersion: "0.1.0", Status: "Active"},
		},
	})
	if err != nil {
		t.Fatalf("upsert agents: %v", err)
	}
}

func TestOAuthTokenCaching(t *testing.T) {
	tokenCalls := 0
	handler := http.NewServeMux()
	handler.HandleFunc("/oauth_token.do", func(w http.ResponseWriter, r *http.Request) {
		tokenCalls++
		json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token": "cached-token", "token_type": "Bearer", "expires_in": 3600,
		})
	})
	handler.HandleFunc("/api/x_avnth/pathfinder/v1/agents", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]interface{}{"results": []interface{}{}, "count": 0})
	})

	srv := httptest.NewServer(handler)
	defer srv.Close()

	client := NewClient(srv.URL, "id", "secret", testLogger())

	// Make two requests — should only authenticate once
	client.UpsertAgents(context.Background(), &UpsertAgentsRequest{Agents: []AgentPayload{}})
	client.UpsertAgents(context.Background(), &UpsertAgentsRequest{Agents: []AgentPayload{}})

	if tokenCalls != 1 {
		t.Errorf("expected 1 token call (cached), got %d", tokenCalls)
	}
}

func TestAuthFailure(t *testing.T) {
	handler := http.NewServeMux()
	handler.HandleFunc("/oauth_token.do", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(401)
		w.Write([]byte("invalid credentials"))
	})

	srv := httptest.NewServer(handler)
	defer srv.Close()

	client := NewClient(srv.URL, "bad-id", "bad-secret", testLogger())
	_, err := client.UpsertIntegrations(context.Background(), &UpsertIntegrationsRequest{})
	if err == nil {
		t.Fatal("expected error for failed auth")
	}
}
