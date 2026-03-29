"""Tests for the FastAPI endpoints (anomaly detection — no Claude API key required)."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_anomaly_endpoint():
    """POST /api/v1/anomaly should detect spikes."""
    import random
    random.seed(42)
    series = [{"timestamp": "2026-03-{:02d}T00:00:00Z".format(i + 1), "value": 10.0 + random.gauss(0, 1)} for i in range(25)]
    series.append({"timestamp": "2026-03-26T00:00:00Z", "value": 100.0})

    resp = client.post(
        "/api/v1/anomaly",
        json={
            "metric_name": "latency_ms",
            "series": series,
            "z_threshold": 2.0,
            "window_size": 20,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_anomalies"] is True
    assert data["anomaly_count"] >= 1
    # At least one anomaly should be the 100.0 spike
    spike_found = any(a["value"] > 50.0 for a in data["anomalies"])
    assert spike_found, "Expected to find the 100.0 spike"


def test_anomaly_no_anomalies():
    """Stable series should return no anomalies."""
    series = [{"timestamp": f"2026-03-{i + 1:02d}T00:00:00Z", "value": 50.0} for i in range(30)]

    resp = client.post(
        "/api/v1/anomaly",
        json={"metric_name": "availability", "series": series},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_anomalies"] is False
    assert data["anomaly_count"] == 0


def test_anomaly_validation_short_series():
    """Series with fewer than 3 points should fail validation."""
    resp = client.post(
        "/api/v1/anomaly",
        json={
            "metric_name": "test",
            "series": [{"timestamp": "2026-03-01T00:00:00Z", "value": 10.0}],
        },
    )
    assert resp.status_code == 422  # Pydantic validation error


def test_usage_endpoint():
    """GET /api/v1/usage should return token stats."""
    resp = client.get("/api/v1/usage")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_tokens" in data
    assert "total_input_tokens" in data


def test_analyze_without_api_key():
    """POST /api/v1/analyze should fail gracefully without ANTHROPIC_API_KEY."""
    resp = client.post(
        "/api/v1/analyze",
        json={
            "analysis_type": "summarize",
            "integration": {
                "source_app": "app-a",
                "target_app": "app-b",
                "integration_type": "API",
            },
        },
    )
    # Without API key, should return an error (not 200)
    # Could be 500 (TypeError from SDK), 502, or 503
    assert resp.status_code >= 400
