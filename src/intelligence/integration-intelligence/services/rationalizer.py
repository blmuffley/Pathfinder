"""Integration rationalization — detect duplicates, redundancies, and consolidation opportunities."""

import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

DEFAULT_AI_ENGINE_URL = "http://localhost:8080"


class Rationalizer:
    """Detects rationalization opportunities across integrations."""

    def __init__(self, ai_engine_url: Optional[str] = None):
        self.ai_engine_url = (ai_engine_url or DEFAULT_AI_ENGINE_URL).rstrip("/")
        self.client = httpx.Client(timeout=60.0)

    def find_duplicates(self, integrations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find potential duplicate integrations using heuristics.

        Duplicates = same source+target pair with different sys_ids,
        or reverse direction of same pair.
        """
        seen = {}  # (source, target) → integration
        duplicates = []

        for integ in integrations:
            src = integ.get("source_app", "")
            tgt = integ.get("target_app", "")
            key = (src, tgt)
            reverse_key = (tgt, src)

            if key in seen:
                duplicates.append({
                    "type": "exact_duplicate",
                    "integrations": [seen[key].get("name", key), integ.get("name", key)],
                    "description": "Same source→target pair discovered multiple times",
                    "effort": "Low",
                    "recommendation": "Merge into single Integration CI",
                })
            elif reverse_key in seen:
                duplicates.append({
                    "type": "bidirectional_candidate",
                    "integrations": [seen[reverse_key].get("name", reverse_key), integ.get("name", key)],
                    "description": "Reverse direction exists — may be a single bidirectional integration",
                    "effort": "Medium",
                    "recommendation": "Review if both directions represent one logical integration",
                })
            else:
                seen[key] = integ

        return duplicates

    def find_redundant_interfaces(self, integration: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find redundant interfaces within a single integration.

        Redundant = multiple interfaces on same port with different protocols,
        or same protocol/port with negligible traffic on one.
        """
        interfaces = integration.get("interfaces", [])
        redundancies = []

        # Group by port
        by_port = {}  # type: Dict[int, List[Dict]]
        for iface in interfaces:
            port = iface.get("port", 0)
            by_port.setdefault(port, []).append(iface)

        for port, ifaces in by_port.items():
            if len(ifaces) <= 1:
                continue

            # Check for same port, different protocols
            protocols = set(i.get("protocol", "") for i in ifaces)
            if len(protocols) > 1:
                total_flows = sum(i.get("flow_count", 0) for i in ifaces)
                for iface in ifaces:
                    fc = iface.get("flow_count", 0)
                    if total_flows > 0 and fc / total_flows < 0.05:
                        redundancies.append({
                            "type": "low_traffic_interface",
                            "port": port,
                            "protocol": iface.get("protocol"),
                            "flow_count": fc,
                            "total_flows": total_flows,
                            "description": "Interface has <5% of traffic on this port",
                            "recommendation": "Consider removing or investigating",
                        })

        return redundancies

    def analyze_with_ai(
        self,
        integrations: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Use AI to find deeper rationalization opportunities."""
        if not integrations:
            return {"rationalization_opportunities": [], "summary": "No integrations to analyze."}

        # Use the first integration as context (AI will analyze the set)
        payload = {
            "analysis_type": "rationalize",
            "integration": integrations[0],
            "additional_context": {
                "all_integrations": integrations,
            },
        }

        try:
            resp = self.client.post(
                "{}/api/v1/analyze".format(self.ai_engine_url),
                json=payload,
            )
            resp.raise_for_status()
            return resp.json().get("result", {})
        except Exception as e:
            logger.error("AI rationalization failed: %s", e)
            return {"rationalization_opportunities": [], "summary": "AI analysis unavailable.", "error": str(e)}

    def close(self):
        self.client.close()
