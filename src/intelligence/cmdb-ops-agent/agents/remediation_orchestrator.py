"""RemediationOrchestrator — meta-agent coordinating all other agents.

Responsibilities:
  - Resolves conflicts between agents (e.g., duplicate + stale on same CI)
  - Batches actions to avoid overwhelming ServiceNow
  - Prioritizes actions by severity and risk
  - Enforces global guardrails (max CIs per run, cooldown)
"""

import logging
from typing import Dict, List

from models.agent_base import CMDBAgent
from models.types import (
    Action,
    ActionStatus,
    AgentRunResult,
    Diagnosis,
    Finding,
    Recommendation,
    RiskLevel,
    Severity,
    VerificationResult,
)

logger = logging.getLogger(__name__)

SEVERITY_PRIORITY = {
    Severity.CRITICAL: 0,
    Severity.HIGH: 1,
    Severity.MEDIUM: 2,
    Severity.LOW: 3,
    Severity.INFO: 4,
}

RISK_PRIORITY = {
    RiskLevel.HIGH: 0,
    RiskLevel.MEDIUM: 1,
    RiskLevel.LOW: 2,
}


class RemediationOrchestrator(CMDBAgent):
    name = "remediation_orchestrator"
    description = "Meta-agent: coordinates, deconflicts, and batches actions from all agents"

    def observe(self, context: Dict) -> List[Finding]:
        """Collect all agent run results and extract pending recommendations."""
        agent_results = context.get("agent_results", [])  # type: List[AgentRunResult]
        findings = []

        for result in agent_results:
            for rec in result.recommendations:
                findings.append(Finding(
                    agent_name=self.name,
                    finding_type="pending_recommendation",
                    severity=rec.diagnosis.finding.severity,
                    ci_sys_id=rec.diagnosis.finding.ci_sys_id,
                    ci_name=rec.diagnosis.finding.ci_name,
                    description="[{}] {}".format(result.agent_name, rec.description),
                    evidence={
                        "source_agent": result.agent_name,
                        "action_type": rec.action_type,
                        "risk_level": rec.risk_level.value,
                        "target_cis": rec.target_cis,
                    },
                ))

        return findings

    def diagnose(self, findings: List[Finding]) -> List[Diagnosis]:
        """Deconflict: if multiple agents target the same CI, pick highest priority."""
        ci_findings = {}  # type: Dict[str, List[Finding]]
        for f in findings:
            ci_findings.setdefault(f.ci_sys_id, []).append(f)

        diagnoses = []
        for ci_id, ci_group in ci_findings.items():
            if len(ci_group) == 1:
                # No conflict
                f = ci_group[0]
                diagnoses.append(Diagnosis(
                    finding=f,
                    root_cause=f.description,
                    confidence=0.9,
                    suggested_action=f.evidence.get("action_type", "review"),
                ))
            else:
                # Conflict: pick highest severity
                sorted_group = sorted(ci_group, key=lambda x: SEVERITY_PRIORITY.get(x.severity, 9))
                winner = sorted_group[0]
                others = [f.evidence.get("source_agent", "?") for f in sorted_group[1:]]

                diagnoses.append(Diagnosis(
                    finding=winner,
                    root_cause="Multiple agents flagged this CI. Prioritizing {} over {}.".format(
                        winner.evidence.get("source_agent", "?"), ", ".join(others)
                    ),
                    confidence=0.85,
                    related_cis=[f.ci_sys_id for f in sorted_group[1:]],
                    suggested_action=winner.evidence.get("action_type", "review"),
                ))

        return diagnoses

    def recommend(self, diagnoses: List[Diagnosis]) -> List[Recommendation]:
        """Sort by risk (low risk first) and batch."""
        recommendations = []
        for d in diagnoses:
            risk = RiskLevel(d.finding.evidence.get("risk_level", "low"))
            recommendations.append(Recommendation(
                diagnosis=d,
                action_type=d.suggested_action,
                risk_level=risk,
                description=d.root_cause,
                target_cis=d.finding.evidence.get("target_cis", [d.finding.ci_sys_id]),
            ))

        # Sort: low risk first, then by severity
        recommendations.sort(key=lambda r: (
            RISK_PRIORITY.get(r.risk_level, 9),
            SEVERITY_PRIORITY.get(r.diagnosis.finding.severity, 9),
        ))

        return recommendations
