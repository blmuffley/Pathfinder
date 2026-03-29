/**
 * Business Rule: Integration CI — Auto-generate Name
 * Table: x_avnth_cmdb_ci_integration
 * When: Before Insert, Before Update
 * Condition: source_ci or target_ci changes
 *
 * Auto-generates the integration name as "{source_app} → {target_app}".
 */
(function executeRule(current, previous) {

    if (current.source_ci.nil() || current.target_ci.nil()) {
        return;
    }

    var sourceName = current.source_ci.getDisplayValue();
    var targetName = current.target_ci.getDisplayValue();

    current.name = sourceName + ' \u2192 ' + targetName;

})(current, previous);
