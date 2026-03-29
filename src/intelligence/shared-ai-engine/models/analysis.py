"""Request/response models for integration analysis."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AnalysisType(str, Enum):
    SUMMARIZE = "summarize"
    HEALTH_SCORE = "health_score"
    RATIONALIZE = "rationalize"
    CHANGE_IMPACT = "change_impact"
    CLASSIFICATION_REVIEW = "classification_review"


class InterfaceContext(BaseModel):
    """Context about an interface CI."""

    protocol: str
    port: int
    direction: str
    pattern: Optional[str] = None
    process_name: Optional[str] = None
    flow_count: int = 0
    avg_bytes: int = 0
    latency_p50_ms: Optional[float] = None
    latency_p99_ms: Optional[float] = None
    error_rate: Optional[float] = None


class HealthMetric(BaseModel):
    """A single health metric data point."""

    metric_type: str  # Latency, Throughput, ErrorRate, Availability
    metric_value: float
    unit: str = ""
    recorded_at: str


class IntegrationContext(BaseModel):
    """Context about an integration CI for analysis."""

    sys_id: Optional[str] = None
    source_app: str
    target_app: str
    integration_type: str
    classification_confidence: float = 0.0
    flow_count: int = 0
    first_discovered: Optional[str] = None
    last_observed: Optional[str] = None
    health_score: Optional[int] = None
    health_status: Optional[str] = None
    interfaces: List[InterfaceContext] = Field(default_factory=list)
    health_metrics: List[HealthMetric] = Field(default_factory=list)


class AnalysisRequest(BaseModel):
    """Request for an AI analysis."""

    analysis_type: AnalysisType
    integration: IntegrationContext
    additional_context: Dict[str, Any] = Field(default_factory=dict)


class AnalysisResponse(BaseModel):
    """Response from an AI analysis."""

    analysis_type: AnalysisType
    result: Dict[str, Any]
    tokens_used: int = 0
    model: str = ""
    cached: bool = False


class SummarizeResult(BaseModel):
    """Structured result for summarization."""

    summary: str = Field(..., max_length=4000)
    key_findings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class HealthScoreResult(BaseModel):
    """Structured result for health scoring."""

    overall_score: int = Field(..., ge=0, le=100)
    availability_score: int = Field(..., ge=0, le=100)
    latency_score: int = Field(..., ge=0, le=100)
    error_rate_score: int = Field(..., ge=0, le=100)
    staleness_score: int = Field(..., ge=0, le=100)
    status: str  # Healthy, Degraded, Critical, Unknown
    explanation: str = ""
