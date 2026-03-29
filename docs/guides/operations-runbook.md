# Avennorth Pathfinder — Operations Runbook

## Service Health Checks

| Service | Endpoint | Healthy Response |
|---------|----------|-----------------|
| Gateway | gRPC :8443 (TCP check) | Connection accepted |
| AI Engine | `GET :8080/health` | `{"status": "ok"}` |
| Integration Intelligence | `GET :8081/health` | `{"status": "ok"}` |
| CMDB Ops Agent | `GET :8082/health` | `{"status": "ok"}` |
| Service Map Intelligence | `GET :8083/health` | `{"status": "ok"}` |
| PostgreSQL | `pg_isready -h host -U pathfinder` | Exit code 0 |

---

## Common Operations

### Add New Server to Coverage

1. Install agent on server (RPM/DEB/MSI/DaemonSet)
2. Agent auto-enrolls with gateway
3. Verify: `SELECT * FROM agents WHERE hostname = 'new-server'`
4. Flows appear in `raw_flows` within 60s
5. Classification creates integration CIs within next classification cycle (10s)
6. SN sync pushes to ServiceNow within next sync cycle (60s)

### Tune Classification Confidence

```yaml
# gateway.yaml
classification:
  confidence_threshold: 0.7  # Lower = more CIs created (more noise)
                              # Higher = fewer CIs (may miss valid integrations)
```

Restart gateway after change. Recommended: start at 0.8, lower to 0.7 if missing known integrations, raise to 0.9 if too much noise.

### Adjust CMDB Ops Agent Autonomy

```
ServiceNow → System Properties → x_avnth.cmdb_ops_autonomy_level
  0 = Report only (observe + diagnose)
  1 = Recommend (creates recommendations, no action)  ← DEFAULT
  2 = Act with approval (creates Change Requests)
  3 = Fully autonomous (acts immediately, retroactive CR)
```

**Recommended progression:** Start at 1 for first 30 days → review recommendations → promote to 2 → monitor CRs → promote to 3 for low-risk agents only.

### Enable Self-Healing Auto-Deploy

```
x_avnth.auto_deploy_enabled = true    # Enable the flow
x_avnth.deploy_assignment_group = <sys_id>  # Who gets CRs
```

Only auto-deploys for Medium/Low priority gaps. Critical/High always create Normal CRs for human review.

---

## Troubleshooting

### Agent Not Enrolling

| Symptom | Check | Fix |
|---------|-------|-----|
| "connection refused" | Gateway running? | `systemctl status pathfinder-gateway` |
| "enrollment failed" | Token valid? | Verify `PF_ENROLLMENT_TOKEN` matches gateway config |
| Agent ID not persisting | Permissions? | Ensure `/var/lib/pathfinder/` is writable |
| eBPF load failure | Kernel version? | Requires 5.8+ with BTF. Check: `ls /sys/kernel/btf/vmlinux` |
| ETW not capturing | Running as admin? | Windows agent requires Administrator privileges |

### Flows Not Being Classified

| Symptom | Check | Fix |
|---------|-------|-----|
| `raw_flows` growing but `classified_integrations` empty | Classification loop running? | Check gateway logs for "classifying flows" messages |
| All classifications are "Custom" | Port not in rules? | Check `src/gateway/internal/classify/rules.go` — add port mapping |
| Low confidence scores | Ephemeral ports? | High ports (>32768) get -0.15 penalty. Normal for client-side connections. |

### ServiceNow Sync Not Working

| Symptom | Check | Fix |
|---------|-------|-----|
| `sn_sync_log` shows "failed" | OAuth token? | Verify `PF_SN_CLIENT_ID` and `PF_SN_CLIENT_SECRET`. Test with `curl -X POST https://instance/oauth_token.do` |
| Sync succeeds but no CIs in SN | Table exists? | Ensure update sets were imported. Check `x_avnth_cmdb_ci_integration.list` |
| "mock-sn.localhost" in logs | Config not set | Set `PF_SN_INSTANCE` to your real SN instance URL |

### AI Engine Issues

| Symptom | Check | Fix |
|---------|-------|-----|
| 503 on `/api/v1/analyze` | API key? | Set `ANTHROPIC_API_KEY` environment variable |
| Slow responses (>30s) | Claude API latency | Check Anthropic status page. Consider lowering `max_tokens` |
| Token budget exceeded | Usage tracking | `GET /api/v1/usage` shows cumulative tokens. Set billing alerts on Anthropic dashboard. |

---

## Monitoring & Alerting

### Key Metrics to Monitor

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Agent heartbeat age | `agents.last_heartbeat` | > 5 minutes → Stale |
| Raw flow ingestion rate | `raw_flows` count per minute | < 1/min per agent → investigate |
| Classification backlog | `raw_flows WHERE classified=FALSE` count | > 10,000 → classification loop may be stuck |
| SN sync failures | `sn_sync_log WHERE status='failed'` | Any failures → check OAuth |
| AI token usage | `GET :8080/api/v1/usage` | Set budget alerts |
| Coverage gap count | `x_avnth_coverage_gap WHERE remediation_status='Open'` | > 10 open → triage |
| Health score distribution | Integration CIs with `health_status='Critical'` | Any critical → investigate |

### Log Locations

| Service | Format | Location |
|---------|--------|----------|
| Gateway | JSON | stdout (Docker: `docker logs gateway`) |
| Linux Agent | JSON | stdout / journald (`journalctl -u pathfinder-agent`) |
| Windows Agent | JSON | stdout / Event Log |
| K8s Agent | JSON | stdout (`kubectl logs -l app.kubernetes.io/name=pathfinder-agent`) |
| AI Engine | Python logging | stdout |
| Intelligence Products | Python logging | stdout |

---

## Backup & Recovery

### PostgreSQL

```bash
# Backup
pg_dump -h localhost -U pathfinder pathfinder > pathfinder_backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U pathfinder pathfinder < pathfinder_backup_YYYYMMDD.sql
```

### Agent State

Agent ID is persisted at:
- Linux: `/var/lib/pathfinder/agent-id`
- Windows: `C:\ProgramData\Pathfinder\agent-id`
- K8s: `hostPath /var/lib/pathfinder/agent-id`

If lost, agent will re-enroll on next start (new UUID assigned).

### ServiceNow

Use standard SN backup/clone procedures. Pathfinder data lives in 6 `x_avnth_*` tables.

---

## Scaling Guidelines

| Component | Scale Trigger | Action |
|-----------|--------------|--------|
| Gateway | > 500 agents | Increase `database.max_connections`, add replica |
| PostgreSQL | > 10M raw_flows/day | Verify partition creation, tune `work_mem` |
| Classification loop | Backlog > 10k | Decrease loop interval from 10s to 5s |
| SN sync | > 1000 unsynced | Increase `batch_size` from 50 to 200 |
| AI Engine | Response time > 10s | Add replica, consider caching frequent analyses |
