# Avennorth Pathfinder — Network & Firewall Requirements

## Network Topology

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT NETWORK                                │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Linux    │  │ Windows  │  │ K8s Node │  │ K8s Node │           │
│  │ Server   │  │ Server   │  │ (eBPF)   │  │ (eBPF)   │           │
│  │ Agent    │  │ Agent    │  │ Agent    │  │ Agent    │           │
│  │ :0 (none)│  │ :0 (none)│  │ :0 (none)│  │ :0 (none)│           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │              │              │              │                 │
│       └──────────────┴──────┬───────┴──────────────┘                │
│                             │ gRPC :8443 (outbound only)            │
│                             ▼                                        │
│  ┌─────────────────────────────────────────┐                        │
│  │            GATEWAY TIER                  │                        │
│  │  ┌─────────────────────────────────┐    │                        │
│  │  │ Pathfinder Gateway :8443        │    │                        │
│  │  │ (gRPC server, classification,   │    │                        │
│  │  │  SN sync)                       │    │                        │
│  │  └──────────┬──────────┬───────────┘    │                        │
│  │             │          │                 │                        │
│  │    PG :5432 │          │ HTTPS :443      │                        │
│  │             ▼          │                 │                        │
│  │  ┌──────────────┐     │                 │                        │
│  │  │ PostgreSQL   │     │                 │                        │
│  │  │ :5432        │     │                 │                        │
│  │  └──────────────┘     │                 │                        │
│  └───────────────────────┼─────────────────┘                        │
│                          │                                           │
│  ┌───────────────────────┼─────────────────┐                        │
│  │     INTELLIGENCE TIER │                  │                        │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │
│  │  │AI Eng  │ │IntegIn │ │CMDB Ops│ │SvcMap  │                   │
│  │  │:8080   │ │:8081   │ │:8082   │ │:8083   │                   │
│  │  └───┬────┘ └────────┘ └────────┘ └────────┘                   │
│  │      │ HTTPS :443                                                │
│  └──────┼───────────────────────────────────────┘                   │
│         │                                                            │
└─────────┼────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐     ┌──────────────────────────┐
│ Anthropic Claude    │     │ ServiceNow Cloud         │
│ api.anthropic.com   │     │ instance.service-now.com │
│ :443 (HTTPS)        │     │ :443 (HTTPS + OAuth)     │
└─────────────────────┘     └──────────────────────────┘
```

## Firewall Rules

### Inbound Rules (to Gateway)

| Source | Destination | Port | Protocol | Purpose |
|--------|------------|------|----------|---------|
| Agent hosts | Gateway | 8443 | TCP (gRPC) | Flow streaming, enrollment, heartbeat |
| Intelligence tier | Gateway | — | — | No inbound from intelligence to gateway |
| Admin workstations | Gateway | 8443 | TCP | Monitoring / debug (optional) |

### Outbound Rules (from Gateway)

| Source | Destination | Port | Protocol | Purpose |
|--------|------------|------|----------|---------|
| Gateway | PostgreSQL | 5432 | TCP | Database connections |
| Gateway | ServiceNow | 443 | TCP (HTTPS) | OAuth + REST API sync |

### Intelligence Tier (internal only)

| Source | Destination | Port | Protocol | Purpose |
|--------|------------|------|----------|---------|
| AI Engine | api.anthropic.com | 443 | TCP (HTTPS) | Claude API calls |
| IntegIntel | AI Engine | 8080 | TCP (HTTP) | AI analysis requests |
| SN scheduled jobs | CMDB Ops Agent | 8082 | TCP (HTTP) | Trigger agent runs |
| SN scheduled jobs | Service Map Intel | 8083 | TCP (HTTP) | Trigger analysis |

### Agent Hosts (outbound only)

| Source | Destination | Port | Protocol | Purpose |
|--------|------------|------|----------|---------|
| Agent | Gateway | 8443 | TCP (gRPC) | Only outbound connection required |

**Agents open NO inbound ports.** They initiate all connections to the gateway.

## Port Summary

| Port | Service | Direction | Exposure |
|------|---------|-----------|----------|
| 4200 | Workspace prototype | Inbound | Development only |
| 5432 | PostgreSQL | Private | Gateway only |
| 8080 | Shared AI Engine | Private | Intelligence tier only |
| 8081 | Integration Intelligence | Private | SN scheduled jobs only |
| 8082 | CMDB Ops Agent | Private | SN scheduled jobs only |
| 8083 | Service Map Intelligence | Private | SN scheduled jobs only |
| 8443 | Gateway (gRPC) | DMZ/Private | Agents + admin |

## DNS Requirements

| Hostname | Required By | Purpose |
|----------|------------|---------|
| `api.anthropic.com` | AI Engine | Claude API |
| `your-instance.service-now.com` | Gateway | SN REST API + OAuth |
| Gateway hostname/IP | All agents | gRPC connection |
| PostgreSQL hostname | Gateway | Database |

## TLS Certificate Requirements

| Connection | Certificate | Notes |
|-----------|-------------|-------|
| Gateway server | Server cert (self-signed or CA) | Agents validate against CA |
| Agent → Gateway | Optional client cert (mTLS) | For mutual authentication |
| Gateway → SN | SN cloud cert (trusted CAs) | Standard HTTPS |
| AI Engine → Anthropic | Anthropic cert (trusted CAs) | Standard HTTPS |
| Gateway → PostgreSQL | PG server cert | `sslmode=require` |
