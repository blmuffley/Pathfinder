"""Tests for the anomaly detection service."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.anomaly import AnomalyRequest, TimeSeriesPoint
from services.anomaly import detect_anomalies


def _make_series(values):
    return [
        TimeSeriesPoint(timestamp="2026-03-{:02d}T00:00:00Z".format(i + 1), value=v)
        for i, v in enumerate(values)
    ]


def test_no_anomalies_in_stable_series():
    """A flat series should produce no anomalies."""
    values = [100.0] * 30
    req = AnomalyRequest(metric_name="latency", series=_make_series(values))
    resp = detect_anomalies(req)

    assert resp.anomaly_count == 0
    assert not resp.has_anomalies
    assert resp.total_points == 30


def test_spike_detected():
    """A large spike in noisy data should be detected."""
    import random
    random.seed(42)
    # Noisy baseline around 10 with std ~1, then a spike at 100
    values = [10.0 + random.gauss(0, 1) for _ in range(25)] + [100.0]
    req = AnomalyRequest(metric_name="latency", series=_make_series(values), z_threshold=2.0, window_size=20)
    resp = detect_anomalies(req)

    assert resp.has_anomalies
    assert resp.anomaly_count >= 1
    # At least one anomaly should be the spike at 100.0
    spike_found = any(a.value > 50.0 and a.direction == "above" for a in resp.anomalies)
    assert spike_found, "Expected to find the 100.0 spike as an above-anomaly"


def test_dip_detected():
    """A large dip in noisy data should be detected."""
    import random
    random.seed(42)
    values = [100.0 + random.gauss(0, 1) for _ in range(25)] + [10.0]
    req = AnomalyRequest(metric_name="availability", series=_make_series(values), z_threshold=2.0, window_size=20)
    resp = detect_anomalies(req)

    assert resp.has_anomalies
    assert resp.anomaly_count >= 1
    assert resp.anomalies[0].direction == "below"


def test_gradual_trend_no_false_positives():
    """A gradually increasing series shouldn't trigger anomalies."""
    values = [float(i) for i in range(30)]
    req = AnomalyRequest(metric_name="throughput", series=_make_series(values), z_threshold=3.0, window_size=10)
    resp = detect_anomalies(req)

    assert resp.anomaly_count == 0


def test_short_series_handled():
    """Series shorter than window should not crash."""
    values = [10.0, 20.0, 30.0]
    req = AnomalyRequest(metric_name="test", series=_make_series(values), window_size=20)
    resp = detect_anomalies(req)

    assert resp.total_points == 3
    assert resp.anomaly_count == 0


def test_multiple_anomalies():
    """Multiple spikes in noisy data should all be detected."""
    import random
    random.seed(42)
    values = [10.0 + random.gauss(0, 1) for _ in range(10)]
    values.append(100.0)  # spike 1
    values.extend([10.0 + random.gauss(0, 1) for _ in range(10)])
    values.append(100.0)  # spike 2
    values.extend([10.0 + random.gauss(0, 1) for _ in range(5)])
    req = AnomalyRequest(metric_name="errors", series=_make_series(values), z_threshold=2.0, window_size=8)
    resp = detect_anomalies(req)

    assert resp.has_anomalies
    assert resp.anomaly_count >= 2


def test_response_statistics():
    """Mean and std_dev should be computed correctly."""
    values = [10.0, 20.0, 30.0, 40.0, 50.0]
    req = AnomalyRequest(metric_name="test", series=_make_series(values))
    resp = detect_anomalies(req)

    assert resp.mean == 30.0
    assert resp.std_dev > 0


def test_custom_threshold():
    """Higher threshold should produce fewer or equal anomalies."""
    import random
    random.seed(42)
    values = [10.0 + random.gauss(0, 1) for _ in range(25)] + [50.0]
    req_low = AnomalyRequest(metric_name="test", series=_make_series(values), z_threshold=1.5, window_size=20)
    req_high = AnomalyRequest(metric_name="test", series=_make_series(values), z_threshold=4.0, window_size=20)

    resp_low = detect_anomalies(req_low)
    resp_high = detect_anomalies(req_high)

    assert resp_low.anomaly_count >= resp_high.anomaly_count
