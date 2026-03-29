"""Avennorth Integration Intelligence — health scoring, summarization, rationalization, EA reconciliation."""

import logging
import os
import sys

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

sys.path.insert(0, os.path.dirname(__file__))

from services.health_scorer import compute_health_score
from services.ea_reconciler import EAReconciler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="Pathfinder Integration Intelligence",
    version="0.1.0",
    description="Health scoring, AI summarization, rationalization, and EA reconciliation for Integration CIs.",
)


# --- Request/Response Models ---

class HealthScoreRequest(BaseModel):
    metrics: List[Dict[str, Any]] = Field(default_factory=list)
    last_observed: Optional[str] = None
    latency_baseline_ms: float = 100.0


class HealthScoreResponse(BaseModel):
    overall_score: int
    availability_score: int
    latency_score: int
    error_rate_score: int
    staleness_score: int
    status: str
    explanation: str


class ReconcileRequest(BaseModel):
    integrations: List[Dict[str, Any]]
    ea_relationships: List[Dict[str, Any]]


class ReconcileResponse(BaseModel):
    results: Dict[str, List[Dict[str, Any]]]
    total_integrations: int
    total_matched: int


class DuplicateCheckRequest(BaseModel):
    integrations: List[Dict[str, Any]]


class DuplicateCheckResponse(BaseModel):
    duplicates: List[Dict[str, Any]]
    count: int


# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "integration-intelligence"}


@app.post("/api/v1/health-score", response_model=HealthScoreResponse)
async def health_score(request: HealthScoreRequest) -> HealthScoreResponse:
    """Compute composite health score for an integration."""
    result = compute_health_score(
        metrics=request.metrics,
        last_observed=request.last_observed,
        latency_baseline_ms=request.latency_baseline_ms,
    )
    return HealthScoreResponse(**result)


@app.post("/api/v1/reconcile", response_model=ReconcileResponse)
async def reconcile(request: ReconcileRequest) -> ReconcileResponse:
    """Reconcile integrations against EA relationships."""
    reconciler = EAReconciler()
    results = reconciler.reconcile_batch(request.integrations, request.ea_relationships)

    total_matched = sum(1 for matches in results.values() if matches)
    return ReconcileResponse(
        results=results,
        total_integrations=len(request.integrations),
        total_matched=total_matched,
    )


@app.post("/api/v1/duplicates", response_model=DuplicateCheckResponse)
async def check_duplicates(request: DuplicateCheckRequest) -> DuplicateCheckResponse:
    """Check for duplicate or bidirectional integration candidates."""
    from services.rationalizer import Rationalizer
    rationalizer = Rationalizer()
    duplicates = rationalizer.find_duplicates(request.integrations)
    return DuplicateCheckResponse(duplicates=duplicates, count=len(duplicates))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8081"))
    uvicorn.run(app, host="0.0.0.0", port=port)
