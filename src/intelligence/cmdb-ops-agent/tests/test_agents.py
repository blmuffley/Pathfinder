"""Tests for all 8 CMDB Ops agents."""

import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.duplicate_detector import DuplicateDetector
from agents.stale_record_reaper import StaleRecordReaper
from agents.orphan_finder import OrphanFinder
from agents.relationship_validator import RelationshipValidator
from agents.classification_auditor import ClassificationAuditor
from agents.compliance_checker import ComplianceChecker
from agents.health_scorer import HealthScorerAgent
from agents.remediation_orchestrator import RemediationOrchestrator


# --- DuplicateDetector ---

def test_duplicate_exact():
    agent = DuplicateDetector(autonomy_level=1)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "A → B", "source_ci": "ci_a", "target_ci": "ci_b"},
        {"sys_id": "2", "name": "A → B dup", "source_ci": "ci_a", "target_ci": "ci_b"},
    ]}
    result = agent.run(ctx)
    assert result.findings_count >= 1
    assert any(f.finding_type == "exact_duplicate" for f in result.findings)


def test_duplicate_reverse():
    agent = DuplicateDetector(autonomy_level=1)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "A → B", "source_ci": "ci_a", "target_ci": "ci_b"},
        {"sys_id": "2", "name": "B → A", "source_ci": "ci_b", "target_ci": "ci_a"},
    ]}
    result = agent.run(ctx)
    assert any(f.finding_type == "reverse_duplicate" for f in result.findings)


def test_duplicate_no_findings():
    agent = DuplicateDetector(autonomy_level=0)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "Order Service → Payment Gateway", "source_ci": "ci_a", "target_ci": "ci_b"},
        {"sys_id": "2", "name": "Inventory Manager → Shipping Platform", "source_ci": "ci_c", "target_ci": "ci_d"},
    ]}
    result = agent.run(ctx)
    assert result.findings_count == 0


# --- StaleRecordReaper ---

def test_stale_expired():
    agent = StaleRecordReaper(autonomy_level=1)
    old_date = (datetime.now(timezone.utc) - timedelta(days=400)).isoformat()
    ctx = {"integrations": [
        {"sys_id": "1", "name": "Old CI", "last_observed": old_date},
    ]}
    result = agent.run(ctx)
    assert result.findings_count == 1
    assert result.findings[0].finding_type == "expired"


def test_stale_warning():
    agent = StaleRecordReaper(autonomy_level=1)
    date = (datetime.now(timezone.utc) - timedelta(days=100)).isoformat()
    ctx = {"integrations": [
        {"sys_id": "1", "name": "Aging CI", "last_observed": date},
    ]}
    result = agent.run(ctx)
    assert result.findings_count == 1
    assert result.findings[0].finding_type == "warning"


def test_stale_fresh():
    agent = StaleRecordReaper(autonomy_level=1)
    now = datetime.now(timezone.utc).isoformat()
    ctx = {"integrations": [
        {"sys_id": "1", "name": "Fresh CI", "last_observed": now},
    ]}
    result = agent.run(ctx)
    assert result.findings_count == 0


# --- OrphanFinder ---

def test_orphan_missing_source():
    agent = OrphanFinder(autonomy_level=1)
    ctx = {
        "integrations": [
            {"sys_id": "1", "name": "Test", "source_ci": "missing_ci", "target_ci": "ci_b"},
        ],
        "valid_ci_ids": ["ci_b", "ci_c"],
    }
    result = agent.run(ctx)
    assert result.findings_count == 1
    assert result.findings[0].finding_type == "orphan_source"


def test_orphan_all_valid():
    agent = OrphanFinder(autonomy_level=1)
    ctx = {
        "integrations": [
            {"sys_id": "1", "name": "Test", "source_ci": "ci_a", "target_ci": "ci_b"},
        ],
        "valid_ci_ids": ["ci_a", "ci_b"],
    }
    result = agent.run(ctx)
    assert result.findings_count == 0


# --- RelationshipValidator ---

def test_self_reference():
    agent = RelationshipValidator(autonomy_level=1)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "Self", "source_ci": "ci_x", "target_ci": "ci_x"},
    ]}
    result = agent.run(ctx)
    assert any(f.finding_type == "self_reference" for f in result.findings)


# --- ClassificationAuditor ---

def test_low_confidence():
    agent = ClassificationAuditor(autonomy_level=1)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "Test", "classification_confidence": 0.3, "integration_type": "API", "flow_count": 10},
    ]}
    result = agent.run(ctx)
    assert any(f.finding_type == "low_confidence" for f in result.findings)


def test_unclassified_active():
    agent = ClassificationAuditor(autonomy_level=1)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "Test", "classification_confidence": 0.9, "integration_type": "Custom", "flow_count": 500},
    ]}
    result = agent.run(ctx)
    assert any(f.finding_type == "unclassified_active" for f in result.findings)


# --- ComplianceChecker ---

def test_missing_owner():
    agent = ComplianceChecker(autonomy_level=1)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "No Owner", "owner": None, "support_group": "grp1", "data_classification": "Internal", "flow_count": 10},
    ]}
    result = agent.run(ctx)
    assert result.findings_count == 1
    assert "owner" in result.findings[0].evidence.get("missing_fields", [])


def test_compliant():
    agent = ComplianceChecker(autonomy_level=1)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "Good", "owner": "user1", "support_group": "grp1",
         "data_classification": "Internal", "criticality": "High", "flow_count": 10},
    ]}
    result = agent.run(ctx)
    assert result.findings_count == 0


# --- HealthScorer ---

def test_health_scorer_refresh():
    agent = HealthScorerAgent(autonomy_level=1)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "Test", "health_score": 80, "health_status": "Healthy",
         "health_metrics": [{"metric_type": "Availability", "metric_value": 99.9}]},
    ]}
    result = agent.run(ctx)
    assert result.findings_count == 1
    assert result.findings[0].finding_type == "score_refresh"


# --- RemediationOrchestrator ---

def test_orchestrator_deconflicts():
    """Orchestrator should pick highest severity when multiple agents target same CI."""
    orch = RemediationOrchestrator(autonomy_level=1)

    from models.types import AgentRunResult, Finding, Diagnosis, Recommendation, RiskLevel, Severity

    r1 = AgentRunResult(
        agent_name="agent_a", started_at="2026-01-01T00:00:00",
        recommendations=[Recommendation(
            diagnosis=Diagnosis(
                finding=Finding(agent_name="agent_a", finding_type="test", severity=Severity.LOW,
                                ci_sys_id="ci_1", description="Low issue"),
                root_cause="test", confidence=0.5,
            ),
            action_type="review", risk_level=RiskLevel.LOW, description="Low priority",
            target_cis=["ci_1"],
        )],
    )
    r2 = AgentRunResult(
        agent_name="agent_b", started_at="2026-01-01T00:00:00",
        recommendations=[Recommendation(
            diagnosis=Diagnosis(
                finding=Finding(agent_name="agent_b", finding_type="test", severity=Severity.HIGH,
                                ci_sys_id="ci_1", description="High issue"),
                root_cause="test", confidence=0.9,
            ),
            action_type="merge", risk_level=RiskLevel.MEDIUM, description="High priority",
            target_cis=["ci_1"],
        )],
    )

    ctx = {"agent_results": [r1, r2]}
    result = orch.run(ctx)

    # Should have 1 recommendation (deconflicted), not 2
    assert result.recommendations_count == 1


# --- Autonomy levels ---

def test_autonomy_level_0():
    """Level 0 should only observe and diagnose."""
    agent = DuplicateDetector(autonomy_level=0)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "A", "source_ci": "a", "target_ci": "b"},
        {"sys_id": "2", "name": "A dup", "source_ci": "a", "target_ci": "b"},
    ]}
    result = agent.run(ctx)
    assert result.findings_count >= 1
    assert result.diagnoses_count >= 1
    assert result.recommendations_count == 0


def test_autonomy_level_1():
    """Level 1 should observe, diagnose, and recommend."""
    agent = DuplicateDetector(autonomy_level=1)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "A", "source_ci": "a", "target_ci": "b"},
        {"sys_id": "2", "name": "A dup", "source_ci": "a", "target_ci": "b"},
    ]}
    result = agent.run(ctx)
    assert result.recommendations_count >= 1
    assert result.actions_count == 0  # Level 1 doesn't act


def test_dry_run():
    """Dry run should skip act and verify."""
    agent = DuplicateDetector(autonomy_level=3, dry_run=True)
    ctx = {"integrations": [
        {"sys_id": "1", "name": "A", "source_ci": "a", "target_ci": "b"},
        {"sys_id": "2", "name": "A dup", "source_ci": "a", "target_ci": "b"},
    ]}
    result = agent.run(ctx)
    assert result.recommendations_count >= 1
    assert result.actions_count == 0  # Dry run
