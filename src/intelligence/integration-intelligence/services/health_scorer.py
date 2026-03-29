"""Composite health scoring for Integration CIs.

Weights:
  Availability  40%  — >99.9% = 100, linear decay to 0 at 95%
  Latency       30%  — p99 < baseline×1.5 = 100, decay to 0 at baseline×5
  Error Rate    20%  — <0.1% = 100, linear decay to 0 at 5%
  Staleness     10%  — observed last 24h = 100, decay to 0 at 30 days
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple


WEIGHT_AVAILABILITY = 0.40
WEIGHT_LATENCY = 0.30
WEIGHT_ERROR_RATE = 0.20
WEIGHT_STALENESS = 0.10

# Defaults when no data is available
NEUTRAL_SCORE = 50
DEFAULT_LATENCY_BASELINE_MS = 100.0


def score_availability(metrics: List[Dict]) -> int:
    """Score availability metric.

    100 if >= 99.9%, linear decay to 0 at 95%.
    """
    avail_values = [m["metric_value"] for m in metrics if m.get("metric_type") == "Availability"]
    if not avail_values:
        return NEUTRAL_SCORE

    avg_avail = sum(avail_values) / len(avail_values)

    if avg_avail >= 99.9:
        return 100
    if avg_avail <= 95.0:
        return 0

    # Linear interpolation: 95% → 0, 99.9% → 100
    return int(round((avg_avail - 95.0) / (99.9 - 95.0) * 100))


def score_latency(metrics: List[Dict], baseline_ms: float = DEFAULT_LATENCY_BASELINE_MS) -> int:
    """Score latency metric.

    100 if p99 < baseline×1.5, linear decay to 0 at baseline×5.
    """
    latency_values = [m["metric_value"] for m in metrics if m.get("metric_type") == "Latency"]
    if not latency_values:
        return NEUTRAL_SCORE

    # Use p99 approximation: max of recent values
    p99 = max(latency_values)
    low = baseline_ms * 1.5
    high = baseline_ms * 5.0

    if p99 <= low:
        return 100
    if p99 >= high:
        return 0

    return int(round((1.0 - (p99 - low) / (high - low)) * 100))


def score_error_rate(metrics: List[Dict]) -> int:
    """Score error rate metric.

    100 if < 0.1%, linear decay to 0 at 5%.
    """
    error_values = [m["metric_value"] for m in metrics if m.get("metric_type") == "ErrorRate"]
    if not error_values:
        return NEUTRAL_SCORE

    avg_error = sum(error_values) / len(error_values)

    if avg_error <= 0.1:
        return 100
    if avg_error >= 5.0:
        return 0

    return int(round((1.0 - (avg_error - 0.1) / (5.0 - 0.1)) * 100))


def score_staleness(last_observed: Optional[str]) -> int:
    """Score staleness metric.

    100 if observed in last 24h, linear decay to 0 at 30 days.
    """
    if not last_observed:
        return NEUTRAL_SCORE

    try:
        if last_observed.endswith("Z"):
            last_observed = last_observed[:-1] + "+00:00"
        last_dt = datetime.fromisoformat(last_observed)
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return NEUTRAL_SCORE

    now = datetime.now(timezone.utc)
    hours_since = (now - last_dt).total_seconds() / 3600

    if hours_since <= 24:
        return 100
    if hours_since >= 30 * 24:  # 30 days
        return 0

    # Linear: 24h → 100, 720h → 0
    return int(round((1.0 - (hours_since - 24) / (30 * 24 - 24)) * 100))


def compute_health_score(
    metrics: List[Dict],
    last_observed: Optional[str] = None,
    latency_baseline_ms: float = DEFAULT_LATENCY_BASELINE_MS,
) -> Dict:
    """Compute composite health score and status.

    Args:
        metrics: List of health metric dicts with metric_type and metric_value.
        last_observed: ISO timestamp of last flow observation.
        latency_baseline_ms: Baseline latency for scoring.

    Returns:
        Dict with overall_score, component scores, status, and explanation.
    """
    avail = score_availability(metrics)
    latency = score_latency(metrics, latency_baseline_ms)
    error = score_error_rate(metrics)
    stale = score_staleness(last_observed)

    overall = int(round(
        avail * WEIGHT_AVAILABILITY
        + latency * WEIGHT_LATENCY
        + error * WEIGHT_ERROR_RATE
        + stale * WEIGHT_STALENESS
    ))

    overall = max(0, min(100, overall))

    if overall >= 80:
        status = "Healthy"
    elif overall >= 60:
        status = "Degraded"
    else:
        status = "Critical"

    # Check if we had any real data
    has_data = any(
        m.get("metric_type") in ("Availability", "Latency", "ErrorRate")
        for m in metrics
    )
    if not has_data and not last_observed:
        status = "Unknown"

    parts = []
    if avail < 80:
        parts.append("availability below threshold ({}/100)".format(avail))
    if latency < 80:
        parts.append("latency elevated ({}/100)".format(latency))
    if error < 80:
        parts.append("error rate high ({}/100)".format(error))
    if stale < 80:
        parts.append("data is stale ({}/100)".format(stale))

    explanation = "Health is {}.".format(status)
    if parts:
        explanation += " Issues: " + "; ".join(parts) + "."

    return {
        "overall_score": overall,
        "availability_score": avail,
        "latency_score": latency,
        "error_rate_score": error,
        "staleness_score": stale,
        "status": status,
        "explanation": explanation,
    }
