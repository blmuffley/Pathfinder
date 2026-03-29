"""Risk Scorer — computes per-application risk from integrations, health, coverage, and criticality.

Risk = f(integration_count, health_scores, coverage_gaps, criticality)

Score 0-100 where 100 = highest risk.
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# Weights for risk components
W_HEALTH = 0.35
W_COVERAGE = 0.25
W_INTEGRATION_DENSITY = 0.20
W_CRITICALITY = 0.20

CRITICALITY_RISK = {
    "Critical": 100,
    "High": 75,
    "Medium": 50,
    "Low": 25,
    "Unknown": 50,
}


def _health_risk(integrations: List[Dict]) -> float:
    """Higher risk when integrations are unhealthy. Inverts health score."""
    scores = [i.get("health_score", 50) for i in integrations if i.get("health_score") is not None]
    if not scores:
        return 50.0
    avg_health = sum(scores) / len(scores)
    return 100.0 - avg_health  # Invert: low health → high risk


def _coverage_risk(coverage_gaps: int, total_servers: int) -> float:
    """Higher risk when more servers lack coverage."""
    if total_servers == 0:
        return 50.0
    gap_pct = coverage_gaps / total_servers * 100
    return min(gap_pct * 2, 100.0)  # 50% gap = 100 risk


def _density_risk(integration_count: int) -> float:
    """More integrations = more risk surface."""
    if integration_count <= 2:
        return 10.0
    if integration_count <= 5:
        return 30.0
    if integration_count <= 15:
        return 60.0
    return 90.0


def score_application_risk(
    app_name: str,
    integrations: List[Dict[str, Any]],
    coverage_gaps: int = 0,
    total_servers: int = 1,
    criticality: str = "Unknown",
) -> Dict[str, Any]:
    """Compute risk score for a single application.

    Returns:
        Dict with overall_risk, component scores, risk_level, explanation.
    """
    health = _health_risk(integrations)
    coverage = _coverage_risk(coverage_gaps, total_servers)
    density = _density_risk(len(integrations))
    crit = CRITICALITY_RISK.get(criticality, 50)

    overall = int(round(
        health * W_HEALTH
        + coverage * W_COVERAGE
        + density * W_INTEGRATION_DENSITY
        + crit * W_CRITICALITY
    ))
    overall = max(0, min(100, overall))

    if overall >= 75:
        risk_level = "Critical"
    elif overall >= 50:
        risk_level = "High"
    elif overall >= 25:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    parts = []
    if health >= 50:
        parts.append("unhealthy integrations (risk {:.0f})".format(health))
    if coverage >= 50:
        parts.append("coverage gaps (risk {:.0f})".format(coverage))
    if density >= 60:
        parts.append("high integration density ({} integrations)".format(len(integrations)))

    explanation = "{} risk for {}.".format(risk_level, app_name)
    if parts:
        explanation += " Drivers: " + "; ".join(parts) + "."

    return {
        "app_name": app_name,
        "overall_risk": overall,
        "risk_level": risk_level,
        "health_risk": round(health, 1),
        "coverage_risk": round(coverage, 1),
        "density_risk": round(density, 1),
        "criticality_risk": crit,
        "integration_count": len(integrations),
        "explanation": explanation,
    }


def score_all_applications(
    applications: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Score risk for all applications.

    Args:
        applications: List of dicts with app_name, integrations, coverage_gaps,
                      total_servers, criticality.

    Returns:
        Dict with scored apps sorted by risk (highest first), summary stats.
    """
    results = []
    for app in applications:
        result = score_application_risk(
            app_name=app.get("app_name", "Unknown"),
            integrations=app.get("integrations", []),
            coverage_gaps=app.get("coverage_gaps", 0),
            total_servers=app.get("total_servers", 1),
            criticality=app.get("criticality", "Unknown"),
        )
        results.append(result)

    results.sort(key=lambda r: r["overall_risk"], reverse=True)

    return {
        "total_applications": len(results),
        "critical_count": sum(1 for r in results if r["risk_level"] == "Critical"),
        "high_count": sum(1 for r in results if r["risk_level"] == "High"),
        "medium_count": sum(1 for r in results if r["risk_level"] == "Medium"),
        "low_count": sum(1 for r in results if r["risk_level"] == "Low"),
        "avg_risk": round(sum(r["overall_risk"] for r in results) / len(results), 1) if results else 0,
        "applications": results,
    }
