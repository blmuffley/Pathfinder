"""Tests for the Integration Intelligence API endpoints."""

import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_health_score_endpoint():
    now = datetime.now(timezone.utc).isoformat()
    resp = client.post(
        "/api/v1/health-score",
        json={
            "metrics": [
                {"metric_type": "Availability", "metric_value": 99.95},
                {"metric_type": "Latency", "metric_value": 80.0},
                {"metric_type": "ErrorRate", "metric_value": 0.05},
            ],
            "last_observed": now,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] >= 80
    assert data["status"] == "Healthy"
    assert "availability_score" in data
    assert "explanation" in data


def test_health_score_empty():
    resp = client.post(
        "/api/v1/health-score",
        json={"metrics": []},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "Unknown"


def test_reconcile_endpoint():
    resp = client.post(
        "/api/v1/reconcile",
        json={
            "integrations": [
                {"source_app": "App A", "target_app": "App B", "source_ci": "ci_a", "target_ci": "ci_b"},
            ],
            "ea_relationships": [
                {"parent": "ci_a", "child": "ci_b", "parent_name": "App A", "child_name": "App B", "sys_id": "ea_1"},
            ],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_integrations"] == 1
    assert data["total_matched"] == 1


def test_duplicates_endpoint():
    resp = client.post(
        "/api/v1/duplicates",
        json={
            "integrations": [
                {"source_app": "A", "target_app": "B", "name": "A → B"},
                {"source_app": "B", "target_app": "A", "name": "B → A"},
            ],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 1
    assert data["duplicates"][0]["type"] == "bidirectional_candidate"
