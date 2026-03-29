# Pathfinder ServiceNow Scoped App

Scope prefix: `x_avnth_`

## Structure

- `tables/` — Table definitions (Integration CI, Interface CI, Health Log, Coverage Gap, Agent Inventory, EA Map)
- `business-rules/` — Business rules for CI lifecycle events
- `scripted-rest/` — REST API endpoints under `/api/x_avnth/pathfinder/v1/`
- `flows/` — Flow Designer workflows (coverage loop, triage, remediation)
- `dashboards/` — Performance Analytics dashboards
- `update-sets/` — Exportable update set XML files

## Deployment

```bash
# Via ServiceNow CLI
sn push --instance your-instance.service-now.com

# Via update sets
# Import XML files from update-sets/ via System Update Sets
```
