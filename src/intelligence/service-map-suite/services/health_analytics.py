"""Health Analytics — trend detection and aggregate health statistics."""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def compute_health_distribution(integrations: List[Dict]) -> Dict[str, int]:
    """Count integrations by health status."""
    dist = {"Healthy": 0, "Degraded": 0, "Critical": 0, "Unknown": 0}
    for integ in integrations:
        status = integ.get("health_status", "Unknown")
        if status in dist:
            dist[status] += 1
        else:
            dist["Unknown"] += 1
    return dist


def compute_health_summary(integrations: List[Dict]) -> Dict[str, Any]:
    """Compute aggregate health statistics across all integrations."""
    scores = [i["health_score"] for i in integrations if i.get("health_score") is not None]
    distribution = compute_health_distribution(integrations)

    total = len(integrations)
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    min_score = min(scores) if scores else 0
    max_score = max(scores) if scores else 0

    # Trend: compare first half vs second half of scores (by list order)
    trend = "stable"
    if len(scores) >= 10:
        mid = len(scores) // 2
        first_half = sum(scores[:mid]) / mid
        second_half = sum(scores[mid:]) / (len(scores) - mid)
        diff = second_half - first_half
        if diff > 5:
            trend = "improving"
        elif diff < -5:
            trend = "declining"

    return {
        "total_integrations": total,
        "scored_integrations": len(scores),
        "avg_health_score": avg_score,
        "min_health_score": min_score,
        "max_health_score": max_score,
        "health_distribution": distribution,
        "trend": trend,
        "healthy_percent": round(distribution["Healthy"] / total * 100, 1) if total > 0 else 0.0,
        "critical_percent": round(distribution["Critical"] / total * 100, 1) if total > 0 else 0.0,
    }


def find_health_outliers(
    integrations: List[Dict],
    score_threshold: int = 40,
) -> List[Dict]:
    """Find integrations with critically low health scores."""
    outliers = []
    for integ in integrations:
        score = integ.get("health_score")
        if score is not None and score <= score_threshold:
            outliers.append({
                "name": integ.get("name", ""),
                "sys_id": integ.get("sys_id", ""),
                "health_score": score,
                "health_status": integ.get("health_status", "Unknown"),
                "integration_type": integ.get("integration_type", ""),
                "criticality": integ.get("criticality", "Unknown"),
                "last_observed": integ.get("last_observed", ""),
            })

    outliers.sort(key=lambda x: x["health_score"])
    return outliers
