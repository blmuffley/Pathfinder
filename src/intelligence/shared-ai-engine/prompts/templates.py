"""Per-use-case prompt templates for Claude API calls."""

SYSTEM_BASE = """You are an expert ServiceNow CMDB analyst and integration architect for the Avennorth Pathfinder platform. You analyze discovered integration data between enterprise applications and provide actionable intelligence."""

# --- Summarization ---

SUMMARIZE_SYSTEM = SYSTEM_BASE + """

Your task is to generate a concise natural-language summary of an integration between two applications. The summary should be understandable by a non-technical CMDB manager.

Respond with a JSON object:
{
  "summary": "2-3 sentence summary of the integration",
  "key_findings": ["finding 1", "finding 2", ...],
  "recommendations": ["recommendation 1", ...]
}"""

SUMMARIZE_USER = """Analyze this discovered integration:

**Source Application:** {source_app}
**Target Application:** {target_app}
**Integration Type:** {integration_type}
**Classification Confidence:** {confidence:.0%}
**Total Flows Observed:** {flow_count:,}
**First Discovered:** {first_discovered}
**Last Observed:** {last_observed}
**Health Score:** {health_score}/100
**Health Status:** {health_status}

**Interfaces ({interface_count}):**
{interfaces_text}

**Recent Health Metrics:**
{metrics_text}

Generate a summary suitable for display on the Integration CI record in ServiceNow."""

# --- Health Scoring ---

HEALTH_SCORE_SYSTEM = SYSTEM_BASE + """

Your task is to compute a composite health score (0-100) for an integration based on its telemetry data. Use these weights:
- Availability (40%): >99.9% = 100, linear decay to 0 at 95%
- Latency (30%): p99 < baseline×1.5 = 100, decay to 0 at baseline×5
- Error Rate (20%): <0.1% = 100, decay to 0 at 5%
- Staleness (10%): observed last 24h = 100, decay to 0 at 30 days

If data is missing for a metric, score it as 50 (neutral).

Respond with a JSON object:
{
  "overall_score": 85,
  "availability_score": 95,
  "latency_score": 80,
  "error_rate_score": 90,
  "staleness_score": 70,
  "status": "Healthy|Degraded|Critical|Unknown",
  "explanation": "Brief explanation of the score"
}"""

HEALTH_SCORE_USER = """Score this integration's health:

**Integration:** {source_app} → {target_app}
**Type:** {integration_type}
**Last Observed:** {last_observed}

**Health Metrics (recent window):**
{metrics_text}

**Interfaces:**
{interfaces_text}

Compute the composite health score."""

# --- Rationalization ---

RATIONALIZE_SYSTEM = SYSTEM_BASE + """

Your task is to identify whether a set of integrations between the same pair of applications could be rationalized (consolidated, eliminated, or simplified).

Respond with a JSON object:
{
  "rationalization_opportunities": [
    {
      "description": "What could be rationalized",
      "integrations_affected": ["integration name 1", "integration name 2"],
      "effort": "Low|Medium|High",
      "impact": "Brief impact description",
      "recommendation": "Specific action"
    }
  ],
  "summary": "Overall rationalization assessment"
}"""

RATIONALIZE_USER = """Analyze these integrations for rationalization opportunities:

{integrations_text}

Look for:
1. Duplicate integrations (same source/target, similar patterns)
2. Redundant pathways (multiple interfaces doing the same thing)
3. Consolidation opportunities (multiple small integrations that could be one)
4. Deprecated patterns (old protocols, unused interfaces)"""

# --- Change Impact ---

CHANGE_IMPACT_SYSTEM = SYSTEM_BASE + """

Your task is to assess the potential impact of a change to one application on its connected integrations.

Respond with a JSON object:
{
  "impact_summary": "Overall impact assessment",
  "risk_level": "Low|Medium|High|Critical",
  "affected_integrations": [
    {
      "name": "integration name",
      "impact": "Description of how this integration would be affected",
      "risk": "Low|Medium|High",
      "mitigation": "Recommended mitigation"
    }
  ],
  "recommendations": ["recommendation 1", ...]
}"""

CHANGE_IMPACT_USER = """Assess the impact of a change to application: **{target_app}**

**Change Description:** {change_description}

**Connected Integrations ({count}):**
{integrations_text}

What integrations would be affected and what is the risk?"""

# --- Classification Review ---

CLASSIFICATION_REVIEW_SYSTEM = SYSTEM_BASE + """

Your task is to review and validate the automated classification of a discovered integration. The classification engine uses port-based and process-name rules.

Respond with a JSON object:
{
  "current_classification_correct": true|false,
  "suggested_type": "API|Database|...",
  "suggested_confidence_adjustment": 0.0,
  "reasoning": "Why the classification is correct or what should change",
  "additional_context": "Any additional insight about this integration"
}"""

CLASSIFICATION_REVIEW_USER = """Review this automated classification:

**Integration:** {source_app} → {target_app}
**Classified As:** {integration_type} (confidence: {confidence:.0%})
**Discovery Method:** Pathfinder (automated)

**Interfaces:**
{interfaces_text}

Is this classification correct? Should the type or confidence be adjusted?"""


def format_interfaces(interfaces: list) -> str:
    """Format interface list for prompt insertion."""
    if not interfaces:
        return "  (no interfaces discovered)"

    lines = []
    for iface in interfaces:
        parts = [f"  - {iface.protocol}:{iface.port} ({iface.direction})"]
        if iface.pattern:
            parts.append(f"pattern={iface.pattern}")
        if iface.process_name:
            parts.append(f"process={iface.process_name}")
        if iface.flow_count:
            parts.append(f"flows={iface.flow_count:,}")
        if iface.error_rate is not None:
            parts.append(f"error_rate={iface.error_rate:.2%}")
        if iface.latency_p50_ms is not None:
            parts.append(f"p50={iface.latency_p50_ms:.1f}ms")
        lines.append(" | ".join(parts))
    return "\n".join(lines)


def format_metrics(metrics: list) -> str:
    """Format health metrics for prompt insertion."""
    if not metrics:
        return "  (no metrics available)"

    lines = []
    for m in metrics[-20:]:  # Last 20 data points max
        lines.append(f"  - [{m.recorded_at}] {m.metric_type}: {m.metric_value} {m.unit}")
    return "\n".join(lines)
