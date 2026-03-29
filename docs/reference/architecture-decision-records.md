# Architecture Decision Records (ADRs)

## ADR-001: eBPF for Linux Network Capture

**Status:** Accepted
**Date:** 2026-01

**Context:** Need kernel-level TCP/UDP flow capture on Linux with <1% CPU overhead and zero code changes to monitored applications.

**Decision:** Use eBPF with tracepoints (tcp_connect, inet_sock_set_state) and kprobes (udp_sendmsg) via the cilium/ebpf Go library.

**Alternatives considered:**
- **libpcap / tcpdump** — High overhead at scale (copies every packet to userspace). No process name resolution.
- **iptables logging** — Kernel overhead. No connection lifecycle tracking. Noisy.
- **Application SDK / sidecar** — Requires code changes per application. Not viable for brownfield environments.
- **conntrack** — Only shows current connections, not lifecycle. No byte counts.

**Consequences:** Requires Linux 5.8+ with BTF. macOS development requires a mock stub. Windows uses ETW (separate implementation). Container runtime detection via cgroups.

---

## ADR-002: Go for Gateway and Agents, Python for Intelligence

**Status:** Accepted
**Date:** 2026-01

**Context:** Gateway handles high-throughput gRPC streaming (10k+ flows/sec). Intelligence products call Claude API and do statistical analysis.

**Decision:** Go for the gateway and all agents. Python for all intelligence services.

**Rationale:**
- **Go:** Single binary deployment. gRPC native. eBPF via cilium/ebpf. Excellent concurrency for flow ingestion. Cross-compilation for Windows/Linux/arm64.
- **Python:** Anthropic SDK is Python-first. NumPy for Z-score anomaly detection. FastAPI for rapid API development. Pydantic for validation. Rich ML/AI ecosystem if we add features.

**Alternatives considered:**
- **All Go** — Would need to wrap Claude API manually (no official Go SDK at time of decision). Statistical libraries are weaker.
- **All Python** — Too slow for flow ingestion. No eBPF support. Binary distribution harder.
- **Rust** — Excellent for agents but hiring difficulty and slower iteration on intelligence features.

**Consequences:** Two language ecosystems to maintain. Developers need Go + Python skills. CI/CD pipeline runs both test suites. Docker images differ (Alpine for Go, slim for Python).

---

## ADR-003: PostgreSQL (not TimescaleDB) for Flow Storage

**Status:** Accepted
**Date:** 2026-01

**Context:** Need to store raw flow records (time-series-like) and classified integration records (relational).

**Decision:** Standard PostgreSQL 16 with native table partitioning (monthly by captured_at).

**Rationale:** PostgreSQL handles both workloads. Monthly partitions provide retention management. No need for hypertable abstraction. Managed PG (RDS, Cloud SQL) is universally available. Schema migrations are simple SQL.

**Alternatives considered:**
- **TimescaleDB** — Better for high-cardinality time-series queries. But overkill for flow data that's written once and classified. Adds deployment complexity.
- **ClickHouse** — Excellent write throughput but poor for relational queries on classified data.
- **SQLite** — Embedded, zero-ops. But no concurrent writers. Doesn't scale past single gateway.

**Consequences:** Monthly partition creation must be automated (or pre-created). Vacuum maintenance required on raw_flows. At >50M rows/day, may need to revisit for TimescaleDB.

---

## ADR-004: Confidence Scoring via Rules + Modifiers (not ML)

**Status:** Accepted
**Date:** 2026-01

**Context:** Need to score confidence (0.0-1.0) on every classified integration. Must be explainable, deterministic, and fast.

**Decision:** Port-based rules (0.90 base) + process-name rules (0.85 base) + 4 modifiers (flow count, consistency, process-port agreement, ephemeral port penalty). Simple arithmetic clamped to [0.0, 1.0].

**Alternatives considered:**
- **6-factor weighted model** (v0.2 design: frequency/volume/duration/recency/consistency/bidirectionality) — More sophisticated but requires significant historical data before scoring is useful. Harder to explain to customers.
- **ML classifier** — Requires training data we don't have at launch. Black box. Drift risk.
- **No scoring** (binary classified/not) — Loses nuance. Can't set thresholds.

**Rationale:** Rules are explainable ("this scored 0.90 because port 5432 = PostgreSQL, plus process name confirms"). Works from first flow. Customers can understand and override. The 4 modifiers add nuance without complexity.

**Consequences:** Custom applications on non-standard ports get low confidence (0.30 default). Customers need to add custom rules for proprietary protocols. This is a feature (forces explicit classification) not a bug.

---

## ADR-005: Extend cmdb_ci (not full CSDM taxonomy)

**Status:** Accepted
**Date:** 2026-01

**Context:** ServiceNow CSDM defines a complex taxonomy (Business Application, Technical Service, Application Service, etc.). Pathfinder discovers integrations between applications.

**Decision:** Create `x_avnth_cmdb_ci_integration` and `x_avnth_cmdb_ci_interface` extending `cmdb_ci` directly. Do not attempt to map into the full CSDM hierarchy.

**Rationale:** Full CSDM mapping requires knowledge of the customer's specific CSDM implementation (which varies widely). Integration CIs extending cmdb_ci inherit all standard CI fields (operational_status, sys_class_name, etc.) and show up in CMDB views. This is sufficient for service map visualization and relationship queries.

**Alternatives considered:**
- **Map to cmdb_ci_service + svc_ci_assoc** — Requires understanding application service boundaries before mapping. Chicken-and-egg problem.
- **Custom tables (not extending cmdb_ci)** — Loses CMDB integration. Can't use Dependency View, Service Map widget, or standard CMDB queries.
- **Use cmdb_rel_ci only** — No custom fields for health score, AI summary, confidence. Relationship-only model is too limited.

**Consequences:** Pathfinder CIs are first-class CMDB citizens but don't auto-populate the CSDM Application Service layer. Customers who want full CSDM mapping need a Phase 2 engagement to link Integration CIs to their Business Applications.

---

## ADR-006: 5-Phase Agent Lifecycle (observe/diagnose/recommend/act/verify)

**Status:** Accepted
**Date:** 2026-01

**Context:** CMDB Ops agents need to find problems, analyze root causes, propose fixes, execute them, and confirm success. Must support different levels of human oversight.

**Decision:** Every agent implements 5 abstract methods. A `run()` method executes them in sequence, gated by the autonomy level setting (0-3).

**Rationale:** The 5-phase pattern maps naturally to ITIL problem management (identification → diagnosis → resolution → review). Autonomy gating allows progressive trust — start at level 1 (recommend), promote to level 2 (act with CR) after validation, eventually level 3 (autonomous) for low-risk agents.

**Alternatives considered:**
- **Simple rules engine** — Detect + fix. No diagnosis or verification. Too brittle.
- **Workflow engine** — More flexible but over-engineered for 8 specific agents.
- **ServiceNow Flow Designer only** — Could implement the logic in SN but loses Python AI capabilities. Harder to test.

**Consequences:** Each agent is self-contained (single Python file). Adding a 9th agent requires implementing 3-5 methods. The RemediationOrchestrator (meta-agent) can collect results from all agents and deconflict.

---

## ADR-007: Compass as Distribution (no direct sales team)

**Status:** Accepted
**Date:** 2026-01

**Context:** Pathfinder needs to reach ServiceNow customers. Traditional enterprise SaaS requires 4-6 AEs by Year 3 ($600k-$1.2M/year in sales compensation).

**Decision:** Distribute exclusively through Avennorth's Compass platform. Consulting firms deploy Pathfinder as a SOW line item during ServiceNow implementations. 1-2 channel managers replace an entire sales org.

**Rationale:** CAC drops from $35-50k to $8-15k. Sales cycle drops from 3-6 months to 2-4 weeks. NRR increases to 145-165% because partners are incentivized to expand. Avennorth stays at 14 people with $2.86M ARR/employee.

**Consequences:** Revenue per deal is lower (partner takes 20-30% markup). No control over deployment quality (depends on partner competence). Must invest in partner enablement materials and training. Direct sales channel remains available as fallback.

---

## ADR-008: Claude for AI Intelligence (not self-hosted LLM)

**Status:** Accepted
**Date:** 2026-01

**Context:** Integration Intelligence needs NLP summarization, health assessment, and rationalization analysis. Requires structured JSON output from a language model.

**Decision:** Use Anthropic Claude API via the official Python SDK. Wrap in a shared client with retry, token tracking, and structured output parsing.

**Rationale:** Claude produces high-quality structured JSON. Anthropic's API is reliable and cost-effective (~$10/month at 500 integrations). No GPU infrastructure to manage. Model improvements are automatic.

**Alternatives considered:**
- **Self-hosted LLM (Llama, Mistral)** — Requires GPU infrastructure ($2-5k/month). Worse JSON adherence. Maintenance burden.
- **OpenAI GPT-4** — Comparable quality but higher cost. Anthropic is a better strategic alignment for the product positioning.
- **No AI** — Removes the primary differentiator. Health scoring could be rule-based but summarization and rationalization require NLP.

**Consequences:** Dependency on Anthropic API availability. Must handle rate limits and retry. API key management is a security concern. Token costs scale linearly but remain <1% of revenue at all projected scales.
