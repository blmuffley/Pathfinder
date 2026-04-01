package sgc

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/blmuffley/Pathfinder/src/gateway/internal/store"
)

// ExportConfig holds configuration for the SGC export HTTP handler.
type ExportConfig struct {
	RateLimitPerMin int `yaml:"rate_limit_per_min"`
	MaxPageSize     int `yaml:"max_page_size"`
	DefaultPageSize int `yaml:"default_page_size"`
}

// ExportHandler serves IRE-formatted payloads for ServiceNow scheduled imports.
type ExportHandler struct {
	store  *store.Store
	config ExportConfig
	logger *zap.Logger

	// Simple sliding-window rate limiter.
	mu          sync.Mutex
	requestLog  []time.Time
}

// NewExportHandler creates an HTTP handler for the SGC export API.
func NewExportHandler(s *store.Store, cfg ExportConfig, logger *zap.Logger) *ExportHandler {
	if cfg.RateLimitPerMin <= 0 {
		cfg.RateLimitPerMin = 60
	}
	if cfg.MaxPageSize <= 0 {
		cfg.MaxPageSize = 1000
	}
	if cfg.DefaultPageSize <= 0 {
		cfg.DefaultPageSize = 100
	}

	return &ExportHandler{
		store:      s,
		config:     cfg,
		logger:     logger,
		requestLog: make([]time.Time, 0, cfg.RateLimitPerMin),
	}
}

// RegisterRoutes attaches the SGC export endpoints to the given ServeMux.
func (h *ExportHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/sgc/export", h.handleExport)
	mux.HandleFunc("/api/v1/sgc/ack", h.handleAck)
}

// ExportResponse is the JSON envelope returned by GET /api/v1/sgc/export.
type ExportResponse struct {
	Payload    *IREPayload `json:"payload"`
	NextCursor string      `json:"next_cursor,omitempty"`
	HasMore    bool        `json:"has_more"`
	Count      int         `json:"count"`
	ExportedAt string      `json:"exported_at"`
}

// AckRequest is the JSON body expected by POST /api/v1/sgc/ack.
type AckRequest struct {
	RecordIDs  []string `json:"record_ids"`
	EntityType string   `json:"entity_type"`
	SysIDs     []string `json:"sys_ids,omitempty"`
}

// AckResponse is the JSON body returned by POST /api/v1/sgc/ack.
type AckResponse struct {
	Acknowledged int    `json:"acknowledged"`
	Status       string `json:"status"`
}

// handleExport serves GET /api/v1/sgc/export?since={timestamp}&type={ci_type}&limit={n}&cursor={cursor}.
func (h *ExportHandler) handleExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	if !h.checkRateLimit() {
		w.Header().Set("Retry-After", "60")
		http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
		return
	}

	q := r.URL.Query()

	// Parse "since" timestamp (RFC3339 or Unix seconds).
	sinceStr := q.Get("since")
	var since time.Time
	if sinceStr != "" {
		var err error
		since, err = time.Parse(time.RFC3339, sinceStr)
		if err != nil {
			// Try Unix timestamp.
			if ts, parseErr := strconv.ParseInt(sinceStr, 10, 64); parseErr == nil {
				since = time.Unix(ts, 0)
			} else {
				jsonError(w, http.StatusBadRequest, "invalid 'since' parameter: use RFC3339 or Unix timestamp")
				return
			}
		}
	}

	// Parse CI type filter.
	ciType := q.Get("type")

	// Parse limit with bounds.
	limit := h.config.DefaultPageSize
	if limitStr := q.Get("limit"); limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > h.config.MaxPageSize {
		limit = h.config.MaxPageSize
	}

	// Parse cursor for pagination.
	cursor := q.Get("cursor")

	h.logger.Info("SGC export request",
		zap.Time("since", since),
		zap.String("type", ciType),
		zap.Int("limit", limit),
		zap.String("cursor", cursor),
	)

	// Fetch records from store.
	records, nextCursor, err := h.store.GetSGCExportRecords(r.Context(), ciType, since, limit, cursor)
	if err != nil {
		h.logger.Error("failed to get export records", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, "internal error fetching records")
		return
	}

	// Build the IRE payload from fetched records.
	payload := &IREPayload{
		Items:     make([]IREItem, 0),
		Relations: make([]IRERelation, 0),
	}

	for _, rec := range records {
		recType, _ := rec["record_type"].(string)
		switch recType {
		case "server":
			agent := mapToAgentRecord(rec)
			payload.Items = append(payload.Items, ServerToIREItem(agent))
		case "app_instance":
			app := mapToAppRecord(rec)
			payload.Items = append(payload.Items, AppInstanceToIREItem(app))
		case "integration":
			integ := mapToIntegrationRecord(rec)
			payload.Relations = append(payload.Relations, IntegrationToIRERelation(integ))
		case "cloud_service":
			svc := mapToCloudServiceRecord(rec)
			payload.Items = append(payload.Items, CloudServiceToIREItem(svc))
		case "medical_device":
			dev := mapToMedicalDeviceRecord(rec)
			payload.Items = append(payload.Items, MedicalDeviceToIREItem(dev))
		}
	}

	resp := ExportResponse{
		Payload:    payload,
		NextCursor: nextCursor,
		HasMore:    nextCursor != "",
		Count:      len(payload.Items) + len(payload.Relations),
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		h.logger.Error("failed to encode export response", zap.Error(err))
	}
}

// handleAck handles POST /api/v1/sgc/ack to mark records as synced.
func (h *ExportHandler) handleAck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	if !h.checkRateLimit() {
		w.Header().Set("Retry-After", "60")
		http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
		return
	}

	var req AckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	if len(req.RecordIDs) == 0 {
		jsonError(w, http.StatusBadRequest, "record_ids is required")
		return
	}
	if req.EntityType == "" {
		jsonError(w, http.StatusBadRequest, "entity_type is required")
		return
	}

	h.logger.Info("SGC ack request",
		zap.String("entity_type", req.EntityType),
		zap.Int("count", len(req.RecordIDs)),
	)

	acked := 0
	for i, id := range req.RecordIDs {
		sysID := ""
		if i < len(req.SysIDs) {
			sysID = req.SysIDs[i]
		}
		if err := h.store.MarkSGCRecordSynced(r.Context(), req.EntityType, id, sysID); err != nil {
			h.logger.Error("failed to ack record",
				zap.String("id", id),
				zap.Error(err),
			)
			continue
		}
		acked++
	}

	resp := AckResponse{
		Acknowledged: acked,
		Status:       "ok",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// checkRateLimit returns true if the request is within the configured rate limit.
func (h *ExportHandler) checkRateLimit() bool {
	h.mu.Lock()
	defer h.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-1 * time.Minute)

	// Prune old entries.
	valid := h.requestLog[:0]
	for _, t := range h.requestLog {
		if t.After(windowStart) {
			valid = append(valid, t)
		}
	}
	h.requestLog = valid

	if len(h.requestLog) >= h.config.RateLimitPerMin {
		return false
	}

	h.requestLog = append(h.requestLog, now)
	return true
}

// jsonError writes a JSON error response.
func jsonError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
