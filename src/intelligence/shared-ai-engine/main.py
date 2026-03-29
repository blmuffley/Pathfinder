"""Avennorth Shared AI Engine — LLM orchestration and anomaly detection."""

import logging
import os
import sys

from fastapi import FastAPI

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from routers.analysis import router as analysis_router  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(
    title="Pathfinder Shared AI Engine",
    version="0.1.0",
    description="LLM orchestration, anomaly detection, and shared AI services for the Pathfinder platform.",
)

app.include_router(analysis_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "shared-ai-engine"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
