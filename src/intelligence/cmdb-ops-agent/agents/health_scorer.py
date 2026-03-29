"""HealthScorerAgent — continuously recomputes health scores via Integration Intelligence.

Runs on a 4-hour schedule, calls the Integration Intelligence health-score endpoint
for each integration with recent health metrics.
"""

import logging
from typing import Dict, List

from models.agent_base import CMDBAgent
from models.types import Diagnosis, Finding, Recommendation, RiskLevel, Severity

logger = logging.getLogger(__name__)


class HealthScorerAgent(CMDBAgent):
    name = "health_scorer"
    description = "Continuously recomputes health scores for all integrations"

    def observe(self, context: Dict) -> List[Finding]:
        integrations = context.get("integrations", [])
        findings = []

        for integ in integrations:
            sid = integ.get("sys_id", "")
            name = integ.get("name", "")
            current_score = integ.get("health_score")
            current_status = integ.get("health_status", "Unknown")
            metrics = integ.get("health_metrics", [])

            # Flag integrations needing score refresh
            if not metrics:
                if current_status != "Unknown":
                    findings.append(Finding(
                        agent_name=self.name, finding_type="no_metrics",
                        severity=Severity.LOW, ci_sys_id=sid, ci_name=name,
                        description="No health metrics available but status is '{}'".format(current_status),
                        evidence={"current_status": current_status},
                    ))
                continue

            # Flag integrations where score may be stale
            findings.append(Finding(
                agent_name=self.name, finding_type="score_refresh",
                severity=Severity.INFO, ci_sys_id=sid, ci_name=name,
                description="Health score refresh due ({} metrics available)".format(len(metrics)),
                evidence={"metric_count": len(metrics), "current_score": current_score},
            ))

        return findings

    def diagnose(self, findings: List[Finding]) -> List[Diagnosis]:
        return [
            Diagnosis(
                finding=f,
                root_cause="Health score needs recomputation based on latest telemetry.",
                confidence=1.0,
                suggested_action="Recompute health score via Integration Intelligence.",
            )
            for f in findings
        ]

    def recommend(self, diagnoses: List[Diagnosis]) -> List[Recommendation]:
        return [
            Recommendation(
                diagnosis=d,
                action_type="recompute_score",
                risk_level=RiskLevel.LOW,
                description="Recompute health score using current metrics",
                target_cis=[d.finding.ci_sys_id],
                requires_approval=False,
            )
            for d in diagnoses
        ]
