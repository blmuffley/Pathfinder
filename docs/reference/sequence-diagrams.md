# Avennorth Pathfinder — Sequence Diagrams

## 1. Agent Enrollment

```
Agent                          Gateway                       PostgreSQL
  |                               |                               |
  |── EnrollmentRequest ─────────>|                               |
  |   (token, hostname, os, ver)  |                               |
  |                               |── INSERT agents ──────────────>|
  |                               |   (agent_id=UUID, status=active)|
  |                               |<── OK ─────────────────────────|
  |<── EnrollmentResponse ────────|                               |
  |   (agent_id, cert)            |                               |
  |                               |                               |
  |── [Save agent_id to disk] ────|                               |
  |   /var/lib/pathfinder/agent-id|                               |
  |                               |                               |
  |── Heartbeat (every 30s) ─────>|── UPDATE last_heartbeat ─────>|
  |<── Ack ───────────────────────|<── OK ─────────────────────────|
```

## 2. Flow Capture & Ingestion

```
Kernel (eBPF)        Agent               Gateway              PostgreSQL
  |                    |                    |                      |
  |── flow_event ─────>|                    |                      |
  |── flow_event ─────>|                    |                      |
  |── flow_event ─────>|                    |                      |
  |                    |── [Batch: 100      |                      |
  |                    |    flows or 10s]   |                      |
  |                    |                    |                      |
  |                    |── SendFlows ──────>|                      |
  |                    |   (FlowBatch)      |── INSERT raw_flows ─>|
  |                    |                    |   (batch insert)     |
  |                    |                    |<── OK ───────────────|
  |                    |<── Ack ────────────|                      |
  |                    |                    |                      |
```

## 3. Classification Engine

```
                  Classification Loop (every 10s)
                         Gateway
                           |
PostgreSQL                 |
  |<── SELECT raw_flows ───|  WHERE classified=FALSE LIMIT 1000
  |── [unclassified rows]─>|
  |                        |
  |                        |── [Group by (srcIP, dstIP, dstPort, protocol)]
  |                        |── [Apply port rules → confidence 0.90]
  |                        |── [Apply process rules → confidence 0.85]
  |                        |── [Apply modifiers: flow count, consistency,
  |                        |    process confirms port, ephemeral port]
  |                        |── [Clamp confidence to 0.0-1.0]
  |                        |
  |                        |── [For each classified group:]
  |<── UPSERT classified_  |
  |    integrations ───────|   (source_app, target_app, type, confidence)
  |<── UPSERT classified_  |
  |    interfaces ─────────|   (integration_id, protocol, port, direction)
  |<── UPDATE raw_flows ───|   SET classified=TRUE
  |                        |
```

## 4. ServiceNow Sync

```
Gateway                     ServiceNow
SN Sync Loop (every 60s)      |
  |                            |
  |── [Query unsynced          |
  |    integrations]           |
  |                            |
  |── POST /oauth_token.do ──>|
  |   (client_id, secret)     |
  |<── access_token ──────────|
  |                            |
  |── POST /api/x_avnth/     |
  |   pathfinder/v1/          |
  |   integrations ──────────>|── [Upsert Integration CIs]
  |   (batch of 50)           |── [Business rule: auto-name]
  |                            |── [Business rule: health status]
  |<── { results: [{sys_id,  |
  |      operation}] } ───────|
  |                            |
  |── [Mark synced in PG]     |
  |── [Insert sn_sync_log]    |
  |                            |
```

## 5. Health Scoring

```
Scheduled Job (SN)          Integration Intelligence       Shared AI Engine
  |                              |                              |
  |── POST /api/v1/             |                              |
  |   health-score ────────────>|                              |
  |   (metrics, last_observed)  |                              |
  |                              |── score_availability()       |
  |                              |   (99.9%=100, 95%=0)        |
  |                              |── score_latency()            |
  |                              |   (baseline*1.5=100, *5=0)  |
  |                              |── score_error_rate()         |
  |                              |   (<0.1%=100, 5%=0)         |
  |                              |── score_staleness()          |
  |                              |   (24h=100, 30d=0)          |
  |                              |── weighted_sum()             |
  |                              |   (A*40 + L*30 + E*20 + S*10)|
  |<── { overall_score: 85,     |                              |
  |      status: "Healthy" } ───|                              |
  |                              |                              |
  |── [Optional: AI summary]    |                              |
  |── POST /api/v1/analyze ────>|── POST /api/v1/analyze ─────>|
  |   (type: summarize)         |   (forward to AI engine)     |── Claude API
  |                              |                              |<── JSON response
  |<── { summary: "..." } ──────|<── { result: {...} } ────────|
  |                              |                              |
  |── [Update SN Integration CI]|                              |
  |   health_score, ai_summary  |                              |
```

## 6. CMDB Ops Agent Lifecycle

```
Scheduled Job           CMDB Ops Agent              ServiceNow
(daily 02:00 UTC)           |                           |
  |                          |                           |
  |── POST /api/v1/run ────>|                           |
  |   (agent: duplicate_    |                           |
  |    detector, level: 1)  |                           |
  |                          |                           |
  |                          |── Phase 1: observe() ────|
  |                          |   [Scan integration data] |
  |                          |   → findings[]            |
  |                          |                           |
  |                          |── Phase 2: diagnose()     |
  |                          |   [Root cause analysis]   |
  |                          |   → diagnoses[]           |
  |                          |                           |
  |                          |── Phase 3: recommend()    |
  |                          |   [Propose actions]       |
  |                          |   → recommendations[]     |
  |                          |                           |
  |                          |── [Autonomy gate]         |
  |                          |   Level 0: STOP (report)  |
  |                          |   Level 1: STOP (recommend)|
  |                          |   Level 2: → act()        |
  |                          |   Level 3: → act()        |
  |                          |                           |
  |                          |── Phase 4: act() ────────>|
  |                          |   [Create Change Request] |
  |                          |   [Update CIs]            |
  |                          |                           |
  |                          |── Phase 5: verify() ─────>|
  |                          |   [Confirm changes]       |
  |                          |                           |
  |<── AgentRunResult ───────|                           |
  |   (findings, diagnoses,  |                           |
  |    recommendations,      |                           |
  |    actions, verifications)|                           |
```

## 7. Coverage Gap Self-Healing Flow

```
New Gap Record              Flow Designer               ServiceNow
(INSERT trigger)               |                           |
  |                            |                           |
  |── trigger ────────────────>|                           |
  |                            |── Step 1: EVALUATE        |
  |                            |   auto_deploy enabled?    |
  |                            |   priority <= Medium?     |
  |                            |                           |
  |                            |── Step 2: PREREQUISITES   |
  |                            |   Server reachable?       |
  |                            |   OS supported?           |
  |                            |   Change freeze?          |
  |                            |                           |
  |               [If auto]    |── Step 3b: CREATE         |
  |                            |   Standard CR ───────────>|── [Auto-approved]
  |               [If manual]  |── Step 3a: CREATE         |
  |                            |   Normal CR ─────────────>|── [Awaits approval]
  |                            |                           |
  |               [If auto]    |── Step 4: DEPLOY          |
  |                            |   Subflow: deploy_agent   |
  |                            |   (Linux: Ansible/RPM)    |
  |                            |   (Windows: SCCM/MSI)     |
  |                            |   (K8s: DaemonSet)        |
  |                            |                           |
  |                            |── Step 5: VERIFY          |
  |                            |   Subflow: verify_enroll  |
  |                            |   [Poll 30s × 10min]     |
  |                            |   Agent record exists?    |
  |                            |   Heartbeat received?     |
  |                            |                           |
  |               [Success]    |── Step 7: CLOSE ─────────>|
  |                            |   gap.status = Resolved   |── [Close CR]
  |                            |   cr.state = Closed       |
  |                            |                           |
  |               [Failure]    |── Step 6: FAIL ──────────>|
  |                            |   gap.status = Failed     |── [Notify team]
  |                            |   Send notification       |
```

## 8. EA Reconciliation

```
Analyst                  Integration Intelligence        ServiceNow
  |                              |                           |
  |── POST /api/v1/reconcile ──>|                           |
  |   (integrations,            |                           |
  |    ea_relationships)        |                           |
  |                              |── [For each integration:] |
  |                              |   Strategy 1: Exact CI    |
  |                              |     source_ci == parent?  |
  |                              |     → confidence 1.0      |
  |                              |                           |
  |                              |   Strategy 2: Fuzzy name  |
  |                              |     Levenshtein ≤ 2?     |
  |                              |     → confidence 0.7-0.9  |
  |                              |                           |
  |                              |   Strategy 3: Group       |
  |                              |     Same business svc?    |
  |                              |     → confidence 0.5      |
  |                              |                           |
  |<── { results: {             |                           |
  |      "A→B": [{conf: 0.92,  |                           |
  |       status: "Suggested"}] |                           |
  |     }} ─────────────────────|                           |
  |                              |                           |
  |── [In workspace: Confirm] ──────────────────────────────>|
  |                              |   ea_map.status=Confirmed |
  |                              |   integration.ea=Mapped   |
```
