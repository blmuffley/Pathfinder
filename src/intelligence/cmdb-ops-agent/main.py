"""Avennorth CMDB Ops Agent — 8 autonomous AI agents for CMDB lifecycle management."""

import logging
import os
import sys
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(__file__))

from agents import ALL_AGENTS
from models.types import AgentRunResult

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="Pathfinder CMDB Ops Agent",
    version="0.1.0",
    description="8 autonomous AI agents for continuous CMDB quality improvement.",
)


class RunAgentRequest(BaseModel):
    agent_name: str
    autonomy_level: int = 1
    dry_run: bool = False
    context: Dict[str, Any] = Field(default_factory=dict)


class RunAllRequest(BaseModel):
    autonomy_level: int = 1
    dry_run: bool = True
    context: Dict[str, Any] = Field(default_factory=dict)


AGENT_MAP = {cls.name: cls for cls in ALL_AGENTS}


@app.get("/health")
def health():
    return {"status": "ok", "service": "cmdb-ops-agent", "agents": list(AGENT_MAP.keys())}


@app.get("/api/v1/agents")
def list_agents():
    """List all available agents."""
    return {
        "agents": [
            {"name": cls.name, "description": cls.description}
            for cls in ALL_AGENTS
        ]
    }


@app.post("/api/v1/run", response_model=AgentRunResult)
async def run_agent(request: RunAgentRequest):
    """Run a single agent."""
    if request.agent_name not in AGENT_MAP:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Agent '{}' not found".format(request.agent_name))

    cls = AGENT_MAP[request.agent_name]
    agent = cls(autonomy_level=request.autonomy_level, dry_run=request.dry_run)
    return agent.run(request.context)


@app.post("/api/v1/run-all")
async def run_all(request: RunAllRequest):
    """Run all agents in sequence (except orchestrator, which runs last)."""
    results = []

    for cls in ALL_AGENTS:
        if cls.name == "remediation_orchestrator":
            continue
        agent = cls(autonomy_level=request.autonomy_level, dry_run=request.dry_run)
        result = agent.run(request.context)
        results.append(result)

    # Run orchestrator last with all results as context
    orch_context = dict(request.context)
    orch_context["agent_results"] = results
    orch = AGENT_MAP["remediation_orchestrator"](
        autonomy_level=request.autonomy_level, dry_run=request.dry_run
    )
    orch_result = orch.run(orch_context)
    results.append(orch_result)

    return {
        "total_agents": len(results),
        "total_findings": sum(r.findings_count for r in results),
        "total_recommendations": sum(r.recommendations_count for r in results),
        "results": [r.model_dump() for r in results],
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8082"))
    uvicorn.run(app, host="0.0.0.0", port=port)
