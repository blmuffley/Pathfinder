"""CMDB Ops Agent — 8 autonomous agents for CMDB lifecycle management."""

from agents.duplicate_detector import DuplicateDetector
from agents.stale_record_reaper import StaleRecordReaper
from agents.orphan_finder import OrphanFinder
from agents.relationship_validator import RelationshipValidator
from agents.classification_auditor import ClassificationAuditor
from agents.compliance_checker import ComplianceChecker
from agents.health_scorer import HealthScorerAgent
from agents.remediation_orchestrator import RemediationOrchestrator

ALL_AGENTS = [
    DuplicateDetector,
    StaleRecordReaper,
    OrphanFinder,
    RelationshipValidator,
    ClassificationAuditor,
    ComplianceChecker,
    HealthScorerAgent,
    RemediationOrchestrator,
]

__all__ = [
    "DuplicateDetector",
    "StaleRecordReaper",
    "OrphanFinder",
    "RelationshipValidator",
    "ClassificationAuditor",
    "ComplianceChecker",
    "HealthScorerAgent",
    "RemediationOrchestrator",
    "ALL_AGENTS",
]
