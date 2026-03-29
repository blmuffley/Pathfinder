"""Avennorth Service Map Intelligence — coverage, risk, change impact, health analytics."""

import logging
import os
import sys
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(__file__))

from services.coverage_analyzer import analyze_coverage
from services.risk_scorer import score_all_applications, score_application_risk
from services.change_impact import analyze_change_impact
from services.health_analytics import compute_health_summary, find_health_outliers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="Pathfinder Service Map Intelligence",
    version="0.1.0",
    description="Coverage analysis, risk scoring, change impact, and health analytics.",
)


# --- Request Models ---

class CoverageRequest(BaseModel):
    servers: List[Dict[str, Any]]
    agents: List[Dict[str, Any]]
    required_tier: int = 2


class RiskScoreRequest(BaseModel):
    applications: List[Dict[str, Any]]


class ChangeImpactRequest(BaseModel):
    target_app: str
    change_description: str
    integrations: List[Dict[str, Any]]
    max_hops: int = 2


class HealthSummaryRequest(BaseModel):
    integrations: List[Dict[str, Any]]
    outlier_threshold: int = 40


# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "service-map-intelligence"}


@app.post("/api/v1/coverage")
async def coverage(request: CoverageRequest):
    """Analyze agent coverage across server population."""
    return analyze_coverage(request.servers, request.agents, request.required_tier)


@app.post("/api/v1/risk")
async def risk(request: RiskScoreRequest):
    """Score risk for all applications."""
    return score_all_applications(request.applications)


@app.post("/api/v1/change-impact")
async def change_impact(request: ChangeImpactRequest):
    """Analyze impact of a change to an application."""
    return analyze_change_impact(
        request.target_app, request.change_description,
        request.integrations, request.max_hops,
    )


@app.post("/api/v1/health-summary")
async def health_summary(request: HealthSummaryRequest):
    """Compute aggregate health statistics and find outliers."""
    summary = compute_health_summary(request.integrations)
    outliers = find_health_outliers(request.integrations, request.outlier_threshold)
    return {**summary, "outliers": outliers, "outlier_count": len(outliers)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8083"))
    uvicorn.run(app, host="0.0.0.0", port=port)
