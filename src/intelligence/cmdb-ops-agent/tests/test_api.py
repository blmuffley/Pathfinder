"""Tests for the CMDB Ops Agent API endpoints."""

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
    assert len(data["agents"]) == 8


def test_list_agents():
    resp = client.get("/api/v1/agents")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["agents"]) == 8
    names = [a["name"] for a in data["agents"]]
    assert "duplicate_detector" in names
    assert "remediation_orchestrator" in names


def test_run_single_agent():
    resp = client.post("/api/v1/run", json={
        "agent_name": "duplicate_detector",
        "autonomy_level": 1,
        "dry_run": True,
        "context": {
            "integrations": [
                {"sys_id": "1", "name": "A → B", "source_ci": "a", "target_ci": "b"},
                {"sys_id": "2", "name": "A → B dup", "source_ci": "a", "target_ci": "b"},
            ]
        },
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["agent_name"] == "duplicate_detector"
    assert data["findings_count"] >= 1


def test_run_unknown_agent():
    resp = client.post("/api/v1/run", json={
        "agent_name": "nonexistent",
        "context": {},
    })
    assert resp.status_code == 404


def test_run_all():
    resp = client.post("/api/v1/run-all", json={
        "autonomy_level": 0,
        "dry_run": True,
        "context": {
            "integrations": [
                {"sys_id": "1", "name": "A → B", "source_ci": "a", "target_ci": "b",
                 "classification_confidence": 0.9, "integration_type": "API", "flow_count": 50,
                 "owner": "user1", "support_group": "grp1", "data_classification": "Internal",
                 "last_observed": "2026-03-28T00:00:00Z", "health_metrics": []},
            ],
            "valid_ci_ids": ["a", "b"],
        },
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_agents"] == 8  # 7 agents + orchestrator
