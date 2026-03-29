// Package enrichment provides Kubernetes API enrichment for captured flows.
// Maps pod IPs → pod name, namespace, service, deployment, labels.
package enrichment

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
)

// PodInfo holds enriched Kubernetes metadata for a pod.
type PodInfo struct {
	Name       string
	Namespace  string
	PodIP      string
	NodeName   string
	Service    string
	Deployment string
	Labels     map[string]string
}

// Enricher resolves pod IPs to Kubernetes metadata using the K8s API.
type Enricher struct {
	apiHost    string
	token      string
	httpClient *http.Client
	logger     *zap.Logger

	mu    sync.RWMutex
	cache map[string]*PodInfo // podIP → PodInfo
}

// NewEnricher creates a K8s enricher. Auto-detects in-cluster config.
func NewEnricher(logger *zap.Logger) *Enricher {
	host := os.Getenv("KUBERNETES_SERVICE_HOST")
	port := os.Getenv("KUBERNETES_SERVICE_PORT")
	if host == "" {
		host = "kubernetes.default.svc"
		port = "443"
	}

	token := ""
	if data, err := os.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token"); err == nil {
		token = strings.TrimSpace(string(data))
	}

	return &Enricher{
		apiHost:    fmt.Sprintf("https://%s:%s", host, port),
		token:      token,
		httpClient: &http.Client{Timeout: 10 * time.Second},
		logger:     logger,
		cache:      make(map[string]*PodInfo),
	}
}

// Lookup returns enriched metadata for a pod IP. Uses cache.
func (e *Enricher) Lookup(podIP string) *PodInfo {
	e.mu.RLock()
	info, ok := e.cache[podIP]
	e.mu.RUnlock()
	if ok {
		return info
	}
	return nil
}

// RefreshCache fetches all pods and rebuilds the IP→PodInfo cache.
func (e *Enricher) RefreshCache(ctx context.Context) error {
	pods, err := e.listPods(ctx)
	if err != nil {
		return err
	}

	newCache := make(map[string]*PodInfo, len(pods))
	for _, p := range pods {
		if p.PodIP != "" {
			newCache[p.PodIP] = &p
		}
	}

	e.mu.Lock()
	e.cache = newCache
	e.mu.Unlock()

	e.logger.Info("K8s pod cache refreshed", zap.Int("pods", len(newCache)))
	return nil
}

// RunCacheRefresh periodically refreshes the pod cache.
func (e *Enricher) RunCacheRefresh(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Initial refresh
	if err := e.RefreshCache(ctx); err != nil {
		e.logger.Error("initial pod cache refresh failed", zap.Error(err))
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := e.RefreshCache(ctx); err != nil {
				e.logger.Error("pod cache refresh failed", zap.Error(err))
			}
		}
	}
}

// EnrichProcessName enhances the process name with K8s context.
func (e *Enricher) EnrichProcessName(srcIP, processName string) string {
	info := e.Lookup(srcIP)
	if info == nil {
		return processName
	}
	// Format: process@pod.namespace (deployment)
	name := processName
	if info.Name != "" {
		name = fmt.Sprintf("%s@%s.%s", processName, info.Name, info.Namespace)
	}
	if info.Deployment != "" {
		name += fmt.Sprintf(" (%s)", info.Deployment)
	}
	return name
}

// listPods fetches pods from the K8s API. Simplified — real impl would use client-go.
func (e *Enricher) listPods(ctx context.Context) ([]PodInfo, error) {
	url := e.apiHost + "/api/v1/pods?limit=500"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	if e.token != "" {
		req.Header.Set("Authorization", "Bearer "+e.token)
	}

	resp, err := e.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("k8s api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("k8s api %d: %s", resp.StatusCode, string(body)[:200])
	}

	var podList struct {
		Items []struct {
			Metadata struct {
				Name      string            `json:"name"`
				Namespace string            `json:"namespace"`
				Labels    map[string]string  `json:"labels"`
				OwnerReferences []struct {
					Kind string `json:"kind"`
					Name string `json:"name"`
				} `json:"ownerReferences"`
			} `json:"metadata"`
			Spec struct {
				NodeName string `json:"nodeName"`
			} `json:"spec"`
			Status struct {
				PodIP string `json:"podIP"`
			} `json:"status"`
		} `json:"items"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&podList); err != nil {
		return nil, fmt.Errorf("decode pods: %w", err)
	}

	pods := make([]PodInfo, 0, len(podList.Items))
	for _, item := range podList.Items {
		deploy := ""
		for _, owner := range item.Metadata.OwnerReferences {
			if owner.Kind == "ReplicaSet" {
				// Strip ReplicaSet suffix to get Deployment name
				parts := strings.Split(owner.Name, "-")
				if len(parts) > 1 {
					deploy = strings.Join(parts[:len(parts)-1], "-")
				}
			}
		}
		svc := item.Metadata.Labels["app"]
		if svc == "" {
			svc = item.Metadata.Labels["app.kubernetes.io/name"]
		}

		pods = append(pods, PodInfo{
			Name:       item.Metadata.Name,
			Namespace:  item.Metadata.Namespace,
			PodIP:      item.Status.PodIP,
			NodeName:   item.Spec.NodeName,
			Service:    svc,
			Deployment: deploy,
			Labels:     item.Metadata.Labels,
		})
	}

	return pods, nil
}
