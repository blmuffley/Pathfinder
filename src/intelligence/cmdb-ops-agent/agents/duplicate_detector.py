"""DuplicateDetector — finds and merges duplicate Integration CIs.

Detection strategies:
  1. Exact match: same source_ci + target_ci
  2. Name similarity: Levenshtein distance ≤ 2 on normalized names
  3. Reverse direction: A→B and B→A may be one bidirectional integration
"""

import logging
from typing import Dict, List

from models.agent_base import CMDBAgent
from models.types import (
    Diagnosis,
    Finding,
    Recommendation,
    RiskLevel,
    Severity,
)

logger = logging.getLogger(__name__)


def _normalize(name):
    return name.strip().lower().replace("-", " ").replace("_", " ")


def _levenshtein(s1, s2):
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (c1 != c2)))
        prev = curr
    return prev[-1]


class DuplicateDetector(CMDBAgent):
    name = "duplicate_detector"
    description = "Finds and merges duplicate Integration CIs"

    def observe(self, context: Dict) -> List[Finding]:
        integrations = context.get("integrations", [])
        findings = []

        # Index by (source, target) key
        seen = {}  # type: Dict[tuple, Dict]
        for integ in integrations:
            src = integ.get("source_ci", integ.get("source_app", ""))
            tgt = integ.get("target_ci", integ.get("target_app", ""))
            sid = integ.get("sys_id", "")
            name = integ.get("name", "{} -> {}".format(src, tgt))

            key = (src, tgt)
            rev_key = (tgt, src)

            # Exact duplicate
            if key in seen:
                findings.append(Finding(
                    agent_name=self.name,
                    finding_type="exact_duplicate",
                    severity=Severity.HIGH,
                    ci_sys_id=sid,
                    ci_name=name,
                    description="Exact duplicate: same source_ci + target_ci as '{}'".format(seen[key].get("name", "")),
                    evidence={"original_sys_id": seen[key].get("sys_id", ""), "duplicate_sys_id": sid},
                ))
            # Reverse direction candidate
            elif rev_key in seen:
                findings.append(Finding(
                    agent_name=self.name,
                    finding_type="reverse_duplicate",
                    severity=Severity.MEDIUM,
                    ci_sys_id=sid,
                    ci_name=name,
                    description="Reverse direction of '{}' — may be single bidirectional integration".format(seen[rev_key].get("name", "")),
                    evidence={"original_sys_id": seen[rev_key].get("sys_id", ""), "reverse_sys_id": sid},
                ))
            else:
                seen[key] = integ

            # Name similarity check across all seen
            for prev_key, prev_integ in list(seen.items()):
                if prev_integ.get("sys_id") == sid:
                    continue
                prev_name = _normalize(prev_integ.get("name", ""))
                curr_name = _normalize(name)
                if prev_name and curr_name and 0 < _levenshtein(prev_name, curr_name) <= 2:
                    findings.append(Finding(
                        agent_name=self.name,
                        finding_type="name_similarity",
                        severity=Severity.LOW,
                        ci_sys_id=sid,
                        ci_name=name,
                        description="Name similar to '{}' (edit distance ≤ 2)".format(prev_integ.get("name", "")),
                        evidence={"similar_to": prev_integ.get("sys_id", "")},
                    ))
                    break  # One similarity finding per CI

        return findings

    def diagnose(self, findings: List[Finding]) -> List[Diagnosis]:
        diagnoses = []
        for f in findings:
            if f.finding_type == "exact_duplicate":
                diagnoses.append(Diagnosis(
                    finding=f,
                    root_cause="Two Integration CIs exist for the same source→target pair, likely from duplicate discovery runs or manual creation.",
                    confidence=0.95,
                    related_cis=[f.evidence.get("original_sys_id", "")],
                    suggested_action="Merge duplicates — keep the one with more flow data, retire the other.",
                ))
            elif f.finding_type == "reverse_duplicate":
                diagnoses.append(Diagnosis(
                    finding=f,
                    root_cause="A→B and B→A both exist. This may represent a single bidirectional integration.",
                    confidence=0.70,
                    related_cis=[f.evidence.get("original_sys_id", "")],
                    suggested_action="Review if both directions are needed or merge into one bidirectional CI.",
                ))
            elif f.finding_type == "name_similarity":
                diagnoses.append(Diagnosis(
                    finding=f,
                    root_cause="Integration names are nearly identical — possible typo or naming inconsistency.",
                    confidence=0.60,
                    related_cis=[f.evidence.get("similar_to", "")],
                    suggested_action="Investigate whether these are the same integration.",
                ))
        return diagnoses

    def recommend(self, diagnoses: List[Diagnosis]) -> List[Recommendation]:
        recommendations = []
        for d in diagnoses:
            if d.finding.finding_type == "exact_duplicate":
                recommendations.append(Recommendation(
                    diagnosis=d,
                    action_type="merge",
                    risk_level=RiskLevel.MEDIUM,
                    description="Merge duplicate Integration CIs. Retain the record with higher flow_count.",
                    target_cis=[d.finding.ci_sys_id] + d.related_cis,
                    field_changes={"operational_status": "retired_for_duplicate"},
                ))
            elif d.finding.finding_type == "reverse_duplicate":
                recommendations.append(Recommendation(
                    diagnosis=d,
                    action_type="review",
                    risk_level=RiskLevel.LOW,
                    description="Review bidirectional candidate — may merge if traffic is symmetric.",
                    target_cis=[d.finding.ci_sys_id] + d.related_cis,
                ))
            elif d.finding.finding_type == "name_similarity":
                recommendations.append(Recommendation(
                    diagnosis=d,
                    action_type="review",
                    risk_level=RiskLevel.LOW,
                    description="Manual review recommended — names are similar but CIs may be distinct.",
                    target_cis=[d.finding.ci_sys_id],
                ))
        return recommendations
