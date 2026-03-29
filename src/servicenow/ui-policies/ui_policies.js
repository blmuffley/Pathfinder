/**
 * UI Policies for Pathfinder Scoped App
 *
 * These define conditional field visibility and mandatory rules
 * on ServiceNow forms. Import via System UI > UI Policies.
 */

// =====================================================================
// UI Policy 1: Coverage Gap — Show waiver fields only when Waived
// Table: x_avnth_coverage_gap
// Condition: remediation_status == 'Waived'
// =====================================================================
// When: remediation_status changes
// If remediation_status == 'Waived':
//   Show:    waive_reason (mandatory), waived_by (mandatory)
//   Hide:    remediation_cr
// Else If remediation_status == 'InProgress' || 'Resolved' || 'Failed':
//   Show:    remediation_cr, remediation_method
//   Hide:    waive_reason, waived_by
// Else (Open):
//   Hide:    waive_reason, waived_by, remediation_cr, resolved_at

var policy_coverage_gap_waiver = {
    table: 'x_avnth_coverage_gap',
    short_description: 'Show waiver fields when status is Waived',
    conditions: 'remediation_status=Waived',
    on_load: true,
    reverse: true,
    actions: [
        { field: 'waive_reason', visible: true, mandatory: true },
        { field: 'waived_by', visible: true, mandatory: true }
    ]
};

var policy_coverage_gap_remediation = {
    table: 'x_avnth_coverage_gap',
    short_description: 'Show remediation fields when InProgress/Resolved/Failed',
    conditions: 'remediation_status=InProgress^ORremediation_status=Resolved^ORremediation_status=Failed',
    on_load: true,
    reverse: true,
    actions: [
        { field: 'remediation_cr', visible: true },
        { field: 'remediation_method', visible: true },
        { field: 'resolved_at', visible: true }
    ]
};

// =====================================================================
// UI Policy 2: Integration CI — Show EA fields only when Mapped/Disputed
// Table: x_avnth_cmdb_ci_integration
// =====================================================================
var policy_integration_ea_fields = {
    table: 'x_avnth_cmdb_ci_integration',
    short_description: 'Show EA relationship when status is Mapped or Disputed',
    conditions: 'ea_status=Mapped^ORea_status=Disputed',
    on_load: true,
    reverse: true,
    actions: [
        { field: 'ea_relationship', visible: true }
    ]
};

// =====================================================================
// UI Policy 3: Integration CI — Make owner/support_group mandatory
//              for Critical/High integrations
// Table: x_avnth_cmdb_ci_integration
// =====================================================================
var policy_integration_governance = {
    table: 'x_avnth_cmdb_ci_integration',
    short_description: 'Require owner and support group for Critical/High',
    conditions: 'criticality=Critical^ORcriticality=High',
    on_load: true,
    reverse: false,
    actions: [
        { field: 'owner', mandatory: true },
        { field: 'support_group', mandatory: true },
        { field: 'data_classification', mandatory: true }
    ]
};

// =====================================================================
// UI Policy 4: EA Map — Show mapped_by/mapped_at when Confirmed/Rejected
// Table: x_avnth_integration_ea_map
// =====================================================================
var policy_ea_map_confirmed = {
    table: 'x_avnth_integration_ea_map',
    short_description: 'Show mapping details when Confirmed or Rejected',
    conditions: 'mapping_status=Confirmed^ORmapping_status=Rejected',
    on_load: true,
    reverse: true,
    actions: [
        { field: 'mapped_by', visible: true },
        { field: 'mapped_at', visible: true }
    ]
};

// =====================================================================
// UI Policy 5: Agent — Show decommission warning
// Table: x_avnth_pathfinder_agent
// =====================================================================
var policy_agent_decommissioned = {
    table: 'x_avnth_pathfinder_agent',
    short_description: 'Make fields read-only when Decommissioned',
    conditions: 'status=Decommissioned',
    on_load: true,
    reverse: false,
    actions: [
        { field: 'agent_id', read_only: true },
        { field: 'hostname', read_only: true },
        { field: 'os_type', read_only: true },
        { field: 'coverage_tier', read_only: true }
    ]
};
