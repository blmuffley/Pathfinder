"""AI-powered summarization for Integration CIs.

Calls the Shared AI Engine's /api/v1/analyze endpoint to generate
natural-language summaries using Claude.
"""

import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

DEFAULT_AI_ENGINE_URL = "http://localhost:8080"


class Summarizer:
    """Generates AI summaries for integrations via the Shared AI Engine."""

    def __init__(self, ai_engine_url: Optional[str] = None):
        self.ai_engine_url = (ai_engine_url or DEFAULT_AI_ENGINE_URL).rstrip("/")
        self.client = httpx.Client(timeout=60.0)

    def summarize(
        self,
        source_app: str,
        target_app: str,
        integration_type: str,
        classification_confidence: float = 0.0,
        flow_count: int = 0,
        first_discovered: Optional[str] = None,
        last_observed: Optional[str] = None,
        health_score: Optional[int] = None,
        health_status: Optional[str] = None,
        interfaces: Optional[List[Dict[str, Any]]] = None,
        health_metrics: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Generate an AI summary for an integration.

        Returns:
            Dict with summary (str ≤4000), key_findings (list), recommendations (list).
        """
        payload = {
            "analysis_type": "summarize",
            "integration": {
                "source_app": source_app,
                "target_app": target_app,
                "integration_type": integration_type,
                "classification_confidence": classification_confidence,
                "flow_count": flow_count,
                "first_discovered": first_discovered,
                "last_observed": last_observed,
                "health_score": health_score,
                "health_status": health_status,
                "interfaces": interfaces or [],
                "health_metrics": health_metrics or [],
            },
        }

        try:
            resp = self.client.post(
                "{}/api/v1/analyze".format(self.ai_engine_url),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", {})
        except httpx.HTTPStatusError as e:
            logger.error("AI Engine returned %d: %s", e.response.status_code, e.response.text)
            return {"summary": "", "key_findings": [], "recommendations": [], "error": str(e)}
        except httpx.ConnectError as e:
            logger.error("Cannot reach AI Engine at %s: %s", self.ai_engine_url, e)
            return {"summary": "", "key_findings": [], "recommendations": [], "error": str(e)}

    def close(self):
        self.client.close()
