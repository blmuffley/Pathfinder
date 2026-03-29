"""StaleRecordReaper — identifies inactive Integration CIs.

Staleness tiers:
  Warning:  90 days without observation  → severity LOW
  Stale:    180 days → severity MEDIUM, recommend retire review
  Expired:  365 days → severity HIGH, recommend decommission
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List

from models.agent_base import CMDBAgent
from models.types import Diagnosis, Finding, Recommendation, RiskLevel, Severity

logger = logging.getLogger(__name__)

TIER_WARNING_DAYS = 90
TIER_STALE_DAYS = 180
TIER_EXPIRED_DAYS = 365


class StaleRecordReaper(CMDBAgent):
    name = "stale_record_reaper"
    description = "Identifies inactive CIs based on last observation date"

    def observe(self, context: Dict) -> List[Finding]:
        integrations = context.get("integrations", [])
        now = datetime.now(timezone.utc)
        findings = []

        for integ in integrations:
            last_obs = integ.get("last_observed")
            if not last_obs:
                continue

            try:
                if isinstance(last_obs, str):
                    if last_obs.endswith("Z"):
                        last_obs = last_obs[:-1] + "+00:00"
                    last_dt = datetime.fromisoformat(last_obs)
                    if last_dt.tzinfo is None:
                        last_dt = last_dt.replace(tzinfo=timezone.utc)
                else:
                    continue
            except (ValueError, TypeError):
                continue

            days_since = (now - last_dt).days
            sid = integ.get("sys_id", "")
            name = integ.get("name", "")

            if days_since >= TIER_EXPIRED_DAYS:
                findings.append(Finding(
                    agent_name=self.name, finding_type="expired",
                    severity=Severity.HIGH, ci_sys_id=sid, ci_name=name,
                    description="No flows in {} days — expired".format(days_since),
                    evidence={"days_since": days_since, "last_observed": str(last_dt)},
                ))
            elif days_since >= TIER_STALE_DAYS:
                findings.append(Finding(
                    agent_name=self.name, finding_type="stale",
                    severity=Severity.MEDIUM, ci_sys_id=sid, ci_name=name,
                    description="No flows in {} days — stale".format(days_since),
                    evidence={"days_since": days_since, "last_observed": str(last_dt)},
                ))
            elif days_since >= TIER_WARNING_DAYS:
                findings.append(Finding(
                    agent_name=self.name, finding_type="warning",
                    severity=Severity.LOW, ci_sys_id=sid, ci_name=name,
                    description="No flows in {} days — approaching stale".format(days_since),
                    evidence={"days_since": days_since, "last_observed": str(last_dt)},
                ))

        return findings

    def diagnose(self, findings: List[Finding]) -> List[Diagnosis]:
        return [
            Diagnosis(
                finding=f,
                root_cause="Integration has not been observed by any agent for {} days. The connection may have been decommissioned, migrated, or the agent lost coverage.".format(f.evidence.get("days_since", "?")),
                confidence=0.85 if f.finding_type == "expired" else 0.70,
                suggested_action="retire" if f.finding_type == "expired" else "review",
            )
            for f in findings
        ]

    def recommend(self, diagnoses: List[Diagnosis]) -> List[Recommendation]:
        return [
            Recommendation(
                diagnosis=d,
                action_type="retire" if d.finding.finding_type == "expired" else "update",
                risk_level=RiskLevel.MEDIUM if d.finding.finding_type == "expired" else RiskLevel.LOW,
                description="Set operational_status to Non-Operational" if d.finding.finding_type in ("expired", "stale") else "Flag for owner review",
                target_cis=[d.finding.ci_sys_id],
                field_changes={"operational_status": "2"} if d.finding.finding_type in ("expired", "stale") else {},
            )
            for d in diagnoses
        ]
