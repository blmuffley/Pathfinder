"""Z-score based time-series anomaly detection."""

from __future__ import annotations

import logging

import numpy as np

from models.anomaly import AnomalyPoint, AnomalyRequest, AnomalyResponse

logger = logging.getLogger(__name__)


def detect_anomalies(request: AnomalyRequest) -> AnomalyResponse:
    """Detect anomalies in a time series using rolling Z-score.

    Uses a sliding window to compute local mean and standard deviation,
    then flags points whose Z-score exceeds the threshold.
    """
    values = np.array([p.value for p in request.series], dtype=np.float64)
    timestamps = [p.timestamp for p in request.series]
    n = len(values)

    if n < 3:
        return AnomalyResponse(
            metric_name=request.metric_name,
            total_points=n,
            anomaly_count=0,
            mean=float(np.mean(values)),
            std_dev=float(np.std(values)),
        )

    window = min(request.window_size, n)
    anomalies: list[AnomalyPoint] = []

    # Global stats for the response
    global_mean = float(np.mean(values))
    global_std = float(np.std(values))

    for i in range(window, n):
        # Rolling window: [i-window, i)
        window_slice = values[i - window : i]
        w_mean = float(np.mean(window_slice))
        w_std = float(np.std(window_slice))

        if w_std < 1e-10:
            # No variance in window — can't compute Z-score
            continue

        z = (values[i] - w_mean) / w_std

        if abs(z) >= request.z_threshold:
            anomalies.append(
                AnomalyPoint(
                    timestamp=timestamps[i],
                    value=float(values[i]),
                    expected=round(w_mean, 4),
                    z_score=round(float(z), 4),
                    direction="above" if z > 0 else "below",
                )
            )

    return AnomalyResponse(
        metric_name=request.metric_name,
        total_points=n,
        anomaly_count=len(anomalies),
        anomalies=anomalies,
        mean=round(global_mean, 4),
        std_dev=round(global_std, 4),
        has_anomalies=len(anomalies) > 0,
    )
