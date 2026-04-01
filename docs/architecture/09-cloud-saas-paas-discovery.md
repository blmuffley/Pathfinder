# 09 — Pathfinder Cloud: SaaS/PaaS Discovery Module

## 1. Purpose

Pathfinder Cloud discovers cloud service dependencies by analyzing outbound traffic patterns from hosts running Pathfinder agents. It identifies SaaS applications (Salesforce, Workday, ServiceNow, Slack), PaaS services (AWS RDS, Azure SQL, GCP Cloud SQL), and IaaS infrastructure (AWS EC2, Azure VMs) — all without agents on the cloud side.

**Included in Pathfinder Base** — this is discovery, not a premium add-on. Every Pathfinder customer gets cloud service visibility automatically.

---

## 2. How It Works

Pathfinder agents already observe every outbound TCP/UDP connection from managed hosts. The Cloud module adds a classification layer that identifies cloud service endpoints from connection metadata:

```
eBPF Agent (on customer's server)
  │
  │  Observes outbound connections:
  │  1. TLS SNI hostname (from ClientHello, before encryption)
  │  2. DNS query/response pairs (hostname → IP resolution)
  │  3. Destination IP + port
  │  4. Connection timing patterns (polling, batch, streaming)
  │  5. Certificate subject (from TLS handshake, public data)
  │
  ▼
Gateway — Cloud Service Classifier
  │
  │  Matches against 500+ cloud service patterns:
  │  - SaaS hostname patterns (*.salesforce.com → Salesforce)
  │  - AWS service endpoints (sqs.us-east-1.amazonaws.com → SQS)
  │  - Azure patterns (*.database.windows.net → Azure SQL)
  │  - GCP patterns (*.googleapis.com → GCP services)
  │  - Identity providers (login.microsoftonline.com → Azure AD)
  │
  ▼
Discovery Normalization Layer
  │
  │  Creates cloud service CIs in ServiceNow:
  │  - SaaS applications (cmdb_ci_cloud_service_account)
  │  - PaaS services (cmdb_ci_cloud_service)
  │  - IaaS resources (cmdb_ci_cloud_compute)
  │  - Relationships: on-prem app → uses → cloud service
  │
  ▼
ServiceNow CMDB (CSDM-aligned)
```

### 2.1 What We Observe (All Passive, No DPI)

| Data Point | Source | How Captured | Example |
|-----------|--------|-------------|---------|
| TLS SNI hostname | ClientHello message | eBPF tracepoint on `tls_client_hello` or TCP payload first bytes | `api.salesforce.com` |
| DNS queries | UDP port 53 | eBPF on `udp_sendmsg` | `sqs.us-east-1.amazonaws.com` |
| Destination IP:port | TCP connect | eBPF `tcp_connect` tracepoint | `52.94.8.143:443` |
| Connection frequency | Flow aggregation | Batcher statistics | `120 connections/hour to *.salesforce.com` |
| Byte volume patterns | Flow metadata | Kernel-level counters | `Avg 2KB request, 15KB response (REST API pattern)` |
| TLS certificate subject | TLS handshake | Certificate fields are plaintext | `CN=*.salesforce.com, O=Salesforce Inc.` |
| Process name | Kernel proc table | eBPF `bpf_get_current_comm()` | `java` connecting to `api.stripe.com` |

**CRITICAL: No packet payload inspection.** TLS SNI and DNS queries are protocol metadata visible before/outside encryption. We never decrypt or read application data.

---

## 3. Cloud Service Classification Rules

### 3.1 SaaS Applications (200+ patterns)

| SaaS Provider | Hostname Patterns | Detected As | Confidence |
|--------------|------------------|------------|------------|
| Salesforce | `*.salesforce.com`, `*.force.com`, `*.lightning.force.com` | CRM / Sales / Service Cloud | 0.95 |
| ServiceNow | `*.service-now.com`, `*.servicenow.com` | ITSM Platform | 0.95 |
| Workday | `*.workday.com`, `*.myworkday.com` | HCM / Financials | 0.95 |
| Microsoft 365 | `*.office365.com`, `*.office.com`, `*.sharepoint.com`, `*.outlook.com` | Productivity Suite | 0.95 |
| Slack | `*.slack.com`, `*.slack-edge.com` | Messaging | 0.90 |
| Zoom | `*.zoom.us`, `*.zoom.com` | Video Conferencing | 0.90 |
| Okta | `*.okta.com`, `*.oktapreview.com` | Identity Provider | 0.95 |
| Twilio/SendGrid | `*.twilio.com`, `*.sendgrid.com`, `*.sendgrid.net` | Communications API | 0.90 |
| Stripe | `*.stripe.com`, `api.stripe.com` | Payment Processing | 0.92 |
| Datadog | `*.datadoghq.com`, `*.datadoghq.eu` | Monitoring | 0.90 |
| PagerDuty | `*.pagerduty.com` | Incident Management | 0.90 |
| Jira/Confluence | `*.atlassian.net`, `*.atlassian.com` | Project Management | 0.90 |
| GitHub | `*.github.com`, `*.githubusercontent.com` | Source Control | 0.92 |
| DocuSign | `*.docusign.com`, `*.docusign.net` | Digital Signatures | 0.90 |
| Box | `*.box.com`, `*.boxcloud.com` | Content Management | 0.90 |
| Snowflake | `*.snowflakecomputing.com` | Data Warehouse | 0.92 |
| MongoDB Atlas | `*.mongodb.net` | Database Service | 0.90 |
| UKG Pro | `*.ultipro.com`, `*.ukg.com`, `*.kronos.com` | Workforce Management | 0.92 |
| Epic (Hosted) | `*.epic.com`, `*.epicsystems.com` | EHR (Healthcare) | 0.95 |

### 3.2 AWS Services

| Pattern | Service | CSDM Category |
|---------|---------|--------------|
| `sqs.*.amazonaws.com` | SQS (Queue) | PaaS - Messaging |
| `s3.*.amazonaws.com`, `*.s3.amazonaws.com` | S3 (Storage) | PaaS - Storage |
| `rds.*.amazonaws.com` | RDS (Database) | PaaS - Database |
| `lambda.*.amazonaws.com` | Lambda (Compute) | PaaS - Compute |
| `dynamodb.*.amazonaws.com` | DynamoDB | PaaS - Database |
| `elasticache.*.amazonaws.com` | ElastiCache | PaaS - Cache |
| `ec2.*.amazonaws.com` | EC2 (Compute) | IaaS - Compute |
| `eks.*.amazonaws.com` | EKS (Kubernetes) | PaaS - Container |
| `kinesis.*.amazonaws.com` | Kinesis (Streaming) | PaaS - Streaming |
| `sns.*.amazonaws.com` | SNS (Notifications) | PaaS - Messaging |
| `secretsmanager.*.amazonaws.com` | Secrets Manager | PaaS - Security |
| `sts.*.amazonaws.com` | STS (Auth) | PaaS - Identity |

Region extracted from hostname → maps to `cmdb_ci_cloud_service_account` with region attribute.

### 3.3 Azure Services

| Pattern | Service | CSDM Category |
|---------|---------|--------------|
| `*.database.windows.net` | Azure SQL | PaaS - Database |
| `*.blob.core.windows.net` | Blob Storage | PaaS - Storage |
| `*.servicebus.windows.net` | Service Bus | PaaS - Messaging |
| `*.redis.cache.windows.net` | Azure Cache for Redis | PaaS - Cache |
| `*.azurewebsites.net` | App Service | PaaS - Compute |
| `*.vault.azure.net` | Key Vault | PaaS - Security |
| `*.cosmos.azure.com` | Cosmos DB | PaaS - Database |
| `login.microsoftonline.com` | Azure AD | PaaS - Identity |
| `*.azurecr.io` | Container Registry | PaaS - Container |
| `*.azure-api.net` | API Management | PaaS - Integration |

### 3.4 GCP Services

| Pattern | Service | CSDM Category |
|---------|---------|--------------|
| `*.googleapis.com` (with path analysis) | Various GCP | PaaS |
| `*.cloudfunctions.net` | Cloud Functions | PaaS - Compute |
| `*.firebaseio.com` | Firebase | PaaS - Database |
| `*.appspot.com` | App Engine | PaaS - Compute |
| `*.run.app` | Cloud Run | PaaS - Container |

### 3.5 Identity / Authentication Flows

| Pattern | What It Reveals | CSDM Impact |
|---------|----------------|-------------|
| `login.microsoftonline.com` | Azure AD SSO | Maps auth dependency |
| `*.okta.com` | Okta SSO | Maps auth dependency |
| `accounts.google.com` | Google Workspace SSO | Maps auth dependency |
| `*.auth0.com` | Auth0 | Maps auth dependency |
| SAML/OAuth token exchange patterns | SSO flow detected | Creates identity service relationship |

---

## 4. Data Model: Cloud Service CIs

### 4.1 New ServiceNow Tables

| Table | Extends | Purpose |
|-------|---------|---------|
| `x_avnth_cloud_service` | `cmdb_ci_cloud_service` | Discovered cloud/SaaS service with behavioral profile |
| `x_avnth_cloud_account` | `cmdb_ci_cloud_service_account` | Cloud provider account (AWS account, Azure subscription) |
| `x_avnth_cloud_dependency` | `cmdb_rel_ci` | Relationship: on-prem CI → uses → cloud service |

### 4.2 Cloud Service CI Fields

| Field | Type | Source | Example |
|-------|------|--------|---------|
| `service_name` | String | Pattern match | "Salesforce Sales Cloud" |
| `provider` | Choice | Hostname analysis | AWS / Azure / GCP / SaaS |
| `service_type` | Choice | Pattern match | Compute / Database / Storage / Messaging / Identity / Application |
| `endpoint_pattern` | String | SNI/DNS | `*.salesforce.com` |
| `region` | String | Hostname parsing | `us-east-1` |
| `discovery_source` | Reference | Normalization layer | "Pathfinder eBPF" |
| `first_observed` | DateTime | Agent data | When first connection seen |
| `last_observed` | DateTime | Agent data | Most recent connection |
| `connection_count` | Integer | Flow aggregation | Total connections observed |
| `unique_clients` | Integer | Flow grouping | How many on-prem apps connect |
| `avg_request_size` | Integer | Flow stats | Typical request payload |
| `avg_response_size` | Integer | Flow stats | Typical response payload |
| `connection_pattern` | Choice | Behavioral analysis | Polling / Event-Driven / Batch / Continuous |
| `confidence` | Decimal | Classification engine | 0.0 - 1.0 |
| `csdm_category` | Choice | Mapping rules | Business Application / Technical Service / Infrastructure |

### 4.3 Cloud Dependency Relationship Fields

| Field | Type | Example |
|-------|------|---------|
| `source_ci` | Reference (cmdb_ci) | `AppInstance:OrderSvc-01` |
| `target_ci` | Reference (x_avnth_cloud_service) | `SaaS:Salesforce` |
| `relationship_type` | Choice | `uses` / `authenticates_via` / `stores_data_in` / `sends_to` |
| `protocol` | String | HTTPS, gRPC, AMQP |
| `port` | Integer | 443 |
| `flow_count` | Integer | Connections in observation window |
| `discovered_by` | String | "Pathfinder Cloud" |

---

## 5. CSDM Alignment

Cloud services map into the CSDM hierarchy:

```
Business Service: "Online Patient Portal"
  └─ Business Application: "Patient Portal App"
       ├─ Technical Service: "Portal Backend"
       │    ├─ Application Instance: "portal-api on prod-web-01"  [Pathfinder Base]
       │    ├─ Application Instance: "portal-api on prod-web-02"  [Pathfinder Base]
       │    ├─ Cloud Service: "AWS RDS (PostgreSQL)"              [Pathfinder Cloud]
       │    ├─ Cloud Service: "AWS S3 (document storage)"         [Pathfinder Cloud]
       │    └─ Cloud Service: "AWS SQS (async processing)"        [Pathfinder Cloud]
       └─ Technical Service: "Portal Authentication"
            ├─ Cloud Service: "Okta SSO"                          [Pathfinder Cloud]
            └─ Cloud Service: "Azure AD (MFA)"                    [Pathfinder Cloud]
```

Pathfinder Cloud creates the cloud service CIs and their relationships to on-prem apps. **Contour** (separate product) will assemble these into the full CSDM hierarchy (Technical Service → Business Application → Business Service).

---

## 6. Processing Pipeline

1. **Agent captures outbound connection** — eBPF tracepoint fires on TCP connect to external IP
2. **SNI extraction** — agent reads TLS ClientHello hostname (before encryption)
3. **DNS correlation** — agent matches recent DNS queries to the destination IP
4. **Flow batched to gateway** — includes destination hostname, IP, port, process, byte counts
5. **Cloud classifier runs** — gateway matches hostname against 500+ patterns
6. **Service CI created/updated** — upserted to ServiceNow via existing CI pipeline
7. **Dependency relationship created** — links source app instance to cloud service
8. **Contour notified** — event emitted for CSDM service modeling (when Contour is deployed)

---

## 7. Privacy and Compliance

| Concern | How We Handle It |
|---------|-----------------|
| **TLS SNI is metadata, not content** | We read the hostname from the unencrypted ClientHello. We never decrypt TLS traffic. |
| **DNS queries are metadata** | Standard DNS is unencrypted. We read query/response pairs, not application data. |
| **No request/response body inspection** | We capture byte counts and timing, never payload content. |
| **Cloud API keys / credentials** | Never captured. These are inside encrypted TLS payload. |
| **HIPAA (healthcare)** | Cloud service hostnames are not PHI. "Server connects to salesforce.com" is infrastructure metadata. |
| **Encrypted DNS (DoH/DoT)** | If customer uses encrypted DNS, we fall back to IP-based classification (lower confidence). |

---

## 8. Pricing

**Included in Pathfinder Base.** Cloud service discovery is not a separate module — it's core platform value. Every customer benefits from knowing their cloud dependencies.

The premium value comes from **Contour**, which takes the discovered cloud services and assembles them into CSDM-aligned service maps. That's where the upsell is.

---

*Pathfinder Cloud: SaaS/PaaS Discovery — v1.0*
*Avennorth Confidential — April 2026*
