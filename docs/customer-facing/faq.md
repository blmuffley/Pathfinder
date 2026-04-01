# Avennorth Pathfinder — Frequently Asked Questions

## Discovery

**Q: Does Pathfinder replace ServiceNow Discovery?**
A: No. Pathfinder complements Discovery. ServiceNow Discovery maps infrastructure (servers, databases, applications). Pathfinder discovers the *integrations between* those CIs — the connections that represent how your applications talk to each other. Both can run simultaneously.

**Q: How does it discover integrations without code changes?**
A: Pathfinder uses eBPF probes on Linux (ETW on Windows) — a kernel-level technology that observes TCP/UDP connections without modifying any application code. It captures source IP, destination IP, port, protocol, and process name for every connection. The agent requires specific Linux capabilities (CAP_BPF) but does NOT run as root or privileged.

**Q: What's the performance overhead?**
A: Less than 1% CPU per host. The eBPF programs run in kernel space and emit events via a ring buffer. The agent binary uses less than 50MB memory. Network bandwidth is 1-10 KB/s depending on connection count.

**Q: What if we have custom applications on non-standard ports?**
A: Pathfinder ships with 40+ port classification rules. For custom ports, you can add rules to the gateway configuration. Custom applications initially get classified as "Custom" with lower confidence — you can then assign the correct type.

## Intelligence

**Q: How does the AI work?**
A: Pathfinder sends integration context (source, target, type, interfaces, health metrics) to Claude via the Anthropic API. Claude returns structured JSON with summaries, health assessments, and recommendations. The AI does NOT see raw network traffic — only metadata.

**Q: How much does the Claude API cost?**
A: Negligible. At 500 integrations, token costs are approximately $10/month. At 2,000 hosts, approximately $40/month. AI costs are less than 1% of license revenue.

**Q: What are the 8 CMDB Ops agents?**
A: DuplicateDetector, StaleRecordReaper, OrphanFinder, RelationshipValidator, ClassificationAuditor, ComplianceChecker, HealthScorer, and RemediationOrchestrator. Each runs on a schedule and follows a 5-phase lifecycle: observe → diagnose → recommend → act → verify. You control how far each agent goes via autonomy levels (0-3).

## Security

**Q: Does Pathfinder inspect packet contents?**
A: No. Pathfinder observes connection *metadata* only — IP addresses, ports, protocols, process names. It does NOT perform deep packet inspection, read HTTP headers, or capture application payloads.

**Q: What access does the agent need?**
A: Linux: CAP_BPF, CAP_PERFMON, CAP_NET_ADMIN capabilities (not root, not privileged). Windows: Administrator. Kubernetes: DaemonSet with hostNetwork and BPF capabilities.

**Q: How is data protected?**
A: Agent→Gateway: gRPC over TLS 1.2+. Gateway→ServiceNow: HTTPS with OAuth2. All credentials stored in K8s Secrets or environment variables, never in config files. See Security Architecture document for full details.

## Deployment

**Q: How long does deployment take?**
A: Proof of concept on 10-20 servers: 4 weeks. Full production with AI intelligence: 12 weeks. Autonomous operations: 24 weeks. See the Implementation Playbook for the Crawl/Walk/Run/Fly methodology.

**Q: What ServiceNow version is required?**
A: Utah or later. Pathfinder uses the Polaris workspace (Next Experience / UI Builder).

**Q: Can we deploy without Kubernetes?**
A: Yes. The gateway can run as a Docker container or bare-metal binary. Linux agents install via RPM/DEB. Windows agents via MSI. Kubernetes DaemonSet is optional for K8s environments.

## Pricing

**Q: How is Pathfinder priced?**
A: Annual subscription based on Managed Node count. A Managed Node is any endpoint where the Pathfinder agent is deployed (servers, VMs, cloud instances). Network devices, desktops, and anything discovered via agentless observation are included free.

**Q: What are the two packages?**
A: **Standard** includes Pathfinder Discovery Engine + CMDB Ops (automated hygiene, CI lifecycle, stale record cleanup). **Professional** adds Integration Intelligence (cross-platform data flow analysis, anomaly detection) and Service Map Intelligence (dependency mapping, unmapped service detection).

**Q: What are the price points?**
A: Pricing starts at $50,000/yr (Standard, up to 500 nodes) and $100,000/yr (Professional, up to 500 nodes). Per-node cost decreases at higher tiers. Engagements over 5,000 nodes are custom-quoted.

**Q: Is there a free trial?**
A: We offer a proof of concept at pilot pricing for qualified customers. Contact your Avennorth partner or sales@avennorth.com.
