"""Abstract base class for all CMDB Ops agents.

Every agent implements the 5-phase lifecycle:
  observe() → diagnose() → recommend() → act() → verify()

Autonomy level controls how far the agent progresses:
  Level 0: observe + diagnose only
  Level 1: + recommend (default)
  Level 2: + act with approval (creates Change Request)
  Level 3: + act immediately (retroactive CR)
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional

from models.types import (
    Action,
    AgentRunResult,
    AutonomyLevel,
    Diagnosis,
    Finding,
    Recommendation,
    VerificationResult,
)

logger = logging.getLogger(__name__)

# Guardrails
MAX_CIS_PER_RUN = 50
COOLDOWN_HOURS = 24


class CMDBAgent(ABC):
    """Base class for all CMDB Ops agents."""

    name: str = "base_agent"
    description: str = ""
    default_autonomy: AutonomyLevel = AutonomyLevel.RECOMMEND

    def __init__(
        self,
        autonomy_level: Optional[int] = None,
        max_cis: int = MAX_CIS_PER_RUN,
        dry_run: bool = False,
    ):
        self.autonomy = AutonomyLevel(autonomy_level if autonomy_level is not None else self.default_autonomy)
        self.max_cis = max_cis
        self.dry_run = dry_run
        self._cooldown_cache: Dict[str, str] = {}  # ci_sys_id → last_action_time

    def run(self, context: Dict) -> AgentRunResult:
        """Execute the full agent lifecycle respecting autonomy level.

        Args:
            context: Dict with integration data, config, etc.

        Returns:
            AgentRunResult with all findings, diagnoses, recommendations, actions.
        """
        result = AgentRunResult(
            agent_name=self.name,
            started_at=datetime.utcnow().isoformat(),
            autonomy_level=self.autonomy.value,
        )

        try:
            # Phase 1: Observe
            logger.info("[%s] Phase 1: observe()", self.name)
            findings = self.observe(context)
            findings = findings[:self.max_cis]  # Guardrail: blast radius limit
            result.findings = findings
            result.findings_count = len(findings)
            logger.info("[%s] Found %d findings", self.name, len(findings))

            if not findings:
                result.completed_at = datetime.utcnow().isoformat()
                return result

            # Phase 2: Diagnose
            logger.info("[%s] Phase 2: diagnose()", self.name)
            diagnoses = self.diagnose(findings)
            result.diagnoses = diagnoses
            result.diagnoses_count = len(diagnoses)

            if self.autonomy == AutonomyLevel.REPORT_ONLY:
                result.completed_at = datetime.utcnow().isoformat()
                return result

            # Phase 3: Recommend
            logger.info("[%s] Phase 3: recommend()", self.name)
            recommendations = self.recommend(diagnoses)
            result.recommendations = recommendations
            result.recommendations_count = len(recommendations)

            if self.autonomy == AutonomyLevel.RECOMMEND:
                result.completed_at = datetime.utcnow().isoformat()
                return result

            # Phase 4: Act
            if not self.dry_run:
                logger.info("[%s] Phase 4: act() (autonomy=%d)", self.name, self.autonomy.value)
                actions = self.act(recommendations)
                result.actions = actions
                result.actions_count = len(actions)

                # Phase 5: Verify
                logger.info("[%s] Phase 5: verify()", self.name)
                verifications = self.verify(actions)
                result.verifications = verifications
                result.verifications_count = len(verifications)
            else:
                logger.info("[%s] Dry run — skipping act() and verify()", self.name)

        except Exception as e:
            logger.error("[%s] Error during run: %s", self.name, e)
            result.errors.append(str(e))

        result.completed_at = datetime.utcnow().isoformat()
        return result

    @abstractmethod
    def observe(self, context: Dict) -> List[Finding]:
        """Phase 1: Scan CMDB data and return findings."""
        ...

    @abstractmethod
    def diagnose(self, findings: List[Finding]) -> List[Diagnosis]:
        """Phase 2: Analyze findings to determine root causes."""
        ...

    @abstractmethod
    def recommend(self, diagnoses: List[Diagnosis]) -> List[Recommendation]:
        """Phase 3: Propose actions to resolve diagnoses."""
        ...

    def act(self, recommendations: List[Recommendation]) -> List[Action]:
        """Phase 4: Execute recommendations. Override for custom logic."""
        actions = []
        for rec in recommendations:
            action = Action(
                recommendation=rec,
                status="pending",
                executed_at=datetime.utcnow().isoformat(),
            )
            if self.autonomy == AutonomyLevel.FULLY_AUTONOMOUS:
                action.status = "executed"
                action.result = "Executed (autonomy level 3)"
            elif self.autonomy == AutonomyLevel.ACT_WITH_APPROVAL:
                action.status = "pending"
                action.result = "Change request created, awaiting approval"
            actions.append(action)
        return actions

    def verify(self, actions: List[Action]) -> List[VerificationResult]:
        """Phase 5: Verify actions were successful. Override for custom logic."""
        verifications = []
        for action in actions:
            v = VerificationResult(
                action=action,
                verified=(action.status == "executed"),
                verified_at=datetime.utcnow().isoformat(),
            )
            verifications.append(v)
        return verifications

    def _is_on_cooldown(self, ci_sys_id: str) -> bool:
        """Check if a CI was recently acted upon (24h cooldown)."""
        if ci_sys_id not in self._cooldown_cache:
            return False
        last = datetime.fromisoformat(self._cooldown_cache[ci_sys_id])
        hours = (datetime.utcnow() - last).total_seconds() / 3600
        return hours < COOLDOWN_HOURS
