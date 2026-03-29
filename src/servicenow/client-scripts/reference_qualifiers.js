/**
 * Client Scripts for Pathfinder Scoped App
 *
 * These configure reference qualifiers and field behaviors on forms.
 * Deploy as Client Scripts (Type: onChange or onLoad) in ServiceNow Studio.
 */

// =====================================================================
// Client Script 1: Integration CI — Filter source_ci to applications
// Table: x_avnth_cmdb_ci_integration
// Type: onLoad
// =====================================================================
// Sets a reference qualifier on source_ci and target_ci to only show
// application-type CIs (not hardware, network, etc.)
function onLoad_integration_ci_qualifiers() {
    // Filter source_ci to application classes
    var appFilter = 'sys_class_nameINcmdb_ci_appl,cmdb_ci_service,cmdb_ci_app_server';
    g_form.getControl('source_ci').setAttribute('ref_qual_elements', '');
    g_form.setReferenceQualifier('source_ci', appFilter);

    g_form.getControl('target_ci').setAttribute('ref_qual_elements', '');
    g_form.setReferenceQualifier('target_ci', appFilter);
}

// =====================================================================
// Client Script 2: Coverage Gap — Filter server to operational servers
// Table: x_avnth_coverage_gap
// Type: onLoad
// =====================================================================
function onLoad_coverage_gap_server_qualifier() {
    // Only show operational servers
    g_form.setReferenceQualifier('server', 'operational_status=1');
}

// =====================================================================
// Client Script 3: Agent — Filter server to match agent OS
// Table: x_avnth_pathfinder_agent
// Type: onChange (os_type)
// =====================================================================
function onChange_agent_os_server_filter(control, oldValue, newValue, isLoading) {
    if (isLoading) return;

    var osFilter = '';
    if (newValue === 'Linux') {
        osFilter = 'os_nameLIKElinux^ORos_nameLIKEubuntu^ORos_nameLIKEcentos^ORos_nameLIKErhel';
    } else if (newValue === 'Windows') {
        osFilter = 'os_nameLIKEwindows';
    }
    // Kubernetes nodes don't filter by OS

    if (osFilter) {
        g_form.setReferenceQualifier('server', 'operational_status=1^' + osFilter);
    } else {
        g_form.setReferenceQualifier('server', 'operational_status=1');
    }
}

// =====================================================================
// Client Script 4: Integration CI — Auto-set health status color
// Table: x_avnth_cmdb_ci_integration
// Type: onLoad
// Purpose: Add visual indicator to health_status field
// =====================================================================
function onLoad_integration_health_color() {
    var status = g_form.getValue('health_status');
    var el = g_form.getControl('health_status');
    if (!el) return;

    el.style.fontWeight = 'bold';
    switch (status) {
        case 'Healthy':
            el.style.color = '#22c55e';
            break;
        case 'Degraded':
            el.style.color = '#f59e0b';
            break;
        case 'Critical':
            el.style.color = '#ef4444';
            break;
        default:
            el.style.color = '#6b7280';
    }
}

// =====================================================================
// Client Script 5: EA Map — Auto-set mapped_at on status change
// Table: x_avnth_integration_ea_map
// Type: onChange (mapping_status)
// =====================================================================
function onChange_ea_map_status(control, oldValue, newValue, isLoading) {
    if (isLoading) return;

    if (newValue === 'Confirmed' || newValue === 'Rejected') {
        // Set mapped_by to current user
        g_form.setValue('mapped_by', g_user.userID);
        // Set mapped_at to now
        var now = new GlideDateTime();
        g_form.setValue('mapped_at', now.getDisplayValue());
    }
}
