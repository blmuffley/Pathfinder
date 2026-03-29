"""ComplianceChecker — ensures required fields and governance attributes are populated.

Required fields for operational integrations:
  - owner (sys_user reference)
  - support_group (sys_user_group reference)
  - criticality (must not be Unknown for high-flow integrations)
  - data_classification (required for all)
"""

import logging
from typing import Dict, List

from models.agent_base import CMDBAgent
from models.types import Diagnosis, Finding, Recommendation, RiskLevel, Severity

logger = logging.getLogger(__name__)

GOVERNANCE_FLOW_THRESHOLD = 50


class ComplianceChecker(CMDBAgent):
    name = "compliance_checker"
    description = "Ensures required governance fields are populated"

    def observe(self, context: Dict) -> List[Finding]:
        integrations = context.get("integrations", [])
        findings = []

        for integ in integrations:
            sid = integ.get("sys_id", "")
            name = integ.get("name", "")
            flow_count = integ.get("flow_count", 0)

            missing = []
            if not integ.get("owner"):
                missing.append("owner")
            if not integ.get("support_group"):
                missing.append("support_group")
            if not integ.get("data_classification"):
                missing.append("data_classification")
            if flow_count >= GOVERNANCE_FLOW_THRESHOLD and integ.get("criticality", "Unknown") == "Unknown":
                missing.append("criticality")

            if missing:
                findings.append(Finding(
                    agent_name=self.name, finding_type="missing_governance",
                    severity=Severity.MEDIUM if "owner" in missing else Severity.LOW,
                    ci_sys_id=sid, ci_name=name,
                    description="Missing governance fields: {}".format(", ".join(missing)),
                    evidence={"missing_fields": missing, "flow_count": flow_count},
                ))

        return findings

    def diagnose(self, findings: List[Finding]) -> List[Diagnosis]:
        return [
            Diagnosis(
                finding=f,
                root_cause="Integration was auto-discovered and governance fields were not populated. Manual assignment required.",
                confidence=0.95,
                suggested_action="Assign missing fields: {}".format(", ".join(f.evidence.get("missing_fields", []))),
            )
            for f in findings
        ]

    def recommend(self, diagnoses: List[Diagnosis]) -> List[Recommendation]:
        return [
            Recommendation(
                diagnosis=d,
                action_type="update",
                risk_level=RiskLevel.LOW,
                description="Populate missing governance fields: {}".format(
                    ", ".join(d.finding.evidence.get("missing_fields", []))
                ),
                target_cis=[d.finding.ci_sys_id],
                requires_approval=False,
            )
            for d in diagnoses
        ]
