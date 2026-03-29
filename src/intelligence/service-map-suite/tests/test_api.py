"""Tests for the Service Map Intelligence API endpoints."""

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


def test_coverage_endpoint():
    now = datetime.now(timezone.utc).isoformat()
    resp = client.post("/api/v1/coverage", json={
        "servers": [
            {"sys_id": "s1", "name": "srv1", "environment": "production"},
            {"sys_id": "s2", "name": "srv2", "environment": "production"},
        ],
        "agents": [
            {"agent_id": "a1", "server_id": "s1", "status": "Active", "coverage_tier": 2, "last_heartbeat": now},
        ],
        "required_tier": 2,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_servers"] == 2
    assert data["covered_servers"] == 1
    assert data["gap_count"] == 1


def test_risk_endpoint():
    resp = client.post("/api/v1/risk", json={
        "applications": [
            {"app_name": "App A", "integrations": [{"health_score": 90}], "criticality": "Low"},
            {"app_name": "App B", "integrations": [{"health_score": 20}] * 5, "coverage_gaps": 3, "total_servers": 5, "criticality": "Critical"},
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_applications"] == 2
    assert data["applications"][0]["app_name"] == "App B"  # Higher risk first


def test_change_impact_endpoint():
    resp = client.post("/api/v1/change-impact", json={
        "target_app": "OrderService",
        "change_description": "Database migration",
        "integrations": [
            {"name": "Order → Payment", "source_app": "OrderService", "target_app": "PaymentGW", "integration_type": "API", "criticality": "High"},
            {"name": "Order → Inventory", "source_app": "OrderService", "target_app": "Inventory", "integration_type": "Messaging", "criticality": "Medium"},
        ],
        "max_hops": 2,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["direct_impact_count"] == 2
    assert data["target_app"] == "OrderService"


def test_health_summary_endpoint():
    resp = client.post("/api/v1/health-summary", json={
        "integrations": [
            {"health_score": 90, "health_status": "Healthy", "name": "Good"},
            {"health_score": 30, "health_status": "Critical", "name": "Bad"},
        ],
        "outlier_threshold": 40,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_integrations"] == 2
    assert data["outlier_count"] == 1
    assert data["outliers"][0]["name"] == "Bad"
