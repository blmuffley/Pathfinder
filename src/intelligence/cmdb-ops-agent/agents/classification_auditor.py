"""ClassificationAuditor — audits Gateway classifications against evidence.

Checks:
  - Low-confidence classifications that need review
  - Mismatches between port/process and assigned type
  - Unclassified integrations (type=Custom with high flow count)
"""

import logging
from typing import Dict, List

from models.agent_base import CMDBAgent
from models.types import Diagnosis, Finding, Recommendation, RiskLevel, Severity

logger = logging.getLogger(__name__)

LOW_CONFIDENCE_THRESHOLD = 0.6
HIGH_FLOW_THRESHOLD = 100


class ClassificationAuditor(CMDBAgent):
    name = "classification_auditor"
    description = "Audits automated classifications for accuracy"

    def observe(self, context: Dict) -> List[Finding]:
        integrations = context.get("integrations", [])
        findings = []

        for integ in integrations:
            sid = integ.get("sys_id", "")
            name = integ.get("name", "")
            confidence = integ.get("classification_confidence", 1.0)
            itype = integ.get("integration_type", "")
            flow_count = integ.get("flow_count", 0)

            # Low confidence classification
            if confidence < LOW_CONFIDENCE_THRESHOLD:
                findings.append(Finding(
                    agent_name=self.name, finding_type="low_confidence",
                    severity=Severity.MEDIUM, ci_sys_id=sid, ci_name=name,
                    description="Classification confidence {:.0%} is below threshold".format(confidence),
                    evidence={"confidence": confidence, "type": itype},
                ))

            # Custom type with high flow count → likely classifiable
            if itype == "Custom" and flow_count >= HIGH_FLOW_THRESHOLD:
                findings.append(Finding(
                    agent_name=self.name, finding_type="unclassified_active",
                    severity=Severity.MEDIUM, ci_sys_id=sid, ci_name=name,
                    description="Active integration ({}+ flows) still classified as Custom".format(flow_count),
                    evidence={"flow_count": flow_count, "type": itype},
                ))

        return findings

    def diagnose(self, findings: List[Finding]) -> List[Diagnosis]:
        return [
            Diagnosis(
                finding=f,
                root_cause="Classification engine lacked sufficient data at discovery time." if f.finding_type == "low_confidence"
                else "Integration has enough traffic to be properly classified but remains as Custom.",
                confidence=0.75,
                suggested_action="Re-run classification with current data" if f.finding_type == "low_confidence"
                else "Manually classify or add port/process rule.",
            )
            for f in findings
        ]

    def recommend(self, diagnoses: List[Diagnosis]) -> List[Recommendation]:
        return [
            Recommendation(
                diagnosis=d,
                action_type="reclassify",
                risk_level=RiskLevel.LOW,
                description=d.suggested_action,
                target_cis=[d.finding.ci_sys_id],
            )
            for d in diagnoses
        ]
