/**
 * Avennorth Pathfinder — Service Graph Connector Scheduled Import
 *
 * This scheduled import script runs on a configurable interval (default: 60s)
 * to pull discovered CI data from the Pathfinder Gateway and feed it into the
 * ServiceNow Identification and Reconciliation Engine (IRE).
 *
 * Flow:
 *   1. Read connection config (gateway URL, OAuth credentials)
 *   2. Obtain OAuth2 access token
 *   3. Call GET /api/v1/sgc/export on the Pathfinder Gateway
 *   4. Transform response into IRE-compatible payload
 *   5. Call createOrUpdateCI for each CI in batches
 *   6. Call POST /api/v1/sgc/ack to confirm sync
 *   7. Log results and update data source last_sync timestamp
 *
 * Scope: x_avnth_pathfinder_sgc
 * Table: sys_trigger (Scheduled Job)
 */
(function executeScheduledImport() {
    'use strict';

    var SCOPE = 'x_avnth_pathfinder_sgc';
    var LOG_SOURCE = 'Pathfinder SGC Import';
    var DATA_SOURCE_NAME = 'Avennorth Pathfinder';

    // -----------------------------------------------------------------------
    // Configuration: read connection properties from the SGC connection record
    // -----------------------------------------------------------------------
    var config = _loadConnectionConfig();
    if (!config) {
        gs.error(LOG_SOURCE + ': Unable to load connection configuration. Aborting import.');
        return;
    }

    var stats = {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        relationships_created: 0,
        relationships_updated: 0,
        total_batches: 0,
        start_time: new GlideDateTime(),
        end_time: null
    };

    // -----------------------------------------------------------------------
    // Step 1: Obtain OAuth2 access token
    // -----------------------------------------------------------------------
    var accessToken = _getAccessToken(config);
    if (!accessToken) {
        _logSyncError('OAuth token acquisition failed. Check client_id and client_secret.', config);
        return;
    }

    // -----------------------------------------------------------------------
    // Step 2: Pull export data from the Pathfinder Gateway
    // -----------------------------------------------------------------------
    var cursor = '';
    var hasMore = true;

    while (hasMore) {
        var exportUrl = config.gateway_url + '/api/v1/sgc/export';
        exportUrl += '?batch_size=' + config.batch_size;
        if (cursor) {
            exportUrl += '&cursor=' + encodeURIComponent(cursor);
        }

        var exportResponse = _callGateway('GET', exportUrl, null, accessToken);

        if (!exportResponse.success) {
            // If token expired mid-sync, attempt one refresh
            if (exportResponse.status_code === 401) {
                gs.warn(LOG_SOURCE + ': Access token expired mid-sync. Attempting refresh.');
                accessToken = _getAccessToken(config);
                if (!accessToken) {
                    _logSyncError('OAuth token refresh failed during sync.', config);
                    break;
                }
                exportResponse = _callGateway('GET', exportUrl, null, accessToken);
                if (!exportResponse.success) {
                    _logSyncError('Export call failed after token refresh. Status: ' + exportResponse.status_code, config);
                    break;
                }
            } else {
                _logSyncError('Export call failed. Status: ' + exportResponse.status_code +
                    ', Body: ' + exportResponse.body, config);
                break;
            }
        }

        var exportData;
        try {
            exportData = JSON.parse(exportResponse.body);
        } catch (e) {
            _logSyncError('Failed to parse export response JSON: ' + e.message, config);
            break;
        }

        stats.total_batches++;

        // -----------------------------------------------------------------
        // Step 3: Process CIs through IRE
        // -----------------------------------------------------------------
        if (exportData.cis && exportData.cis.length > 0) {
            _processCiBatch(exportData.cis, stats);
        }

        // -----------------------------------------------------------------
        // Step 4: Process relationships through IRE
        // -----------------------------------------------------------------
        if (exportData.relationships && exportData.relationships.length > 0) {
            _processRelationshipBatch(exportData.relationships, stats);
        }

        // -----------------------------------------------------------------
        // Step 5: Pagination
        // -----------------------------------------------------------------
        cursor = exportData.next_cursor || '';
        hasMore = exportData.has_more === true && cursor !== '';
    }

    // -----------------------------------------------------------------------
    // Step 6: Acknowledge sync completion to the gateway
    // -----------------------------------------------------------------------
    stats.end_time = new GlideDateTime();
    var ackPayload = {
        sync_id: exportData ? exportData.sync_id : '',
        timestamp: stats.end_time.getValue(),
        stats: {
            created: stats.created,
            updated: stats.updated,
            skipped: stats.skipped,
            failed: stats.failed,
            relationships_created: stats.relationships_created,
            relationships_updated: stats.relationships_updated
        }
    };

    var ackUrl = config.gateway_url + '/api/v1/sgc/ack';
    var ackResponse = _callGateway('POST', ackUrl, JSON.stringify(ackPayload), accessToken);

    if (!ackResponse.success) {
        gs.warn(LOG_SOURCE + ': Sync acknowledgment failed (non-critical). Status: ' + ackResponse.status_code);
    }

    // -----------------------------------------------------------------------
    // Step 7: Update data source last_sync and log results
    // -----------------------------------------------------------------------
    _updateDataSourceTimestamp(config);
    _logSyncResults(stats);

    gs.info(LOG_SOURCE + ': Import complete. Created=' + stats.created +
        ' Updated=' + stats.updated + ' Skipped=' + stats.skipped +
        ' Failed=' + stats.failed + ' RelCreated=' + stats.relationships_created +
        ' RelUpdated=' + stats.relationships_updated +
        ' Batches=' + stats.total_batches);

    // =======================================================================
    // Internal Functions
    // =======================================================================

    /**
     * Load connection configuration from the SGC connection record.
     * @returns {Object|null} Configuration object or null if not found.
     */
    function _loadConnectionConfig() {
        var gr = new GlideRecord('sys_connection');
        gr.addQuery('name', DATA_SOURCE_NAME);
        gr.addQuery('active', true);
        gr.setLimit(1);
        gr.query();

        if (!gr.next()) {
            // Fallback: try loading from system properties
            var gatewayUrl = gs.getProperty(SCOPE + '.gateway_url');
            if (!gatewayUrl) {
                return null;
            }
            return {
                gateway_url: gatewayUrl,
                client_id: gs.getProperty(SCOPE + '.client_id'),
                client_secret: gs.getProperty(SCOPE + '.client_secret'),
                sync_interval: parseInt(gs.getProperty(SCOPE + '.sync_interval', '60'), 10),
                batch_size: parseInt(gs.getProperty(SCOPE + '.batch_size', '100'), 10),
                connection_sys_id: null
            };
        }

        // Parse connection attributes from the connection record
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
            client_secret: attrs.client_secret || '',
            sync_interval: parseInt(attrs.sync_interval || '60', 10),
            batch_size: parseInt(attrs.batch_size || '100', 10),
            connection_sys_id: gr.getUniqueValue()
        };
    }

    /**
     * Obtain an OAuth2 access token using client credentials grant.
     * @param {Object} cfg - Connection configuration.
     * @returns {string|null} Access token or null on failure.
     */
    function _getAccessToken(cfg) {
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
                return tokenBody.access_token || null;
            }

            gs.error(LOG_SOURCE + ': OAuth token request failed. Status: ' + httpStatus +
                ', Body: ' + response.getBody());
            return null;
        } catch (e) {
            gs.error(LOG_SOURCE + ': OAuth token request exception: ' + e.message);
            return null;
        }
    }

    /**
     * Make an HTTP call to the Pathfinder Gateway.
     * @param {string} method - HTTP method (GET, POST).
     * @param {string} url - Full URL.
     * @param {string|null} body - Request body for POST.
     * @param {string} token - Bearer token.
     * @returns {Object} Response object with success, status_code, body.
     */
    function _callGateway(method, url, body, token) {
        var result = { success: false, status_code: 0, body: '' };

        try {
            var request = new sn_ws.RESTMessageV2();
            request.setEndpoint(url);
            request.setHttpMethod(method);
            request.setRequestHeader('Authorization', 'Bearer ' + token);
            request.setRequestHeader('Content-Type', 'application/json');
            request.setRequestHeader('Accept', 'application/json');
            request.setRequestHeader('X-SGC-Scope', SCOPE);
            request.setHttpTimeout(30000);

            if (body) {
                request.setRequestBody(body);
            }

            var response = request.execute();
            result.status_code = parseInt(response.getStatusCode(), 10);
            result.body = response.getBody();
            result.success = (result.status_code >= 200 && result.status_code < 300);
        } catch (e) {
            gs.error(LOG_SOURCE + ': Gateway call failed. Method=' + method +
                ' URL=' + url + ' Error=' + e.message);
            result.status_code = 0;
            result.body = e.message;
        }

        return result;
    }

    /**
     * Process a batch of CI payloads through the IRE createOrUpdateCI API.
     * @param {Array} cis - Array of CI objects from the gateway export.
     * @param {Object} stats - Running statistics object.
     */
    function _processCiBatch(cis, stats) {
        for (var i = 0; i < cis.length; i++) {
            var ci = cis[i];
            try {
                var payload = _transformCiToIrePayload(ci);
                if (!payload) {
                    stats.skipped++;
                    continue;
                }

                var output = sn_cmdb.IdentificationEngine.createOrUpdateCI(
                    DATA_SOURCE_NAME,
                    JSON.stringify(payload)
                );

                if (output) {
                    var outputObj = JSON.parse(output);
                    if (outputObj.items && outputObj.items.length > 0) {
                        var item = outputObj.items[0];
                        if (item.operation === 'INSERT') {
                            stats.created++;
                        } else if (item.operation === 'UPDATE' || item.operation === 'NO_CHANGE') {
                            stats.updated++;
                        } else if (item.operation === 'SKIPPED') {
                            stats.skipped++;
                        }

                        if (item.errors && item.errors.length > 0) {
                            gs.warn(LOG_SOURCE + ': IRE validation warnings for CI "' +
                                ci.name + '": ' + JSON.stringify(item.errors));
                        }
                    }
                }
            } catch (e) {
                stats.failed++;
                gs.error(LOG_SOURCE + ': IRE createOrUpdateCI failed for CI "' +
                    (ci.name || 'unknown') + '": ' + e.message);
            }
        }
    }

    /**
     * Process a batch of relationship payloads through the IRE.
     * @param {Array} relationships - Array of relationship objects from the gateway.
     * @param {Object} stats - Running statistics object.
     */
    function _processRelationshipBatch(relationships, stats) {
        for (var i = 0; i < relationships.length; i++) {
            var rel = relationships[i];
            try {
                var payload = _transformRelationshipToIrePayload(rel);
                if (!payload) {
                    stats.skipped++;
                    continue;
                }

                var output = sn_cmdb.IdentificationEngine.createOrUpdateCI(
                    DATA_SOURCE_NAME,
                    JSON.stringify(payload)
                );

                if (output) {
                    var outputObj = JSON.parse(output);
                    if (outputObj.items && outputObj.items.length > 0) {
                        var item = outputObj.items[0];
                        if (item.operation === 'INSERT') {
                            stats.relationships_created++;
                        } else {
                            stats.relationships_updated++;
                        }
                    }
                }
            } catch (e) {
                stats.failed++;
                gs.error(LOG_SOURCE + ': IRE relationship processing failed for "' +
                    (rel.parent_name || 'unknown') + ' -> ' +
                    (rel.child_name || 'unknown') + '": ' + e.message);
            }
        }
    }

    /**
     * Transform a Pathfinder CI export object into an IRE-compatible payload.
     *
     * The IRE expects a specific JSON structure with items[] containing
     * className, values, and lookup rules. This function maps Pathfinder's
     * flat export format to that structure.
     *
     * @param {Object} ci - Raw CI object from gateway export.
     * @returns {Object|null} IRE payload or null if CI class is unknown.
     */
    function _transformCiToIrePayload(ci) {
        var ciClass = _mapCiClass(ci.ci_type);
        if (!ciClass) {
            gs.warn(LOG_SOURCE + ': Unknown CI type "' + ci.ci_type + '" — skipping.');
            return null;
        }

        var values = {
            name: ci.name || '',
            discovery_source: DATA_SOURCE_NAME,
            x_avnth_pathfinder_managed: 'true',
            x_avnth_confidence_score: ci.confidence_score || 0,
            x_avnth_first_observed: ci.first_observed || '',
            x_avnth_last_observed: ci.last_observed || ''
        };

        // Map class-specific fields
        switch (ciClass) {
            case 'cmdb_ci_server':
                values.ip_address = ci.ip_address || '';
                values.os = ci.os || '';
                values.os_version = ci.os_version || '';
                values.cpu_count = ci.cpu_count || '';
                values.ram = ci.ram || '';
                values.mac_address = ci.mac_address || '';
                values.dns_domain = ci.dns_domain || '';
                values.serial_number = ci.serial_number || '';
                values.x_avnth_agent_version = ci.agent_version || '';
                values.x_avnth_coverage_tier = ci.coverage_tier || '';
                break;

            case 'cmdb_ci_app_server':
                values.ip_address = ci.ip_address || '';
                values.tcp_port = ci.tcp_port || '';
                values.running_process = ci.process_name || '';
                values.running_process_command = ci.process_command || '';
                values.version = ci.app_version || '';
                values.x_avnth_behavioral_class = ci.behavioral_class || '';
                values.x_avnth_protocol_fingerprint = ci.protocol_fingerprint || '';
                values.x_avnth_connection_count = ci.connection_count || 0;
                // Host reference — lookup by server name
                if (ci.host_name) {
                    values.host = {
                        lookup_key: 'name',
                        lookup_value: ci.host_name
                    };
                }
                break;

            case 'cmdb_ci_cloud_service':
                values.service_type = ci.service_type || '';
                values.cloud_region = ci.cloud_region || '';
                values.x_avnth_cloud_provider = ci.cloud_provider || '';
                values.x_avnth_endpoint_url = ci.endpoint_url || '';
                values.x_avnth_tls_version = ci.tls_version || '';
                break;

            case 'cmdb_ci_medical_device':
                values.serial_number = ci.serial_number || '';
                values.ip_address = ci.ip_address || '';
                values.mac_address = ci.mac_address || '';
                values.x_avnth_device_risk_tier = ci.risk_tier || '';
                values.x_avnth_protocol_type = ci.protocol_type || '';
                values.x_avnth_network_segment = ci.network_segment || '';
                break;

            case 'cmdb_ci_ip_device':
                values.ip_address = ci.ip_address || '';
                values.mac_address = ci.mac_address || '';
                values.os = ci.firmware || '';
                values.os_version = ci.firmware_version || '';
                values.x_avnth_protocol_type = ci.protocol_type || '';
                values.x_avnth_iot_category = ci.iot_category || '';
                values.x_avnth_network_segment = ci.network_segment || '';
                values.x_avnth_firmware_hash = ci.firmware_hash || '';
                break;
        }

        return {
            items: [{
                className: ciClass,
                values: values
            }]
        };
    }

    /**
     * Transform a Pathfinder relationship export object into an IRE payload.
     * @param {Object} rel - Relationship object from gateway export.
     * @returns {Object|null} IRE relationship payload.
     */
    function _transformRelationshipToIrePayload(rel) {
        var parentClass = _mapCiClass(rel.parent_type);
        var childClass = _mapCiClass(rel.child_type);

        if (!parentClass || !childClass) {
            gs.warn(LOG_SOURCE + ': Unknown CI type in relationship — skipping.');
            return null;
        }

        return {
            items: [{
                className: parentClass,
                values: {
                    name: rel.parent_name
                }
            }],
            relations: [{
                parent: 0,
                child: {
                    className: childClass,
                    values: {
                        name: rel.child_name
                    }
                },
                type: _mapRelationshipType(rel.relationship_type),
                values: {
                    discovery_source: DATA_SOURCE_NAME,
                    x_avnth_confidence_score: rel.confidence_score || 0,
                    x_avnth_first_observed: rel.first_observed || '',
                    x_avnth_last_observed: rel.last_observed || '',
                    x_avnth_connection_count: rel.connection_count || 0,
                    x_avnth_bytes_transferred: rel.bytes_transferred || 0,
                    x_avnth_protocol: rel.protocol || ''
                }
            }]
        };
    }

    /**
     * Map Pathfinder CI type strings to ServiceNow CMDB class names.
     * @param {string} pfType - Pathfinder CI type identifier.
     * @returns {string|null} ServiceNow CI class name.
     */
    function _mapCiClass(pfType) {
        var classMap = {
            'server': 'cmdb_ci_server',
            'app_server': 'cmdb_ci_app_server',
            'app_instance': 'cmdb_ci_app_server',
            'cloud_service': 'cmdb_ci_cloud_service',
            'medical_device': 'cmdb_ci_medical_device',
            'iot_device': 'cmdb_ci_ip_device',
            'ip_device': 'cmdb_ci_ip_device'
        };
        return classMap[pfType] || null;
    }

    /**
     * Map Pathfinder relationship type strings to ServiceNow cmdb_rel_type names.
     * @param {string} pfRelType - Pathfinder relationship type.
     * @returns {string} ServiceNow relationship type display name.
     */
    function _mapRelationshipType(pfRelType) {
        var relMap = {
            'depends_on': 'Depends on::Used by',
            'sends_data_to': 'Sends data to::Receives data from',
            'runs_on': 'Runs on::Runs',
            'connects_to': 'Connects to::Connected by',
            'uses': 'Depends on::Used by'
        };
        return relMap[pfRelType] || 'Depends on::Used by';
    }

    /**
     * Update the data source record with the last successful sync timestamp.
     * @param {Object} cfg - Connection configuration.
     */
    function _updateDataSourceTimestamp(cfg) {
        var gr = new GlideRecord('sys_data_source');
        gr.addQuery('name', DATA_SOURCE_NAME);
        gr.setLimit(1);
        gr.query();

        if (gr.next()) {
            gr.setValue('x_avnth_last_sync', new GlideDateTime().getValue());
            gr.update();
        }

        // Also update the connection record if available
        if (cfg.connection_sys_id) {
            var connGr = new GlideRecord('sys_connection');
            if (connGr.get(cfg.connection_sys_id)) {
                connGr.setValue('x_avnth_last_sync', new GlideDateTime().getValue());
                connGr.update();
            }
        }
    }

    /**
     * Log sync error to the Pathfinder health log table and system log.
     * @param {string} message - Error message.
     * @param {Object} cfg - Connection configuration.
     */
    function _logSyncError(message, cfg) {
        gs.error(LOG_SOURCE + ': ' + message);

        // Write to health log table for dashboard visibility
        var logGr = new GlideRecord('x_avnth_integration_health_log');
        logGr.initialize();
        logGr.setValue('source', DATA_SOURCE_NAME);
        logGr.setValue('severity', 'error');
        logGr.setValue('message', message);
        logGr.setValue('category', 'sgc_sync');
        logGr.setValue('timestamp', new GlideDateTime().getValue());
        logGr.insert();

        // Update health status record
        _updateHealthStatus('error', message);
    }

    /**
     * Log sync results to the health log table.
     * @param {Object} stats - Sync statistics.
     */
    function _logSyncResults(stats) {
        var message = 'Sync completed. Created=' + stats.created +
            ' Updated=' + stats.updated + ' Skipped=' + stats.skipped +
            ' Failed=' + stats.failed + ' Batches=' + stats.total_batches;

        var severity = stats.failed > 0 ? 'warning' : 'info';

        var logGr = new GlideRecord('x_avnth_integration_health_log');
        logGr.initialize();
        logGr.setValue('source', DATA_SOURCE_NAME);
        logGr.setValue('severity', severity);
        logGr.setValue('message', message);
        logGr.setValue('category', 'sgc_sync');
        logGr.setValue('timestamp', new GlideDateTime().getValue());
        logGr.insert();

        var statusMsg = stats.failed > 0 ? 'Sync completed with errors' : 'Sync completed successfully';
        _updateHealthStatus(stats.failed > 0 ? 'degraded' : 'healthy', statusMsg);
    }

    /**
     * Update the SGC health status record for dashboard display.
     * @param {string} status - Health status (healthy, degraded, error).
     * @param {string} message - Status message.
     */
    function _updateHealthStatus(status, message) {
        var gr = new GlideRecord('x_avnth_sgc_health_status');
        gr.addQuery('connector_name', DATA_SOURCE_NAME);
        gr.setLimit(1);
        gr.query();

        if (!gr.next()) {
            gr.initialize();
            gr.setValue('connector_name', DATA_SOURCE_NAME);
        }

        gr.setValue('status', status);
        gr.setValue('last_message', message);
        gr.setValue('last_check', new GlideDateTime().getValue());

        if (gr.isNewRecord()) {
            gr.insert();
        } else {
            gr.update();
        }
    }

})();
