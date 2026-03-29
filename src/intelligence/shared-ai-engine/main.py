"""Avennorth Shared AI Engine — LLM orchestration and anomaly detection."""

import os

from fastapi import FastAPI

app = FastAPI(title="Pathfinder Shared AI Engine", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
