"""Request/response models for anomaly detection."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TimeSeriesPoint(BaseModel):
    """A single time-series data point."""

    timestamp: str
    value: float


class AnomalyRequest(BaseModel):
    """Request for anomaly detection on a time series."""

    metric_name: str
    series: list[TimeSeriesPoint] = Field(..., min_length=3)
    z_threshold: float = Field(default=2.5, ge=1.0, le=5.0)
    window_size: int = Field(default=20, ge=3, le=100)


class AnomalyPoint(BaseModel):
    """A detected anomaly."""

    timestamp: str
    value: float
    expected: float
    z_score: float
    direction: str  # "above" or "below"


class AnomalyResponse(BaseModel):
    """Response from anomaly detection."""

    metric_name: str
    total_points: int
    anomaly_count: int
    anomalies: list[AnomalyPoint] = Field(default_factory=list)
    mean: float
    std_dev: float
    has_anomalies: bool = False
