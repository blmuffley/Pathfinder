# Avennorth Pathfinder — Capacity Planning Guide

## Agent Resource Consumption

| Resource | Per Agent | Notes |
|----------|-----------|-------|
| CPU | < 1% of 1 core | eBPF runs in kernel, near-zero overhead |
| Memory | < 50 MB | Ring buffer + gRPC client |
| Disk | < 10 MB | Binary + agent-id file |
| Network | 1-10 KB/s | Flow batches every 10s. Proportional to connection count on host. |

## Gateway Sizing

| Scale | Agents | Flows/sec | CPU | Memory | Disk (PG) | PG Connections |
|-------|--------|-----------|-----|--------|-----------|----------------|
| Small | 10-50 | 100-500 | 1 vCPU | 512 MB | 10 GB | 10 |
| Medium | 50-200 | 500-2,000 | 2 vCPU | 1 GB | 50 GB | 25 |
| Large | 200-500 | 2,000-10,000 | 2 vCPU | 2 GB | 200 GB | 50 |
| XL | 500-2,000 | 10,000-50,000 | 4 vCPU | 4 GB | 500 GB | 100 |

**Bottleneck order:** PostgreSQL write throughput > gRPC connection count > classification CPU

## PostgreSQL Sizing

| Scale | raw_flows/day | Disk/month | Retention | Recommended Instance |
|-------|---------------|------------|-----------|---------------------|
| Small | < 1M | 2 GB | 6 months | db.t3.medium (2 vCPU, 4 GB) |
| Medium | 1-10M | 15 GB | 6 months | db.r6g.large (2 vCPU, 16 GB) |
| Large | 10-50M | 75 GB | 3 months | db.r6g.xlarge (4 vCPU, 32 GB) |
| XL | 50-200M | 300 GB | 3 months | db.r6g.2xlarge (8 vCPU, 64 GB) |

**Key tuning:**
- `work_mem = 256MB` for classification queries
- `max_connections = gateway_max + 10`
- Partition maintenance: ensure next month's partition exists before month-end
- Vacuum: daily on `raw_flows`, weekly on `classified_*`

## Intelligence Services Sizing

| Service | CPU | Memory | Notes |
|---------|-----|--------|-------|
| Shared AI Engine | 1 vCPU | 512 MB | Bottleneck is Claude API latency, not compute |
| Integration Intelligence | 0.5 vCPU | 256 MB | Health scoring is CPU-light math |
| CMDB Ops Agent | 0.5 vCPU | 256 MB | Runs on schedule, idle between runs |
| Service Map Intelligence | 0.5 vCPU | 256 MB | BFS graph traversal scales with integration count |

## Claude API Token Budget

| Operation | Tokens/Call | Calls/Day (500 integrations) | Daily Cost |
|-----------|-------------|------------------------------|------------|
| Summarize | ~1,500 | 50 (rotational) | $0.15 |
| Health score (AI-assisted) | ~800 | 125 (4x/day) | $0.10 |
| Rationalize | ~2,000 | 10 | $0.02 |
| Change impact | ~1,200 | 20 | $0.02 |
| Classification review | ~600 | 50 | $0.03 |
| **Daily total** | | ~255 calls | **~$0.32/day** |
| **Monthly total** | | ~7,650 calls | **~$10/month** |

At 2,000 hosts: ~$40/month. At 10,000 hosts: ~$150/month. Claude API costs are negligible.

## Scaling Triggers & Actions

| Metric | Threshold | Action |
|--------|-----------|--------|
| raw_flows backlog (unclassified) | > 10,000 | Decrease classification interval from 10s to 5s |
| raw_flows backlog | > 100,000 | Add second gateway instance (read replicas for PG) |
| SN sync backlog | > 1,000 unsynced | Increase batch_size from 50 to 200 |
| SN sync backlog | > 5,000 | Add sync interval from 60s to 30s |
| Gateway memory | > 80% | Increase to next instance size |
| PG disk | > 70% | Reduce partition retention or increase storage |
| Agent heartbeat failure rate | > 5% | Check gateway capacity / network |
| AI Engine response time | > 15s | Add replica or reduce max_tokens |

## High Availability

| Component | HA Strategy | Minimum Replicas |
|-----------|-------------|-----------------|
| Gateway | Multiple replicas behind load balancer. Agents connect to any. | 2 |
| PostgreSQL | Managed PG with standby (RDS Multi-AZ, Cloud SQL HA) | 2 (primary + standby) |
| AI Engine | Stateless. Multiple replicas. | 2 |
| Intelligence services | Stateless. Single replica OK (scheduled batch). | 1 |
| Agents | DaemonSet ensures one per node. Self-healing via K8s. | N/A |

## Estimated Monthly Infrastructure Cost

| Scale | Compute | Database | AI Tokens | Total |
|-------|---------|----------|-----------|-------|
| 100 hosts | $150/mo | $100/mo | $10/mo | **$260/mo** |
| 500 hosts | $300/mo | $250/mo | $40/mo | **$590/mo** |
| 2,000 hosts | $600/mo | $500/mo | $80/mo | **$1,180/mo** |
| 10,000 hosts | $1,200/mo | $1,500/mo | $150/mo | **$2,850/mo** |

Infrastructure cost is < 5% of license revenue at all scales.
