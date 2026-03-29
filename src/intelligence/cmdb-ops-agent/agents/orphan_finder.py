"""OrphanFinder — locates Integration CIs with broken or missing relationships."""

import logging
from typing import Dict, List

from models.agent_base import CMDBAgent
from models.types import Diagnosis, Finding, Recommendation, RiskLevel, Severity

logger = logging.getLogger(__name__)


class OrphanFinder(CMDBAgent):
    name = "orphan_finder"
    description = "Locates Integration CIs with broken or missing CI references"

    def observe(self, context: Dict) -> List[Finding]:
        integrations = context.get("integrations", [])
        valid_cis = set(context.get("valid_ci_ids", []))
        findings = []

        for integ in integrations:
            sid = integ.get("sys_id", "")
            name = integ.get("name", "")
            src = integ.get("source_ci", "")
            tgt = integ.get("target_ci", "")

            if src and valid_cis and src not in valid_cis:
                findings.append(Finding(
                    agent_name=self.name, finding_type="orphan_source",
                    severity=Severity.HIGH, ci_sys_id=sid, ci_name=name,
                    description="source_ci '{}' not found in CMDB".format(src),
                    evidence={"missing_ci": src, "field": "source_ci"},
                ))

            if tgt and valid_cis and tgt not in valid_cis:
                findings.append(Finding(
                    agent_name=self.name, finding_type="orphan_target",
                    severity=Severity.HIGH, ci_sys_id=sid, ci_name=name,
                    description="target_ci '{}' not found in CMDB".format(tgt),
                    evidence={"missing_ci": tgt, "field": "target_ci"},
                ))

            # Check for interfaces with missing parent
            for iface in integ.get("interfaces", []):
                iface_integ = iface.get("integration", "")
                if iface_integ and iface_integ != sid:
                    findings.append(Finding(
                        agent_name=self.name, finding_type="orphan_interface",
                        severity=Severity.MEDIUM,
                        ci_sys_id=iface.get("sys_id", ""),
                        ci_name=iface.get("name", ""),
                        description="Interface references integration '{}' but parent is '{}'".format(iface_integ, sid),
                        evidence={"expected_parent": sid, "actual_parent": iface_integ},
                    ))

        return findings

    def diagnose(self, findings: List[Finding]) -> List[Diagnosis]:
        return [
            Diagnosis(
                finding=f,
                root_cause="Referenced CI was deleted or never existed. This creates a broken relationship in the CMDB.",
                confidence=0.90,
                suggested_action="Re-link to correct CI or retire the integration.",
            )
            for f in findings
        ]

    def recommend(self, diagnoses: List[Diagnosis]) -> List[Recommendation]:
        return [
            Recommendation(
                diagnosis=d,
                action_type="update" if d.confidence >= 0.8 else "review",
                risk_level=RiskLevel.MEDIUM,
                description="Re-link or retire integration with missing {} reference".format(
                    d.finding.evidence.get("field", "CI")
                ),
                target_cis=[d.finding.ci_sys_id],
            )
            for d in diagnoses
        ]
