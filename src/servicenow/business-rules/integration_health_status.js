/**
 * Business Rule: Integration CI — Derive Health Status from Score
 * Table: x_avnth_cmdb_ci_integration
 * When: Before Insert, Before Update
 * Condition: health_score changes
 *
 * Maps the composite health score (0-100) to a health status category.
 * 80-100 = Healthy, 60-79 = Degraded, 0-59 = Critical, null = Unknown
 */
(function executeRule(current, previous) {

    var score = parseInt(current.health_score, 10);

    if (isNaN(score) || current.health_score.nil()) {
        current.health_status = 'Unknown';
    } else if (score >= 80) {
        current.health_status = 'Healthy';
    } else if (score >= 60) {
        current.health_status = 'Degraded';
    } else {
        current.health_status = 'Critical';
    }

})(current, previous);
