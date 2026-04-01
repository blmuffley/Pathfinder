/**
 * Pathfinder Scripted REST API v1
 * Scope: x_avnth_pathfinder
 * Base path: /api/x_avnth/pathfinder/v1
 *
 * DEPRECATED: This API is superseded by the Pathfinder Service Graph Connector (SGC)
 * which uses the standard ServiceNow IRE identifyreconcile API.
 *
 * For new deployments, use the SGC scoped app at src/servicenow/sgc/.
 * These endpoints remain functional for backward compatibility during migration.
 * Set PF_LEGACY_SYNC=true on the gateway to use this API.
 *
 * See docs/architecture/11-service-graph-connector.md for migration details.
 *
 * Endpoints:
 *   POST   /integrations           — Upsert integration CIs (batch)
 *   GET    /integrations/{sys_id}  — Get integration CI by sys_id
 *   POST   /interfaces             — Upsert interface CIs (batch)
 *   POST   /agents                 — Upsert agent records (batch)
 *   POST   /health-logs            — Ingest health telemetry (batch)
 *   GET    /coverage-gaps          — List open coverage gaps
 *   POST   /integrations/{sys_id}/summary — Set AI summary on integration
 *
 * Authentication: OAuth2 Bearer token (client credentials flow)
 * All endpoints accept/return JSON.
 */

// -----------------------------------------------------------------------
// POST /integrations — Upsert Integration CIs
// Body: { "integrations": [ { source_ci, target_ci, integration_type, ... } ] }
// Returns: { "results": [ { sys_id, source_ci, target_ci, operation } ] }
// -----------------------------------------------------------------------
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var body = request.body.data;
    var integrations = body.integrations || [];
    var results = [];

    for (var i = 0; i < integrations.length; i++) {
        var item = integrations[i];
        var gr = new GlideRecord('x_avnth_cmdb_ci_integration');
        var operation = 'create';

        // Check for existing by source_ci + target_ci
        gr.addQuery('source_ci', item.source_ci);
        gr.addQuery('target_ci', item.target_ci);
        gr.query();

        if (gr.next()) {
            operation = 'update';
        } else {
            gr.initialize();
        }

        // Set fields
        gr.source_ci = item.source_ci;
        gr.target_ci = item.target_ci;
        gr.integration_type = item.integration_type || 'Custom';
        gr.classification_confidence = item.classification_confidence || 0;
        gr.discovery_method = item.discovery_method || 'Pathfinder';
        gr.first_discovered = item.first_discovered || gr.first_discovered || new GlideDateTime();
        gr.last_observed = item.last_observed || new GlideDateTime();
        gr.flow_count = item.flow_count || gr.flow_count || 0;

        if (item.health_score !== undefined) {
            gr.health_score = item.health_score;
        }
        if (item.criticality) {
            gr.criticality = item.criticality;
        }
        if (item.data_classification) {
            gr.data_classification = item.data_classification;
        }

        var sys_id;
        if (operation === 'create') {
            sys_id = gr.insert();
        } else {
            gr.update();
            sys_id = gr.getUniqueValue();
        }

        results.push({
            sys_id: sys_id,
            source_ci: item.source_ci,
            target_ci: item.target_ci,
            operation: operation
        });
    }

    response.setStatus(200);
    response.setBody({ results: results, count: results.length });

})(request, response);


// -----------------------------------------------------------------------
// GET /integrations/{sys_id} — Get Integration CI
// -----------------------------------------------------------------------
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var sys_id = request.pathParams.sys_id;
    var gr = new GlideRecord('x_avnth_cmdb_ci_integration');

    if (!gr.get(sys_id)) {
        response.setStatus(404);
        response.setBody({ error: 'Integration not found', sys_id: sys_id });
        return;
    }

    response.setStatus(200);
    response.setBody({
        sys_id: gr.getUniqueValue(),
        name: gr.getDisplayValue('name'),
        source_ci: gr.source_ci.toString(),
        target_ci: gr.target_ci.toString(),
        integration_type: gr.integration_type.toString(),
        classification_confidence: parseFloat(gr.classification_confidence),
        discovery_method: gr.discovery_method.toString(),
        first_discovered: gr.first_discovered.toString(),
        last_observed: gr.last_observed.toString(),
        flow_count: parseInt(gr.flow_count, 10),
        health_status: gr.health_status.toString(),
        health_score: parseInt(gr.health_score, 10),
        ai_summary: gr.ai_summary.toString(),
        ea_status: gr.ea_status.toString(),
        criticality: gr.criticality.toString(),
        operational_status: gr.operational_status.toString()
    });

})(request, response);


// -----------------------------------------------------------------------
// POST /interfaces — Upsert Interface CIs
// Body: { "interfaces": [ { integration, protocol, port, direction, ... } ] }
// -----------------------------------------------------------------------
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var body = request.body.data;
    var interfaces = body.interfaces || [];
    var results = [];

    for (var i = 0; i < interfaces.length; i++) {
        var item = interfaces[i];
        var gr = new GlideRecord('x_avnth_cmdb_ci_interface');
        var operation = 'create';

        // Check for existing by unique constraint
        gr.addQuery('integration', item.integration);
        gr.addQuery('protocol', item.protocol);
        gr.addQuery('port', item.port);
        gr.addQuery('direction', item.direction);
        gr.query();

        if (gr.next()) {
            operation = 'update';
        } else {
            gr.initialize();
        }

        gr.integration = item.integration;
        gr.protocol = item.protocol;
        gr.port = item.port;
        gr.direction = item.direction;
        gr.pattern = item.pattern || gr.pattern || '';
        gr.data_format = item.data_format || gr.data_format || 'Unknown';
        gr.process_name = item.process_name || gr.process_name || '';
        gr.avg_bytes_per_flow = item.avg_bytes_per_flow || gr.avg_bytes_per_flow || 0;
        gr.flow_count = item.flow_count || gr.flow_count || 0;
        gr.first_discovered = item.first_discovered || gr.first_discovered || new GlideDateTime();
        gr.last_observed = item.last_observed || new GlideDateTime();

        if (item.latency_p50_ms !== undefined) gr.latency_p50_ms = item.latency_p50_ms;
        if (item.latency_p99_ms !== undefined) gr.latency_p99_ms = item.latency_p99_ms;
        if (item.error_rate !== undefined) gr.error_rate = item.error_rate;

        var sys_id;
        if (operation === 'create') {
            sys_id = gr.insert();
        } else {
            gr.update();
            sys_id = gr.getUniqueValue();
        }

        results.push({
            sys_id: sys_id,
            integration: item.integration,
            protocol: item.protocol,
            port: item.port,
            operation: operation
        });
    }

    response.setStatus(200);
    response.setBody({ results: results, count: results.length });

})(request, response);


// -----------------------------------------------------------------------
// POST /agents — Upsert Agent Records
// Body: { "agents": [ { agent_id, hostname, os_type, ... } ] }
// -----------------------------------------------------------------------
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var body = request.body.data;
    var agents = body.agents || [];
    var results = [];

    for (var i = 0; i < agents.length; i++) {
        var item = agents[i];
        var gr = new GlideRecord('x_avnth_pathfinder_agent');
        var operation = 'create';

        gr.addQuery('agent_id', item.agent_id);
        gr.query();

        if (gr.next()) {
            operation = 'update';
        } else {
            gr.initialize();
        }

        gr.agent_id = item.agent_id;
        gr.hostname = item.hostname;
        gr.os_type = item.os_type;
        gr.agent_version = item.agent_version;
        gr.last_heartbeat = item.last_heartbeat || new GlideDateTime();
        gr.status = item.status || 'Active';
        gr.enrolled_at = item.enrolled_at || gr.enrolled_at || new GlideDateTime();

        if (item.deployment_model) gr.deployment_model = item.deployment_model;
        if (item.coverage_tier !== undefined) gr.coverage_tier = item.coverage_tier;
        if (item.flows_collected !== undefined) gr.flows_collected = item.flows_collected;
        if (item.server) gr.server = item.server;

        var sys_id;
        if (operation === 'create') {
            sys_id = gr.insert();
        } else {
            gr.update();
            sys_id = gr.getUniqueValue();
        }

        results.push({
            sys_id: sys_id,
            agent_id: item.agent_id,
            operation: operation
        });
    }

    response.setStatus(200);
    response.setBody({ results: results, count: results.length });

})(request, response);


// -----------------------------------------------------------------------
// POST /health-logs — Ingest Health Telemetry
// Body: { "logs": [ { integration, interface, metric_type, metric_value, ... } ] }
// -----------------------------------------------------------------------
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var body = request.body.data;
    var logs = body.logs || [];
    var count = 0;

    for (var i = 0; i < logs.length; i++) {
        var item = logs[i];
        var gr = new GlideRecord('x_avnth_integration_health_log');
        gr.initialize();

        gr.integration = item.integration;
        if (item['interface']) gr['interface'] = item['interface'];
        gr.metric_type = item.metric_type;
        gr.metric_value = item.metric_value;
        gr.unit = item.unit || '';
        gr.recorded_at = item.recorded_at || new GlideDateTime();
        gr.source = item.source || 'Agent';

        gr.insert();
        count++;
    }

    response.setStatus(200);
    response.setBody({ inserted: count });

})(request, response);


// -----------------------------------------------------------------------
// GET /coverage-gaps — List Open Coverage Gaps
// Query params: ?status=Open&limit=100
// -----------------------------------------------------------------------
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var statusFilter = request.queryParams.status || 'Open';
    var limit = parseInt(request.queryParams.limit, 10) || 100;

    var gr = new GlideRecord('x_avnth_coverage_gap');
    gr.addQuery('remediation_status', statusFilter);
    gr.orderByDesc('detected_at');
    gr.setLimit(limit);
    gr.query();

    var gaps = [];
    while (gr.next()) {
        gaps.push({
            sys_id: gr.getUniqueValue(),
            server: gr.server.toString(),
            server_name: gr.server.getDisplayValue(),
            gap_type: gr.gap_type.toString(),
            required_tier: parseInt(gr.required_tier, 10),
            current_tier: parseInt(gr.current_tier, 10),
            detected_at: gr.detected_at.toString(),
            remediation_status: gr.remediation_status.toString(),
            priority: gr.priority.toString()
        });
    }

    response.setStatus(200);
    response.setBody({ gaps: gaps, count: gaps.length });

})(request, response);


// -----------------------------------------------------------------------
// POST /integrations/{sys_id}/summary — Set AI Summary
// Body: { "ai_summary": "...", "health_score": 85 }
// -----------------------------------------------------------------------
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var sys_id = request.pathParams.sys_id;
    var body = request.body.data;

    var gr = new GlideRecord('x_avnth_cmdb_ci_integration');
    if (!gr.get(sys_id)) {
        response.setStatus(404);
        response.setBody({ error: 'Integration not found', sys_id: sys_id });
        return;
    }

    if (body.ai_summary) {
        gr.ai_summary = body.ai_summary;
    }
    if (body.health_score !== undefined) {
        gr.health_score = body.health_score;
    }

    gr.update();

    response.setStatus(200);
    response.setBody({
        sys_id: sys_id,
        ai_summary: gr.ai_summary.toString(),
        health_score: parseInt(gr.health_score, 10),
        health_status: gr.health_status.toString()
    });

})(request, response);
