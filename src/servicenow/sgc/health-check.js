/**
 * Avennorth Pathfinder — Service Graph Connector Health Check
 *
 * Runs every 5 minutes to monitor the health of the Pathfinder SGC integration.
 * Results are written to x_avnth_sgc_health_status for dashboard visibility.
 *
 * Checks performed:
 *   1. Gateway connectivity (HTTP GET /api/v1/health)
 *   2. OAuth token validity (token acquisition test)
 *   3. Last successful sync time (staleness detection)
 *   4. CI counts by class managed by Pathfinder
 *   5. Sync errors in the last hour
 *   6. Agent enrollment summary
 *
 * Scope: x_avnth_pathfinder_sgc
 * Schedule: Every 5 minutes
 */
(function executeHealthCheck() {
    'use strict';

    var SCOPE = 'x_avnth_pathfinder_sgc';
    var LOG_SOURCE = 'Pathfinder SGC Health';
    var DATA_SOURCE_NAME = 'Avennorth Pathfinder';
    var STALE_SYNC_THRESHOLD_MINUTES = 10;

    var healthReport = {
        timestamp: new GlideDateTime().getValue(),
        overall_status: 'healthy',
        gateway_reachable: false,
        gateway_response_ms: 0,
        gateway_version: '',
        oauth_valid: false,
        last_successful_sync: '',
        sync_stale: false,
        ci_counts: {},
        total_managed_cis: 0,
        errors_last_hour: 0,
        warnings_last_hour: 0,
        agent_count: 0,
        agents_healthy: 0,
        agents_degraded: 0,
        checks: []
    };

    // Load connection config
    var config = _loadConfig();
    if (!config) {
        healthReport.overall_status = 'error';
        healthReport.checks.push({
            name: 'Configuration',
            status: 'error',
            message: 'Unable to load SGC connection configuration'
        });
        _writeHealthStatus(healthReport);
        return;
    }

    // -----------------------------------------------------------------------
    // Check 1: Gateway connectivity
    // -----------------------------------------------------------------------
    _checkGatewayConnectivity(config, healthReport);

    // -----------------------------------------------------------------------
    // Check 2: OAuth token validity
    // -----------------------------------------------------------------------
    _checkOAuthValidity(config, healthReport);

    // -----------------------------------------------------------------------
    // Check 3: Last successful sync time
    // -----------------------------------------------------------------------
    _checkLastSync(healthReport);

    // -----------------------------------------------------------------------
    // Check 4: CI counts by class
    // -----------------------------------------------------------------------
    _countManagedCIs(healthReport);

    // -----------------------------------------------------------------------
    // Check 5: Sync errors in last hour
    // -----------------------------------------------------------------------
    _checkRecentErrors(healthReport);

    // -----------------------------------------------------------------------
    // Check 6: Agent enrollment summary
    // -----------------------------------------------------------------------
    _checkAgentStatus(healthReport);

    // -----------------------------------------------------------------------
    // Determine overall status
    // -----------------------------------------------------------------------
    _determineOverallStatus(healthReport);

    // -----------------------------------------------------------------------
    // Write health status record
    // -----------------------------------------------------------------------
    _writeHealthStatus(healthReport);

    gs.info(LOG_SOURCE + ': Health check complete. Status=' + healthReport.overall_status +
        ' GatewayReachable=' + healthReport.gateway_reachable +
        ' OAuthValid=' + healthReport.oauth_valid +
        ' ManagedCIs=' + healthReport.total_managed_cis +
        ' ErrorsLastHour=' + healthReport.errors_last_hour);

    // =======================================================================
    // Internal Functions
    // =======================================================================

    /**
     * Load connection configuration from system properties or connection record.
     * @returns {Object|null} Configuration object.
     */
    function _loadConfig() {
        var gatewayUrl = gs.getProperty(SCOPE + '.gateway_url');
        if (gatewayUrl) {
            return {
                gateway_url: gatewayUrl.replace(/\/+$/, ''),
                client_id: gs.getProperty(SCOPE + '.client_id'),
                client_secret: gs.getProperty(SCOPE + '.client_secret')
            };
        }

        var gr = new GlideRecord('sys_connection');
        gr.addQuery('name', DATA_SOURCE_NAME);
        gr.addQuery('active', true);
        gr.setLimit(1);
        gr.query();

        if (!gr.next()) {
            return null;
        }

        var attrs = {};
        var attrGr = new GlideRecord('sys_connection_attribute');
        attrGr.addQuery('connection', gr.getUniqueValue());
        attrGr.query();
        while (attrGr.next()) {
            attrs[attrGr.getValue('name')] = attrGr.getValue('value');
        }

        return {
            gateway_url: (attrs.gateway_url || '').replace(/\/+$/, ''),
            client_id: attrs.client_id || '',
            client_secret: attrs.client_secret || ''
        };
    }

    /**
     * Check 1: Verify gateway is reachable by calling its health endpoint.
     * @param {Object} cfg - Connection config.
     * @param {Object} report - Health report object.
     */
    function _checkGatewayConnectivity(cfg, report) {
        var checkResult = {
            name: 'Gateway Connectivity',
            status: 'error',
            message: ''
        };

        try {
            var startMs = new Date().getTime();
            var request = new sn_ws.RESTMessageV2();
            request.setEndpoint(cfg.gateway_url + '/api/v1/health');
            request.setHttpMethod('GET');
            request.setRequestHeader('Accept', 'application/json');
            request.setHttpTimeout(10000);

            var response = request.execute();
            var endMs = new Date().getTime();
            var httpStatus = parseInt(response.getStatusCode(), 10);

            report.gateway_response_ms = endMs - startMs;

            if (httpStatus === 200) {
                report.gateway_reachable = true;
                checkResult.status = 'healthy';
                checkResult.message = 'Gateway responded in ' + report.gateway_response_ms + 'ms';

                // Extract gateway version from response if available
                try {
                    var healthBody = JSON.parse(response.getBody());
                    report.gateway_version = healthBody.version || '';
                } catch (ignore) {
                    // Version extraction is optional
                }

                // Warn if response time is high
                if (report.gateway_response_ms > 5000) {
                    checkResult.status = 'degraded';
                    checkResult.message = 'Gateway responded but slowly (' +
                        report.gateway_response_ms + 'ms)';
                }
            } else {
                checkResult.message = 'Gateway returned HTTP ' + httpStatus;
            }
        } catch (e) {
            checkResult.message = 'Gateway unreachable: ' + e.message;
            gs.warn(LOG_SOURCE + ': Gateway connectivity check failed: ' + e.message);
        }

        report.checks.push(checkResult);
    }

    /**
     * Check 2: Verify OAuth credentials are valid by acquiring a token.
     * @param {Object} cfg - Connection config.
     * @param {Object} report - Health report object.
     */
    function _checkOAuthValidity(cfg, report) {
        var checkResult = {
            name: 'OAuth Token',
            status: 'error',
            message: ''
        };

        if (!report.gateway_reachable) {
            checkResult.message = 'Skipped — gateway unreachable';
            checkResult.status = 'skipped';
            report.checks.push(checkResult);
            return;
        }

        try {
            var tokenUrl = cfg.gateway_url + '/oauth/token';
            var request = new sn_ws.RESTMessageV2();
            request.setEndpoint(tokenUrl);
            request.setHttpMethod('POST');
            request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            request.setRequestBody(
                'grant_type=client_credentials' +
                '&client_id=' + encodeURIComponent(cfg.client_id) +
                '&client_secret=' + encodeURIComponent(cfg.client_secret)
            );
            request.setHttpTimeout(10000);

            var response = request.execute();
            var httpStatus = parseInt(response.getStatusCode(), 10);

            if (httpStatus === 200) {
                var tokenBody = JSON.parse(response.getBody());
                if (tokenBody.access_token) {
                    report.oauth_valid = true;
                    checkResult.status = 'healthy';
                    checkResult.message = 'OAuth token acquired successfully';

                    if (tokenBody.expires_in && tokenBody.expires_in < 300) {
                        checkResult.status = 'degraded';
                        checkResult.message = 'OAuth token expires in ' +
                            tokenBody.expires_in + ' seconds';
                    }
                } else {
                    checkResult.message = 'Token response missing access_token field';
                }
            } else if (httpStatus === 401) {
                checkResult.message = 'Invalid client credentials (HTTP 401)';
            } else {
                checkResult.message = 'Token endpoint returned HTTP ' + httpStatus;
            }
        } catch (e) {
            checkResult.message = 'OAuth check failed: ' + e.message;
        }

        report.checks.push(checkResult);
    }

    /**
     * Check 3: Verify last successful sync is not stale.
     * @param {Object} report - Health report object.
     */
    function _checkLastSync(report) {
        var checkResult = {
            name: 'Last Sync',
            status: 'error',
            message: ''
        };

        // Look for the most recent successful sync log entry
        var logGr = new GlideRecord('x_avnth_integration_health_log');
        logGr.addQuery('source', DATA_SOURCE_NAME);
        logGr.addQuery('category', 'sgc_sync');
        logGr.addQuery('severity', 'IN', 'info,warning');
        logGr.orderByDesc('timestamp');
        logGr.setLimit(1);
        logGr.query();

        if (logGr.next()) {
            var lastSyncTime = new GlideDateTime(logGr.getValue('timestamp'));
            report.last_successful_sync = lastSyncTime.getValue();

            var now = new GlideDateTime();
            var diffMs = GlideDateTime.subtract(lastSyncTime, now).getNumericValue();
            var diffMinutes = Math.floor(diffMs / 60000);

            if (diffMinutes <= STALE_SYNC_THRESHOLD_MINUTES) {
                checkResult.status = 'healthy';
                checkResult.message = 'Last sync ' + diffMinutes + ' minutes ago';
                report.sync_stale = false;
            } else {
                checkResult.status = 'degraded';
                checkResult.message = 'Last sync was ' + diffMinutes +
                    ' minutes ago (threshold: ' + STALE_SYNC_THRESHOLD_MINUTES + ' min)';
                report.sync_stale = true;
            }
        } else {
            checkResult.message = 'No successful sync found in health log';
            checkResult.status = 'degraded';
            report.sync_stale = true;
        }

        report.checks.push(checkResult);
    }

    /**
     * Check 4: Count CIs managed by Pathfinder, grouped by class.
     * @param {Object} report - Health report object.
     */
    function _countManagedCIs(report) {
        var checkResult = {
            name: 'Managed CIs',
            status: 'healthy',
            message: ''
        };

        var ciClasses = [
            { name: 'cmdb_ci_server', label: 'Servers' },
            { name: 'cmdb_ci_app_server', label: 'App Instances' },
            { name: 'cmdb_ci_cloud_service', label: 'Cloud Services' },
            { name: 'cmdb_ci_medical_device', label: 'Medical Devices' },
            { name: 'cmdb_ci_ip_device', label: 'IoT/IP Devices' }
        ];

        var totalCount = 0;
        var countParts = [];

        for (var i = 0; i < ciClasses.length; i++) {
            var ciClass = ciClasses[i];
            var ga = new GlideAggregate(ciClass.name);
            ga.addQuery('discovery_source', DATA_SOURCE_NAME);
            ga.addAggregate('COUNT');
            ga.query();

            var count = 0;
            if (ga.next()) {
                count = parseInt(ga.getAggregate('COUNT'), 10);
            }

            report.ci_counts[ciClass.name] = count;
            totalCount += count;
            countParts.push(ciClass.label + '=' + count);
        }

        // Count relationships
        var relGa = new GlideAggregate('cmdb_rel_ci');
        relGa.addQuery('discovery_source', DATA_SOURCE_NAME);
        relGa.addAggregate('COUNT');
        relGa.query();

        var relCount = 0;
        if (relGa.next()) {
            relCount = parseInt(relGa.getAggregate('COUNT'), 10);
        }
        report.ci_counts['cmdb_rel_ci'] = relCount;
        countParts.push('Relationships=' + relCount);

        report.total_managed_cis = totalCount;
        checkResult.message = countParts.join(', ');

        if (totalCount === 0) {
            checkResult.status = 'degraded';
            checkResult.message = 'No CIs managed by Pathfinder. ' + checkResult.message;
        }

        report.checks.push(checkResult);
    }

    /**
     * Check 5: Count sync errors and warnings in the last hour.
     * @param {Object} report - Health report object.
     */
    function _checkRecentErrors(report) {
        var checkResult = {
            name: 'Recent Errors',
            status: 'healthy',
            message: ''
        };

        var oneHourAgo = new GlideDateTime();
        oneHourAgo.addSeconds(-3600);

        // Count errors
        var errorGa = new GlideAggregate('x_avnth_integration_health_log');
        errorGa.addQuery('source', DATA_SOURCE_NAME);
        errorGa.addQuery('category', 'sgc_sync');
        errorGa.addQuery('severity', 'error');
        errorGa.addQuery('timestamp', '>=', oneHourAgo.getValue());
        errorGa.addAggregate('COUNT');
        errorGa.query();

        if (errorGa.next()) {
            report.errors_last_hour = parseInt(errorGa.getAggregate('COUNT'), 10);
        }

        // Count warnings
        var warnGa = new GlideAggregate('x_avnth_integration_health_log');
        warnGa.addQuery('source', DATA_SOURCE_NAME);
        warnGa.addQuery('category', 'sgc_sync');
        warnGa.addQuery('severity', 'warning');
        warnGa.addQuery('timestamp', '>=', oneHourAgo.getValue());
        warnGa.addAggregate('COUNT');
        warnGa.query();

        if (warnGa.next()) {
            report.warnings_last_hour = parseInt(warnGa.getAggregate('COUNT'), 10);
        }

        if (report.errors_last_hour > 0) {
            checkResult.status = 'error';
            checkResult.message = report.errors_last_hour + ' errors, ' +
                report.warnings_last_hour + ' warnings in last hour';
        } else if (report.warnings_last_hour > 0) {
            checkResult.status = 'degraded';
            checkResult.message = report.warnings_last_hour + ' warnings in last hour';
        } else {
            checkResult.message = 'No errors or warnings in last hour';
        }

        report.checks.push(checkResult);
    }

    /**
     * Check 6: Summarize Pathfinder agent enrollment status.
     * @param {Object} report - Health report object.
     */
    function _checkAgentStatus(report) {
        var checkResult = {
            name: 'Agent Status',
            status: 'healthy',
            message: ''
        };

        // Total agents
        var totalGa = new GlideAggregate('x_avnth_pathfinder_agent');
        totalGa.addAggregate('COUNT');
        totalGa.query();

        if (totalGa.next()) {
            report.agent_count = parseInt(totalGa.getAggregate('COUNT'), 10);
        }

        // Healthy agents (heartbeat within last 5 minutes)
        var fiveMinAgo = new GlideDateTime();
        fiveMinAgo.addSeconds(-300);

        var healthyGa = new GlideAggregate('x_avnth_pathfinder_agent');
        healthyGa.addQuery('last_heartbeat', '>=', fiveMinAgo.getValue());
        healthyGa.addAggregate('COUNT');
        healthyGa.query();

        if (healthyGa.next()) {
            report.agents_healthy = parseInt(healthyGa.getAggregate('COUNT'), 10);
        }

        report.agents_degraded = report.agent_count - report.agents_healthy;

        if (report.agent_count === 0) {
            checkResult.status = 'degraded';
            checkResult.message = 'No agents enrolled';
        } else if (report.agents_degraded > 0) {
            var degradedPct = Math.round((report.agents_degraded / report.agent_count) * 100);
            if (degradedPct > 25) {
                checkResult.status = 'error';
            } else {
                checkResult.status = 'degraded';
            }
            checkResult.message = report.agents_healthy + '/' + report.agent_count +
                ' agents healthy (' + report.agents_degraded + ' missing heartbeat)';
        } else {
            checkResult.message = 'All ' + report.agent_count + ' agents healthy';
        }

        report.checks.push(checkResult);
    }

    /**
     * Determine overall health status based on individual check results.
     * @param {Object} report - Health report object.
     */
    function _determineOverallStatus(report) {
        var hasError = false;
        var hasDegraded = false;

        for (var i = 0; i < report.checks.length; i++) {
            var check = report.checks[i];
            if (check.status === 'error') {
                hasError = true;
            } else if (check.status === 'degraded') {
                hasDegraded = true;
            }
        }

        if (hasError) {
            report.overall_status = 'error';
        } else if (hasDegraded) {
            report.overall_status = 'degraded';
        } else {
            report.overall_status = 'healthy';
        }
    }

    /**
     * Write the health status record visible in the SGC dashboard.
     * Creates or updates a single record per connector.
     * @param {Object} report - Health report object.
     */
    function _writeHealthStatus(report) {
        var gr = new GlideRecord('x_avnth_sgc_health_status');
        gr.addQuery('connector_name', DATA_SOURCE_NAME);
        gr.setLimit(1);
        gr.query();

        if (!gr.next()) {
            gr.initialize();
            gr.setValue('connector_name', DATA_SOURCE_NAME);
        }

        gr.setValue('status', report.overall_status);
        gr.setValue('last_check', report.timestamp);
        gr.setValue('gateway_reachable', report.gateway_reachable);
        gr.setValue('gateway_response_ms', report.gateway_response_ms);
        gr.setValue('gateway_version', report.gateway_version);
        gr.setValue('oauth_valid', report.oauth_valid);
        gr.setValue('last_successful_sync', report.last_successful_sync);
        gr.setValue('sync_stale', report.sync_stale);
        gr.setValue('total_managed_cis', report.total_managed_cis);
        gr.setValue('errors_last_hour', report.errors_last_hour);
        gr.setValue('warnings_last_hour', report.warnings_last_hour);
        gr.setValue('agent_count', report.agent_count);
        gr.setValue('agents_healthy', report.agents_healthy);
        gr.setValue('agents_degraded', report.agents_degraded);
        gr.setValue('ci_counts', JSON.stringify(report.ci_counts));
        gr.setValue('check_details', JSON.stringify(report.checks));
        gr.setValue('last_message', _summarizeChecks(report.checks));

        if (gr.isNewRecord()) {
            gr.insert();
        } else {
            gr.update();
        }
    }

    /**
     * Create a human-readable summary from check results.
     * @param {Array} checks - Array of check result objects.
     * @returns {string} Summary message.
     */
    function _summarizeChecks(checks) {
        var parts = [];
        for (var i = 0; i < checks.length; i++) {
            var check = checks[i];
            if (check.status !== 'healthy') {
                parts.push(check.name + ': ' + check.message);
            }
        }
        return parts.length > 0 ? parts.join('; ') : 'All checks passed';
    }

})();
