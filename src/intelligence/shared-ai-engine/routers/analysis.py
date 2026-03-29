"""Analysis router — AI-powered integration analysis endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException

from models.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisType,
)
from models.anomaly import AnomalyRequest, AnomalyResponse
from prompts import templates
from services.anomaly import detect_anomalies
from services.claude_client import ClaudeClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["analysis"])

# Lazily initialized Claude client
_claude: Optional[ClaudeClient] = None


def get_claude() -> ClaudeClient:
    global _claude
    if _claude is None:
        _claude = ClaudeClient()
    return _claude


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest) -> AnalysisResponse:
    """Run an AI analysis on an integration.

    Supports: summarize, health_score, rationalize, change_impact, classification_review.
    """
    claude = get_claude()
    integration = request.integration
    interfaces_text = templates.format_interfaces(integration.interfaces)
    metrics_text = templates.format_metrics(integration.health_metrics)

    if request.analysis_type == AnalysisType.SUMMARIZE:
        system = templates.SUMMARIZE_SYSTEM
        user_msg = templates.SUMMARIZE_USER.format(
            source_app=integration.source_app,
            target_app=integration.target_app,
            integration_type=integration.integration_type,
            confidence=integration.classification_confidence,
            flow_count=integration.flow_count,
            first_discovered=integration.first_discovered or "Unknown",
            last_observed=integration.last_observed or "Unknown",
            health_score=integration.health_score or "N/A",
            health_status=integration.health_status or "Unknown",
            interface_count=len(integration.interfaces),
            interfaces_text=interfaces_text,
            metrics_text=metrics_text,
        )

    elif request.analysis_type == AnalysisType.HEALTH_SCORE:
        system = templates.HEALTH_SCORE_SYSTEM
        user_msg = templates.HEALTH_SCORE_USER.format(
            source_app=integration.source_app,
            target_app=integration.target_app,
            integration_type=integration.integration_type,
            last_observed=integration.last_observed or "Unknown",
            metrics_text=metrics_text,
            interfaces_text=interfaces_text,
        )

    elif request.analysis_type == AnalysisType.CLASSIFICATION_REVIEW:
        system = templates.CLASSIFICATION_REVIEW_SYSTEM
        user_msg = templates.CLASSIFICATION_REVIEW_USER.format(
            source_app=integration.source_app,
            target_app=integration.target_app,
            integration_type=integration.integration_type,
            confidence=integration.classification_confidence,
            interfaces_text=interfaces_text,
        )

    elif request.analysis_type == AnalysisType.CHANGE_IMPACT:
        system = templates.CHANGE_IMPACT_SYSTEM
        user_msg = templates.CHANGE_IMPACT_USER.format(
            target_app=integration.target_app,
            change_description=request.additional_context.get("change_description", "Unspecified change"),
            count=len(integration.interfaces),
            integrations_text=interfaces_text,
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported analysis type: {request.analysis_type}")

    try:
        result = claude.complete_json(system, user_msg)
        usage = claude.get_usage()
        return AnalysisResponse(
            analysis_type=request.analysis_type,
            result=result,
            tokens_used=usage["total_tokens"],
            model=claude.model,
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail="AI response parsing failed: {}".format(e))
    except (RuntimeError, TypeError) as e:
        raise HTTPException(status_code=503, detail="AI service unavailable: {}".format(e))


@router.post("/anomaly", response_model=AnomalyResponse)
async def anomaly(request: AnomalyRequest) -> AnomalyResponse:
    """Detect anomalies in a time series using rolling Z-score."""
    return detect_anomalies(request)


@router.get("/usage")
async def usage() -> dict:
    """Return cumulative token usage stats."""
    return ClaudeClient.get_usage()
