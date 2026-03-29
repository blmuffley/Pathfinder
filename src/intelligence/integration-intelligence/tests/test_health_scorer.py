"""Tests for the health scoring service."""

import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.health_scorer import (
    compute_health_score,
    score_availability,
    score_error_rate,
    score_latency,
    score_staleness,
)


def test_perfect_health():
    """All metrics excellent → score ~100, Healthy."""
    now = datetime.now(timezone.utc).isoformat()
    metrics = [
        {"metric_type": "Availability", "metric_value": 99.99},
        {"metric_type": "Latency", "metric_value": 50.0},
        {"metric_type": "ErrorRate", "metric_value": 0.01},
    ]
    result = compute_health_score(metrics, last_observed=now)
    assert result["overall_score"] >= 90
    assert result["status"] == "Healthy"


def test_degraded_health():
    """Mixed metrics → score 60-79, Degraded."""
    two_days_ago = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    metrics = [
        {"metric_type": "Availability", "metric_value": 98.0},
        {"metric_type": "Latency", "metric_value": 300.0},
        {"metric_type": "ErrorRate", "metric_value": 2.0},
    ]
    result = compute_health_score(metrics, last_observed=two_days_ago)
    assert 40 <= result["overall_score"] <= 79
    assert result["status"] in ("Degraded", "Critical")


def test_critical_health():
    """All metrics bad → score <60, Critical."""
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=35)).isoformat()
    metrics = [
        {"metric_type": "Availability", "metric_value": 94.0},
        {"metric_type": "Latency", "metric_value": 600.0},
        {"metric_type": "ErrorRate", "metric_value": 6.0},
    ]
    result = compute_health_score(metrics, last_observed=thirty_days_ago)
    assert result["overall_score"] < 60
    assert result["status"] == "Critical"


def test_unknown_no_data():
    """No metrics and no last_observed → Unknown."""
    result = compute_health_score([], last_observed=None)
    assert result["status"] == "Unknown"


def test_availability_scoring():
    assert score_availability([{"metric_type": "Availability", "metric_value": 99.99}]) == 100
    assert score_availability([{"metric_type": "Availability", "metric_value": 95.0}]) == 0
    assert score_availability([{"metric_type": "Availability", "metric_value": 97.45}]) == 50
    assert score_availability([]) == 50  # neutral


def test_latency_scoring():
    # Default baseline = 100ms, low = 150ms, high = 500ms
    assert score_latency([{"metric_type": "Latency", "metric_value": 100.0}]) == 100
    assert score_latency([{"metric_type": "Latency", "metric_value": 500.0}]) == 0
    assert score_latency([]) == 50  # neutral


def test_error_rate_scoring():
    assert score_error_rate([{"metric_type": "ErrorRate", "metric_value": 0.05}]) == 100
    assert score_error_rate([{"metric_type": "ErrorRate", "metric_value": 5.0}]) == 0
    assert score_error_rate([{"metric_type": "ErrorRate", "metric_value": 2.5}]) > 0
    assert score_error_rate([{"metric_type": "ErrorRate", "metric_value": 2.5}]) < 60


def test_staleness_scoring():
    now = datetime.now(timezone.utc).isoformat()
    assert score_staleness(now) == 100

    old = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    assert score_staleness(old) == 0

    assert score_staleness(None) == 50  # neutral


def test_explanation_includes_issues():
    metrics = [
        {"metric_type": "Availability", "metric_value": 94.0},
        {"metric_type": "ErrorRate", "metric_value": 6.0},
    ]
    result = compute_health_score(metrics, last_observed=None)
    assert "availability" in result["explanation"].lower() or "error" in result["explanation"].lower()
