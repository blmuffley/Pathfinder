"""Coverage Analyzer — compares agent inventory against server population to find gaps.

Gap types:
  NoAgent    — server has no enrolled agent
  StaleAgent — agent exists but no heartbeat in 7+ days
  WrongTier  — agent coverage tier is below required tier

Priority rules:
  Critical — production + critical app
  High     — production + non-critical + >5 integrations
  Medium   — production + non-critical + ≤5 integrations
  Low      — non-production
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

STALE_HEARTBEAT_DAYS = 7


class CoverageGap:
    """Represents a detected coverage gap."""

    def __init__(
        self,
        server_id: str,
        server_name: str,
        gap_type: str,
        required_tier: int,
        current_tier: int,
        priority: str,
        environment: str = "production",
        integration_count: int = 0,
        agent_id: Optional[str] = None,
        last_heartbeat: Optional[str] = None,
    ):
        self.server_id = server_id
        self.server_name = server_name
        self.gap_type = gap_type
        self.required_tier = required_tier
        self.current_tier = current_tier
        self.priority = priority
        self.environment = environment
        self.integration_count = integration_count
        self.agent_id = agent_id
        self.last_heartbeat = last_heartbeat
        self.detected_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "server_id": self.server_id,
            "server_name": self.server_name,
            "gap_type": self.gap_type,
            "required_tier": self.required_tier,
            "current_tier": self.current_tier,
            "priority": self.priority,
            "environment": self.environment,
            "integration_count": self.integration_count,
            "agent_id": self.agent_id,
            "last_heartbeat": self.last_heartbeat,
            "detected_at": self.detected_at,
        }


def _compute_priority(
    environment: str,
    is_critical_app: bool,
    integration_count: int,
) -> str:
    if environment == "production":
        if is_critical_app:
            return "Critical"
        if integration_count > 5:
            return "High"
        return "Medium"
    return "Low"


def analyze_coverage(
    servers: List[Dict[str, Any]],
    agents: List[Dict[str, Any]],
    required_tier: int = 2,
) -> Dict[str, Any]:
    """Compare agent inventory against server population.

    Args:
        servers: List of server dicts with sys_id, name, environment,
                 is_critical, integration_count.
        agents: List of agent dicts with agent_id, server_id, status,
                coverage_tier, last_heartbeat.
        required_tier: Minimum acceptable coverage tier.

    Returns:
        Dict with gaps list, coverage stats.
    """
    now = datetime.now(timezone.utc)

    # Index agents by server_id
    agent_by_server = {}  # type: Dict[str, Dict]
    for agent in agents:
        srv = agent.get("server_id", "")
        if srv:
            agent_by_server[srv] = agent

    gaps = []
    covered = 0
    total = len(servers)

    for server in servers:
        srv_id = server.get("sys_id", "")
        srv_name = server.get("name", "")
        env = server.get("environment", "production")
        is_critical = server.get("is_critical", False)
        integ_count = server.get("integration_count", 0)
        priority = _compute_priority(env, is_critical, integ_count)

        agent = agent_by_server.get(srv_id)

        if not agent:
            # NoAgent gap
            gaps.append(CoverageGap(
                server_id=srv_id, server_name=srv_name,
                gap_type="NoAgent", required_tier=required_tier,
                current_tier=0, priority=priority,
                environment=env, integration_count=integ_count,
            ))
            continue

        # Check agent status
        status = agent.get("status", "Active")
        if status == "Decommissioned":
            gaps.append(CoverageGap(
                server_id=srv_id, server_name=srv_name,
                gap_type="NoAgent", required_tier=required_tier,
                current_tier=0, priority=priority,
                environment=env, integration_count=integ_count,
                agent_id=agent.get("agent_id"),
            ))
            continue

        # Check heartbeat staleness
        last_hb = agent.get("last_heartbeat")
        if last_hb:
            try:
                if isinstance(last_hb, str):
                    if last_hb.endswith("Z"):
                        last_hb = last_hb[:-1] + "+00:00"
                    hb_dt = datetime.fromisoformat(last_hb)
                    if hb_dt.tzinfo is None:
                        hb_dt = hb_dt.replace(tzinfo=timezone.utc)
                    days_since = (now - hb_dt).days
                    if days_since >= STALE_HEARTBEAT_DAYS:
                        gaps.append(CoverageGap(
                            server_id=srv_id, server_name=srv_name,
                            gap_type="StaleAgent", required_tier=required_tier,
                            current_tier=agent.get("coverage_tier", 0),
                            priority=priority, environment=env,
                            integration_count=integ_count,
                            agent_id=agent.get("agent_id"),
                            last_heartbeat=str(last_hb),
                        ))
                        continue
            except (ValueError, TypeError):
                pass

        # Check coverage tier
        current_tier = agent.get("coverage_tier", 0)
        if current_tier < required_tier:
            gaps.append(CoverageGap(
                server_id=srv_id, server_name=srv_name,
                gap_type="WrongTier", required_tier=required_tier,
                current_tier=current_tier, priority=priority,
                environment=env, integration_count=integ_count,
                agent_id=agent.get("agent_id"),
            ))
            continue

        covered += 1

    coverage_pct = (covered / total * 100) if total > 0 else 0.0

    return {
        "total_servers": total,
        "covered_servers": covered,
        "coverage_percent": round(coverage_pct, 1),
        "gap_count": len(gaps),
        "gaps_by_type": {
            "NoAgent": sum(1 for g in gaps if g.gap_type == "NoAgent"),
            "StaleAgent": sum(1 for g in gaps if g.gap_type == "StaleAgent"),
            "WrongTier": sum(1 for g in gaps if g.gap_type == "WrongTier"),
        },
        "gaps_by_priority": {
            "Critical": sum(1 for g in gaps if g.priority == "Critical"),
            "High": sum(1 for g in gaps if g.priority == "High"),
            "Medium": sum(1 for g in gaps if g.priority == "Medium"),
            "Low": sum(1 for g in gaps if g.priority == "Low"),
        },
        "gaps": [g.to_dict() for g in gaps],
    }
