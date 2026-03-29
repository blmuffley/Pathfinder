"""EA Reconciliation — match discovered integrations to EA relationship records.

Matching strategies:
  1. Exact match: source_ci + target_ci match parent + child → confidence 1.0
  2. Fuzzy name match: app names within Levenshtein distance ≤ 2 → confidence 0.7
  3. Group match: apps in same business service → confidence 0.5
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Confidence thresholds
EXACT_CONFIDENCE = 1.0
FUZZY_CONFIDENCE = 0.7
GROUP_CONFIDENCE = 0.5
AUTO_SUGGEST_THRESHOLD = 0.7


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    prev_row = list(range(len(s2) + 1))

    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row

    return prev_row[-1]


def normalize_name(name: str) -> str:
    """Normalize an application name for matching."""
    return name.strip().lower().replace("-", " ").replace("_", " ")


class EAReconciler:
    """Matches discovered integrations to EA-managed relationships."""

    def match(
        self,
        integration: Dict[str, Any],
        ea_relationships: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Find matching EA relationships for a discovered integration.

        Args:
            integration: Dict with source_app, target_app, source_ci, target_ci.
            ea_relationships: List of EA relationship dicts with parent, child,
                parent_name, child_name, sys_id.

        Returns:
            List of match suggestions sorted by confidence (highest first).
        """
        suggestions = []

        src_ci = integration.get("source_ci", "")
        tgt_ci = integration.get("target_ci", "")
        src_name = normalize_name(integration.get("source_app", ""))
        tgt_name = normalize_name(integration.get("target_app", ""))

        for ea in ea_relationships:
            ea_parent = ea.get("parent", "")
            ea_child = ea.get("child", "")
            ea_parent_name = normalize_name(ea.get("parent_name", ""))
            ea_child_name = normalize_name(ea.get("child_name", ""))
            ea_sys_id = ea.get("sys_id", "")

            confidence = 0.0
            match_reason = ""

            # Strategy 1: Exact CI match
            if src_ci and tgt_ci and ea_parent and ea_child:
                if src_ci == ea_parent and tgt_ci == ea_child:
                    confidence = EXACT_CONFIDENCE
                    match_reason = "Exact match: source_ci and target_ci match EA parent and child."
                elif src_ci == ea_child and tgt_ci == ea_parent:
                    confidence = EXACT_CONFIDENCE * 0.95
                    match_reason = "Exact match (reversed direction): CIs match EA relationship in reverse."

            # Strategy 2: Fuzzy name match
            if confidence < FUZZY_CONFIDENCE and src_name and tgt_name:
                src_dist = levenshtein_distance(src_name, ea_parent_name)
                tgt_dist = levenshtein_distance(tgt_name, ea_child_name)

                if src_dist <= 2 and tgt_dist <= 2:
                    # Both names match within edit distance 2
                    name_confidence = FUZZY_CONFIDENCE
                    # Boost slightly for closer matches
                    if src_dist == 0 and tgt_dist == 0:
                        name_confidence = 0.9
                    elif src_dist <= 1 and tgt_dist <= 1:
                        name_confidence = 0.8

                    if name_confidence > confidence:
                        confidence = name_confidence
                        match_reason = "Fuzzy name match: '{}' ≈ '{}' (dist={}), '{}' ≈ '{}' (dist={}).".format(
                            src_name, ea_parent_name, src_dist,
                            tgt_name, ea_child_name, tgt_dist,
                        )

                # Also check reversed names
                src_dist_rev = levenshtein_distance(src_name, ea_child_name)
                tgt_dist_rev = levenshtein_distance(tgt_name, ea_parent_name)

                if src_dist_rev <= 2 and tgt_dist_rev <= 2:
                    rev_confidence = FUZZY_CONFIDENCE * 0.9
                    if rev_confidence > confidence:
                        confidence = rev_confidence
                        match_reason = "Fuzzy name match (reversed): names match EA relationship in reverse direction."

            # Strategy 3: Group match (business service)
            if confidence < GROUP_CONFIDENCE:
                src_svc = integration.get("source_business_service", "")
                tgt_svc = integration.get("target_business_service", "")
                ea_svc = ea.get("business_service", "")

                if ea_svc and (src_svc == ea_svc or tgt_svc == ea_svc):
                    confidence = GROUP_CONFIDENCE
                    match_reason = "Group match: applications share business service '{}'.".format(ea_svc)

            if confidence > 0:
                status = "Suggested" if confidence >= AUTO_SUGGEST_THRESHOLD else "Low confidence"
                suggestions.append({
                    "ea_relationship": ea_sys_id,
                    "confidence": round(confidence, 2),
                    "match_reason": match_reason,
                    "mapping_status": status,
                })

        # Sort by confidence descending
        suggestions.sort(key=lambda x: x["confidence"], reverse=True)
        return suggestions

    def reconcile_batch(
        self,
        integrations: List[Dict[str, Any]],
        ea_relationships: List[Dict[str, Any]],
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Reconcile a batch of integrations against EA relationships.

        Returns:
            Dict mapping integration identifier → list of match suggestions.
        """
        results = {}
        for integ in integrations:
            key = "{} → {}".format(
                integ.get("source_app", "?"),
                integ.get("target_app", "?"),
            )
            matches = self.match(integ, ea_relationships)
            results[key] = matches
        return results
