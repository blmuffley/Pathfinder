/**
 * Business Rule: Coverage Gap — Create on Agent Decommission
 * Table: x_avnth_pathfinder_agent
 * When: After Update
 * Condition: status changes to "Decommissioned"
 *
 * When an agent is decommissioned, check if the linked server still requires
 * coverage. If so, create a coverage gap record to trigger the self-healing loop.
 */
(function executeRule(current, previous) {

    if (current.status != 'Decommissioned') {
        return;
    }
    if (previous.status == 'Decommissioned') {
        return; // Already decommissioned, no action needed
    }

    // Only create gap if the agent was linked to a server
    if (current.server.nil()) {
        return;
    }

    // Check if another active agent already covers this server
    var agentGR = new GlideRecord('x_avnth_pathfinder_agent');
    agentGR.addQuery('server', current.server);
    agentGR.addQuery('status', 'Active');
    agentGR.addQuery('sys_id', '!=', current.sys_id);
    agentGR.query();

    if (agentGR.hasNext()) {
        return; // Another active agent covers this server
    }

    // Create coverage gap
    var gapGR = new GlideRecord('x_avnth_coverage_gap');
    gapGR.initialize();
    gapGR.server = current.server;
    gapGR.gap_type = 'NoAgent';
    gapGR.required_tier = current.coverage_tier;
    gapGR.current_tier = 0;
    gapGR.detected_at = new GlideDateTime();
    gapGR.remediation_status = 'Open';
    gapGR.priority = 'High';
    gapGR.insert();

    gs.info('Pathfinder: Coverage gap created for server ' + current.server.getDisplayValue() +
            ' after agent ' + current.agent_id + ' was decommissioned.');

})(current, previous);
