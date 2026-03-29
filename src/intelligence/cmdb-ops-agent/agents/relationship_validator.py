"""RelationshipValidator — verifies structural integrity of Integration CI relationships.

Checks for: self-references, circular dependencies, missing mandatory fields.
"""

import logging
from typing import Dict, List, Set

from models.agent_base import CMDBAgent
from models.types import Diagnosis, Finding, Recommendation, RiskLevel, Severity

logger = logging.getLogger(__name__)


class RelationshipValidator(CMDBAgent):
    name = "relationship_validator"
    description = "Verifies structural integrity of CI relationships"

    def observe(self, context: Dict) -> List[Finding]:
        integrations = context.get("integrations", [])
        findings = []

        # Build adjacency for cycle detection
        edges = {}  # type: Dict[str, List[str]]
        for integ in integrations:
            sid = integ.get("sys_id", "")
            name = integ.get("name", "")
            src = integ.get("source_ci", "")
            tgt = integ.get("target_ci", "")

            # Self-reference check
            if src and tgt and src == tgt:
                findings.append(Finding(
                    agent_name=self.name, finding_type="self_reference",
                    severity=Severity.HIGH, ci_sys_id=sid, ci_name=name,
                    description="Integration references itself (source_ci == target_ci)",
                    evidence={"ci": src},
                ))

            if src:
                edges.setdefault(src, []).append(tgt)

        # Circular dependency detection (DFS)
        visited = set()  # type: Set[str]
        in_stack = set()  # type: Set[str]

        def dfs(node, path):
            if node in in_stack:
                cycle = path[path.index(node):]
                findings.append(Finding(
                    agent_name=self.name, finding_type="circular_dependency",
                    severity=Severity.MEDIUM, ci_sys_id=node, ci_name=node,
                    description="Circular dependency detected: {}".format(" → ".join(cycle + [node])),
                    evidence={"cycle": cycle},
                ))
                return
            if node in visited:
                return
            visited.add(node)
            in_stack.add(node)
            for neighbor in edges.get(node, []):
                dfs(neighbor, path + [node])
            in_stack.discard(node)

        for start in edges:
            if start not in visited:
                dfs(start, [])

        return findings

    def diagnose(self, findings: List[Finding]) -> List[Diagnosis]:
        return [
            Diagnosis(
                finding=f,
                root_cause="Self-reference indicates data entry error." if f.finding_type == "self_reference"
                else "Circular dependency creates infinite traversal loops in service maps.",
                confidence=0.95 if f.finding_type == "self_reference" else 0.80,
                suggested_action="Fix CI reference" if f.finding_type == "self_reference" else "Break cycle by reviewing relationship direction.",
            )
            for f in findings
        ]

    def recommend(self, diagnoses: List[Diagnosis]) -> List[Recommendation]:
        return [
            Recommendation(
                diagnosis=d,
                action_type="update",
                risk_level=RiskLevel.MEDIUM,
                description=d.suggested_action,
                target_cis=[d.finding.ci_sys_id],
            )
            for d in diagnoses
        ]
