"""Change Impact Analyzer — graph traversal to find affected integrations + AI impact summary.

Given an application undergoing a change, traverses the integration graph to find:
  - Direct integrations (1-hop)
  - Indirect integrations (2-hop, transitive dependencies)
  - Total blast radius
"""

import logging
from collections import deque
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class ImpactResult:
    """Result of a change impact analysis."""

    def __init__(self, target_app: str, change_description: str):
        self.target_app = target_app
        self.change_description = change_description
        self.direct = []      # type: List[Dict]
        self.indirect = []    # type: List[Dict]
        self.total_affected = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target_app": self.target_app,
            "change_description": self.change_description,
            "direct_impact_count": len(self.direct),
            "indirect_impact_count": len(self.indirect),
            "total_affected": self.total_affected,
            "direct_impacts": self.direct,
            "indirect_impacts": self.indirect,
        }


def build_integration_graph(
    integrations: List[Dict[str, Any]],
) -> Dict[str, List[Dict]]:
    """Build adjacency list from integration records.

    Returns:
        Dict mapping app_name → list of connected integrations.
    """
    graph = {}  # type: Dict[str, List[Dict]]

    for integ in integrations:
        src = integ.get("source_app", "")
        tgt = integ.get("target_app", "")

        if src:
            graph.setdefault(src, []).append(integ)
        if tgt:
            graph.setdefault(tgt, []).append(integ)

    return graph


def analyze_change_impact(
    target_app: str,
    change_description: str,
    integrations: List[Dict[str, Any]],
    max_hops: int = 2,
) -> Dict[str, Any]:
    """Analyze the impact of a change to an application.

    Uses BFS to traverse the integration graph up to max_hops.

    Args:
        target_app: The application being changed.
        change_description: What is changing.
        integrations: All known integrations.
        max_hops: How far to traverse (1=direct only, 2=includes transitive).

    Returns:
        Impact analysis dict with direct/indirect affected integrations.
    """
    graph = build_integration_graph(integrations)
    result = ImpactResult(target_app, change_description)

    if target_app not in graph:
        return result.to_dict()

    # BFS traversal
    visited_apps = set()   # type: Set[str]
    visited_integs = set() # type: Set[str]
    queue = deque()        # (app_name, hop_count)

    visited_apps.add(target_app)
    queue.append((target_app, 0))

    while queue:
        app, hop = queue.popleft()

        if hop >= max_hops:
            continue

        for integ in graph.get(app, []):
            integ_id = integ.get("sys_id", integ.get("name", ""))
            if integ_id in visited_integs:
                continue
            visited_integs.add(integ_id)

            # Determine the other end
            src = integ.get("source_app", "")
            tgt = integ.get("target_app", "")
            other_app = tgt if src == app else src

            impact_entry = {
                "integration_name": integ.get("name", "{} → {}".format(src, tgt)),
                "integration_type": integ.get("integration_type", "Unknown"),
                "affected_app": other_app,
                "health_status": integ.get("health_status", "Unknown"),
                "health_score": integ.get("health_score"),
                "flow_count": integ.get("flow_count", 0),
                "criticality": integ.get("criticality", "Unknown"),
                "hop": hop + 1,
            }

            if hop == 0:
                result.direct.append(impact_entry)
            else:
                result.indirect.append(impact_entry)

            if other_app not in visited_apps:
                visited_apps.add(other_app)
                queue.append((other_app, hop + 1))

    result.total_affected = len(result.direct) + len(result.indirect)

    # Sort by criticality
    crit_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3, "Unknown": 4}
    result.direct.sort(key=lambda x: crit_order.get(x["criticality"], 9))
    result.indirect.sort(key=lambda x: crit_order.get(x["criticality"], 9))

    return result.to_dict()
