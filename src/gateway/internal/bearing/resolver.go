package bearing

import (
	"context"
	"crypto/sha256"
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

// CIInfo holds resolved CMDB CI metadata.
type CIInfo struct {
	SysID    string
	Class    string
	Name     string
	IPAddr   string
	IsKnown  bool // false = shadow IT (no CMDB record)
}

// Resolver maps IP addresses to CMDB CI sys_ids via the ServiceNow REST API.
// Maintains a local cache that refreshes periodically.
type Resolver struct {
	snInstance   string
	snToken      string // OAuth Bearer token (injected from snsync)
	httpClient   *http.Client
	logger       *zap.Logger

	mu    sync.RWMutex
	cache map[string]*CIInfo // IP → CIInfo
}

// NewResolver creates a CI-to-SysID resolver.
func NewResolver(snInstance, snToken string, logger *zap.Logger) *Resolver {
	return &Resolver{
		snInstance: strings.TrimRight(snInstance, "/"),
		snToken:    snToken,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		logger:     logger,
		cache:      make(map[string]*CIInfo),
	}
}

// SetToken updates the OAuth token (called after token refresh).
func (r *Resolver) SetToken(token string) {
	r.mu.Lock()
	r.snToken = token
	r.mu.Unlock()
}

// Resolve looks up a CI by IP address. Returns cached result or queries SN.
// For unknown hosts, returns a generated identifier (pf_unknown_{hash}).
func (r *Resolver) Resolve(ctx context.Context, ip string) *CIInfo {
	r.mu.RLock()
	if info, ok := r.cache[ip]; ok {
		r.mu.RUnlock()
		return info
	}
	r.mu.RUnlock()

	// Query ServiceNow
	info := r.queryServiceNow(ctx, ip)

	r.mu.Lock()
	r.cache[ip] = info
	r.mu.Unlock()

	return info
}

// RefreshCache fetches all server CIs from ServiceNow and rebuilds the cache.
func (r *Resolver) RefreshCache(ctx context.Context) error {
	r.mu.RLock()
	token := r.snToken
	r.mu.RUnlock()

	if token == "" {
		return fmt.Errorf("no SN OAuth token available")
	}

	// Query all servers with IP addresses
	apiURL := fmt.Sprintf("%s/api/now/table/cmdb_ci_server?sysparm_query=ip_addressISNOTEMPTY&sysparm_fields=sys_id,sys_class_name,name,ip_address&sysparm_limit=10000", r.snInstance)

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("query SN: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("SN returned %d: %s", resp.StatusCode, string(body)[:200])
	}

	var result struct {
		Result []struct {
			SysID    string `json:"sys_id"`
			Class    string `json:"sys_class_name"`
			Name     string `json:"name"`
			IPAddr   string `json:"ip_address"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}

	newCache := make(map[string]*CIInfo, len(result.Result))
	for _, ci := range result.Result {
		newCache[ci.IPAddr] = &CIInfo{
			SysID:   ci.SysID,
			Class:   ci.Class,
			Name:    ci.Name,
			IPAddr:  ci.IPAddr,
			IsKnown: true,
		}
	}

	r.mu.Lock()
	// Preserve unknown entries
	for ip, info := range r.cache {
		if !info.IsKnown {
			newCache[ip] = info
		}
	}
	r.cache = newCache
	r.mu.Unlock()

	r.logger.Info("CI resolver cache refreshed", zap.Int("known_cis", len(result.Result)))
	return nil
}

// RunCacheRefresh periodically refreshes the CI cache.
func (r *Resolver) RunCacheRefresh(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Initial refresh
	if err := r.RefreshCache(ctx); err != nil {
		r.logger.Error("initial CI cache refresh failed", zap.Error(err))
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := r.RefreshCache(ctx); err != nil {
				r.logger.Error("CI cache refresh failed", zap.Error(err))
			}
		}
	}
}

// queryServiceNow looks up a single IP in the CMDB.
func (r *Resolver) queryServiceNow(ctx context.Context, ip string) *CIInfo {
	r.mu.RLock()
	token := r.snToken
	r.mu.RUnlock()

	if token == "" {
		return unknownCI(ip)
	}

	apiURL := fmt.Sprintf("%s/api/now/table/cmdb_ci?sysparm_query=ip_address=%s&sysparm_fields=sys_id,sys_class_name,name,ip_address&sysparm_limit=1",
		r.snInstance, url.QueryEscape(ip))

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return unknownCI(ip)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		r.logger.Debug("SN CI lookup failed", zap.String("ip", ip), zap.Error(err))
		return unknownCI(ip)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return unknownCI(ip)
	}

	var result struct {
		Result []struct {
			SysID string `json:"sys_id"`
			Class string `json:"sys_class_name"`
			Name  string `json:"name"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || len(result.Result) == 0 {
		return unknownCI(ip)
	}

	return &CIInfo{
		SysID:   result.Result[0].SysID,
		Class:   result.Result[0].Class,
		Name:    result.Result[0].Name,
		IPAddr:  ip,
		IsKnown: true,
	}
}

// unknownCI generates a placeholder for hosts not found in CMDB (shadow IT).
func unknownCI(ip string) *CIInfo {
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(ip)))[:12]
	return &CIInfo{
		SysID:   fmt.Sprintf("pf_unknown_%s", hash),
		Class:   "cmdb_ci",
		Name:    ip,
		IPAddr:  ip,
		IsKnown: false,
	}
}

// CacheStats returns current cache statistics.
func (r *Resolver) CacheStats() (total, known, unknown int) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, info := range r.cache {
		total++
		if info.IsKnown {
			known++
		} else {
			unknown++
		}
	}
	return
}
