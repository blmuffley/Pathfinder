// Package snsync provides the legacy ServiceNow REST API sync client.
//
// DEPRECATED: Use the Service Graph Connector (internal/sgc) for new deployments.
// This package pushes data via proprietary REST endpoints (/api/x_avnth/pathfinder/v1/*).
// The SGC publisher uses the standard IRE identifyreconcile API instead.
//
// To enable legacy sync during migration, set PF_LEGACY_SYNC=true.
// See docs/architecture/11-service-graph-connector.md for migration path.
package snsync

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
)

// Client handles OAuth2-authenticated REST calls to a ServiceNow instance.
type Client struct {
	instance     string
	clientID     string
	clientSecret string
	httpClient   *http.Client
	logger       *zap.Logger

	mu          sync.Mutex
	accessToken string
	tokenExpiry time.Time
}

// NewClient creates a ServiceNow REST client.
func NewClient(instance, clientID, clientSecret string, logger *zap.Logger) *Client {
	return &Client{
		instance:     strings.TrimRight(instance, "/"),
		clientID:     clientID,
		clientSecret: clientSecret,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
		logger:       logger,
	}
}

// tokenResponse is the OAuth2 token response from ServiceNow.
type tokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// authenticate performs OAuth2 client credentials flow.
func (c *Client) authenticate(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Return cached token if still valid
	if c.accessToken != "" && time.Now().Before(c.tokenExpiry) {
		return nil
	}

	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.instance+"/oauth_token.do", strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("token request failed (%d): %s", resp.StatusCode, string(body))
	}

	var tokenResp tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return fmt.Errorf("decode token response: %w", err)
	}

	c.accessToken = tokenResp.AccessToken
	// Refresh 60s before expiry
	c.tokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn-60) * time.Second)

	c.logger.Info("ServiceNow OAuth token acquired",
		zap.Int("expires_in", tokenResp.ExpiresIn),
	)

	return nil
}

// doRequest executes an authenticated HTTP request to ServiceNow.
func (c *Client) doRequest(ctx context.Context, method, path string, body interface{}) ([]byte, int, error) {
	if err := c.authenticate(ctx); err != nil {
		return nil, 0, fmt.Errorf("authenticate: %w", err)
	}

	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, 0, fmt.Errorf("marshal body: %w", err)
		}
		reqBody = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.instance+path, reqBody)
	if err != nil {
		return nil, 0, fmt.Errorf("create request: %w", err)
	}

	c.mu.Lock()
	req.Header.Set("Authorization", "Bearer "+c.accessToken)
	c.mu.Unlock()
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("request %s %s: %w", method, path, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("read response: %w", err)
	}

	return respBody, resp.StatusCode, nil
}

// --- API Methods ---

// UpsertIntegrationsRequest is the request body for POST /integrations.
type UpsertIntegrationsRequest struct {
	Integrations []IntegrationPayload `json:"integrations"`
}

// IntegrationPayload represents an integration CI for ServiceNow sync.
type IntegrationPayload struct {
	SourceCI                string  `json:"source_ci"`
	TargetCI                string  `json:"target_ci"`
	IntegrationType         string  `json:"integration_type"`
	ClassificationConfidence float64 `json:"classification_confidence"`
	DiscoveryMethod         string  `json:"discovery_method"`
	FirstDiscovered         string  `json:"first_discovered"`
	LastObserved            string  `json:"last_observed"`
	FlowCount               int64   `json:"flow_count"`
}

// UpsertIntegrationsResult is a single result from the integrations endpoint.
type UpsertIntegrationsResult struct {
	SysID     string `json:"sys_id"`
	SourceCI  string `json:"source_ci"`
	TargetCI  string `json:"target_ci"`
	Operation string `json:"operation"`
}

// UpsertIntegrationsResponse is the response from POST /integrations.
type UpsertIntegrationsResponse struct {
	Results []UpsertIntegrationsResult `json:"results"`
	Count   int                        `json:"count"`
}

// UpsertIntegrations creates or updates integration CIs in ServiceNow.
func (c *Client) UpsertIntegrations(ctx context.Context, req *UpsertIntegrationsRequest) (*UpsertIntegrationsResponse, error) {
	body, status, err := c.doRequest(ctx, "POST", "/api/x_avnth/pathfinder/v1/integrations", req)
	if err != nil {
		return nil, err
	}
	if status != 200 {
		return nil, fmt.Errorf("upsert integrations: HTTP %d: %s", status, string(body))
	}

	var resp UpsertIntegrationsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &resp, nil
}

// UpsertInterfacesRequest is the request body for POST /interfaces.
type UpsertInterfacesRequest struct {
	Interfaces []InterfacePayload `json:"interfaces"`
}

// InterfacePayload represents an interface CI for ServiceNow sync.
type InterfacePayload struct {
	Integration     string `json:"integration"`
	Protocol        string `json:"protocol"`
	Port            int    `json:"port"`
	Direction       string `json:"direction"`
	Pattern         string `json:"pattern,omitempty"`
	ProcessName     string `json:"process_name,omitempty"`
	AvgBytesPerFlow int64  `json:"avg_bytes_per_flow,omitempty"`
	FlowCount       int64  `json:"flow_count"`
	FirstDiscovered string `json:"first_discovered"`
	LastObserved    string `json:"last_observed"`
}

// UpsertInterfaces creates or updates interface CIs in ServiceNow.
func (c *Client) UpsertInterfaces(ctx context.Context, req *UpsertInterfacesRequest) error {
	body, status, err := c.doRequest(ctx, "POST", "/api/x_avnth/pathfinder/v1/interfaces", req)
	if err != nil {
		return err
	}
	if status != 200 {
		return fmt.Errorf("upsert interfaces: HTTP %d: %s", status, string(body))
	}
	return nil
}

// UpsertAgentsRequest is the request body for POST /agents.
type UpsertAgentsRequest struct {
	Agents []AgentPayload `json:"agents"`
}

// AgentPayload represents an agent record for ServiceNow sync.
type AgentPayload struct {
	AgentID       string `json:"agent_id"`
	Hostname      string `json:"hostname"`
	OSType        string `json:"os_type"`
	AgentVersion  string `json:"agent_version"`
	LastHeartbeat string `json:"last_heartbeat"`
	Status        string `json:"status"`
	EnrolledAt    string `json:"enrolled_at"`
}

// UpsertAgents creates or updates agent records in ServiceNow.
func (c *Client) UpsertAgents(ctx context.Context, req *UpsertAgentsRequest) error {
	body, status, err := c.doRequest(ctx, "POST", "/api/x_avnth/pathfinder/v1/agents", req)
	if err != nil {
		return err
	}
	if status != 200 {
		return fmt.Errorf("upsert agents: HTTP %d: %s", status, string(body))
	}
	return nil
}
