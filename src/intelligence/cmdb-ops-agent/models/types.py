"""Core data models for the CMDB Ops Agent lifecycle."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class RiskLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AutonomyLevel(int, Enum):
    REPORT_ONLY = 0       # observe + diagnose only
    RECOMMEND = 1         # creates recommendations, awaits approval (default)
    ACT_WITH_APPROVAL = 2 # creates Change Request, executes after approval
    FULLY_AUTONOMOUS = 3  # executes immediately, retroactive CR for audit


class ActionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    EXECUTED = "executed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    SKIPPED = "skipped"


class Finding(BaseModel):
    """An observation made by an agent during the observe() phase."""

    agent_name: str
    finding_type: str
    severity: Severity
    ci_sys_id: str
    ci_name: str = ""
    description: str
    evidence: Dict[str, Any] = Field(default_factory=dict)
    detected_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class Diagnosis(BaseModel):
    """Root cause analysis from the diagnose() phase."""

    finding: Finding
    root_cause: str
    confidence: float = Field(ge=0.0, le=1.0)
    related_cis: List[str] = Field(default_factory=list)
    suggested_action: str = ""


class Recommendation(BaseModel):
    """Proposed action from the recommend() phase."""

    diagnosis: Diagnosis
    action_type: str  # merge, retire, update, create_relationship, create_cr
    risk_level: RiskLevel
    description: str
    target_cis: List[str] = Field(default_factory=list)
    field_changes: Dict[str, Any] = Field(default_factory=dict)
    requires_approval: bool = True


class Action(BaseModel):
    """Executed or pending intervention from the act() phase."""

    recommendation: Recommendation
    status: ActionStatus = ActionStatus.PENDING
    change_request_id: Optional[str] = None
    executed_at: Optional[str] = None
    result: Optional[str] = None
    error: Optional[str] = None


class VerificationResult(BaseModel):
    """Post-action verification from the verify() phase."""

    action: Action
    verified: bool = False
    verified_at: Optional[str] = None
    discrepancies: List[str] = Field(default_factory=list)
    notes: str = ""


class AgentRunResult(BaseModel):
    """Complete result of a single agent run."""

    agent_name: str
    started_at: str
    completed_at: Optional[str] = None
    autonomy_level: int = 1
    findings_count: int = 0
    diagnoses_count: int = 0
    recommendations_count: int = 0
    actions_count: int = 0
    verifications_count: int = 0
    findings: List[Finding] = Field(default_factory=list)
    diagnoses: List[Diagnosis] = Field(default_factory=list)
    recommendations: List[Recommendation] = Field(default_factory=list)
    actions: List[Action] = Field(default_factory=list)
    verifications: List[VerificationResult] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
