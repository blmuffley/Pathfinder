/**
 * Business Rule: Integration CI — Mark Stale
 * Table: x_avnth_cmdb_ci_integration
 * When: Before Update
 * Condition: last_observed changes
 *
 * If last_observed is more than 90 days ago, set operational_status to
 * "Non-Operational" and add a work note. This runs on update so the
 * gateway sync triggers it when refreshing last_observed.
 */
(function executeRule(current, previous) {

    if (current.last_observed.nil()) {
        return;
    }

    var lastObserved = new GlideDateTime(current.last_observed);
    var now = new GlideDateTime();
    var diffDays = gs.dateDiff(lastObserved.getDisplayValue(), now.getDisplayValue(), true);

    // gs.dateDiff returns seconds — convert to days
    var daysSince = Math.floor(parseInt(diffDays, 10) / 86400);

    if (daysSince > 90 && current.operational_status != '2') {
        // 2 = Non-Operational in default ServiceNow choice list
        current.operational_status = '2';
        current.work_notes = 'Automatically marked as stale — no flows observed in ' + daysSince + ' days.';
    }

})(current, previous);
