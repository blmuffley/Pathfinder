"""Tests for all Service Map Intelligence services."""

import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.coverage_analyzer import analyze_coverage
from services.risk_scorer import score_application_risk, score_all_applications
from services.change_impact import analyze_change_impact, build_integration_graph
from services.health_analytics import compute_health_summary, find_health_outliers


# --- Coverage Analyzer ---

def test_coverage_full():
    """All servers covered → 100% coverage."""
    servers = [{"sys_id": "s1", "name": "srv1", "environment": "production"}]
    agents = [{"agent_id": "a1", "server_id": "s1", "status": "Active", "coverage_tier": 2,
               "last_heartbeat": datetime.now(timezone.utc).isoformat()}]
    result = analyze_coverage(servers, agents)
    assert result["coverage_percent"] == 100.0
    assert result["gap_count"] == 0


def test_coverage_no_agent():
    """Server without agent → NoAgent gap."""
    servers = [
        {"sys_id": "s1", "name": "srv1", "environment": "production", "is_critical": True},
    ]
    agents = []
    result = analyze_coverage(servers, agents)
    assert result["coverage_percent"] == 0.0
    assert result["gap_count"] == 1
    assert result["gaps"][0]["gap_type"] == "NoAgent"
    assert result["gaps"][0]["priority"] == "Critical"


def test_coverage_stale_agent():
    """Agent with old heartbeat → StaleAgent gap."""
    old_hb = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
    servers = [{"sys_id": "s1", "name": "srv1", "environment": "production"}]
    agents = [{"agent_id": "a1", "server_id": "s1", "status": "Active",
               "coverage_tier": 2, "last_heartbeat": old_hb}]
    result = analyze_coverage(servers, agents)
    assert result["gaps_by_type"]["StaleAgent"] == 1


def test_coverage_wrong_tier():
    """Agent with lower tier → WrongTier gap."""
    now = datetime.now(timezone.utc).isoformat()
    servers = [{"sys_id": "s1", "name": "srv1", "environment": "production"}]
    agents = [{"agent_id": "a1", "server_id": "s1", "status": "Active",
               "coverage_tier": 1, "last_heartbeat": now}]
    result = analyze_coverage(servers, agents, required_tier=3)
    assert result["gaps_by_type"]["WrongTier"] == 1


def test_coverage_priority_rules():
    """Verify priority assignment based on environment/criticality."""
    servers = [
        {"sys_id": "s1", "name": "prod-critical", "environment": "production", "is_critical": True, "integration_count": 0},
        {"sys_id": "s2", "name": "prod-busy", "environment": "production", "is_critical": False, "integration_count": 10},
        {"sys_id": "s3", "name": "prod-quiet", "environment": "production", "is_critical": False, "integration_count": 2},
        {"sys_id": "s4", "name": "dev-server", "environment": "development", "is_critical": False, "integration_count": 0},
    ]
    agents = []
    result = analyze_coverage(servers, agents)
    priorities = {g["server_name"]: g["priority"] for g in result["gaps"]}
    assert priorities["prod-critical"] == "Critical"
    assert priorities["prod-busy"] == "High"
    assert priorities["prod-quiet"] == "Medium"
    assert priorities["dev-server"] == "Low"


# --- Risk Scorer ---

def test_risk_low():
    """Healthy app with good coverage → low risk."""
    result = score_application_risk(
        "Healthy App",
        integrations=[{"health_score": 95}, {"health_score": 90}],
        coverage_gaps=0, total_servers=10, criticality="Low",
    )
    assert result["risk_level"] == "Low"
    assert result["overall_risk"] < 30


def test_risk_critical():
    """Unhealthy critical app → high risk."""
    result = score_application_risk(
        "Critical App",
        integrations=[{"health_score": 20}, {"health_score": 15}, {"health_score": 10}] * 5,
        coverage_gaps=5, total_servers=10, criticality="Critical",
    )
    assert result["risk_level"] in ("Critical", "High")
    assert result["overall_risk"] >= 60


def test_risk_all_apps():
    """Score all apps and verify sorted by risk."""
    apps = [
        {"app_name": "Safe", "integrations": [{"health_score": 95}], "criticality": "Low"},
        {"app_name": "Risky", "integrations": [{"health_score": 10}] * 10, "coverage_gaps": 3, "total_servers": 5, "criticality": "Critical"},
    ]
    result = score_all_applications(apps)
    assert result["applications"][0]["app_name"] == "Risky"  # Highest risk first


# --- Change Impact ---

def test_impact_direct():
    """Direct integrations should appear in direct_impacts."""
    integrations = [
        {"name": "A → B", "source_app": "A", "target_app": "B", "integration_type": "API", "criticality": "High"},
        {"name": "A → C", "source_app": "A", "target_app": "C", "integration_type": "Database", "criticality": "Medium"},
    ]
    result = analyze_change_impact("A", "Upgrade v2", integrations)
    assert result["direct_impact_count"] == 2
    assert result["indirect_impact_count"] == 0


def test_impact_transitive():
    """2-hop traversal should find indirect impacts."""
    integrations = [
        {"name": "A → B", "source_app": "A", "target_app": "B", "integration_type": "API"},
        {"name": "B → C", "source_app": "B", "target_app": "C", "integration_type": "Database"},
        {"name": "C → D", "source_app": "C", "target_app": "D", "integration_type": "Messaging"},
    ]
    result = analyze_change_impact("A", "Migration", integrations, max_hops=2)
    assert result["direct_impact_count"] >= 1  # A→B
    assert result["indirect_impact_count"] >= 1  # B→C (via B)
    assert result["total_affected"] >= 2


def test_impact_isolated():
    """App with no integrations → no impact."""
    integrations = [
        {"name": "X → Y", "source_app": "X", "target_app": "Y"},
    ]
    result = analyze_change_impact("Z", "Whatever", integrations)
    assert result["total_affected"] == 0


def test_graph_build():
    """Integration graph should have bidirectional adjacency."""
    integrations = [
        {"source_app": "A", "target_app": "B"},
    ]
    graph = build_integration_graph(integrations)
    assert "A" in graph
    assert "B" in graph


# --- Health Analytics ---

def test_health_summary():
    integrations = [
        {"health_score": 90, "health_status": "Healthy"},
        {"health_score": 70, "health_status": "Degraded"},
        {"health_score": 40, "health_status": "Critical"},
        {"health_status": "Unknown"},
    ]
    result = compute_health_summary(integrations)
    assert result["total_integrations"] == 4
    assert result["scored_integrations"] == 3
    assert result["health_distribution"]["Healthy"] == 1
    assert result["health_distribution"]["Critical"] == 1


def test_health_outliers():
    integrations = [
        {"name": "Good", "sys_id": "1", "health_score": 90, "health_status": "Healthy"},
        {"name": "Bad", "sys_id": "2", "health_score": 30, "health_status": "Critical"},
        {"name": "Terrible", "sys_id": "3", "health_score": 10, "health_status": "Critical"},
    ]
    outliers = find_health_outliers(integrations, score_threshold=40)
    assert len(outliers) == 2
    assert outliers[0]["name"] == "Terrible"  # Sorted by score ascending


def test_health_trend_stable():
    integrations = [{"health_score": 80, "health_status": "Healthy"} for _ in range(20)]
    result = compute_health_summary(integrations)
    assert result["trend"] == "stable"
