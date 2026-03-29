/**
 * Business Rule: Pathfinder Agent — Mark Stale on Missed Heartbeats
 * Table: x_avnth_pathfinder_agent
 * When: Before Update
 * Condition: last_heartbeat changes
 *
 * If last_heartbeat is more than 5 minutes old, mark the agent as Stale.
 * If a fresh heartbeat arrives for a stale agent, reactivate it.
 */
(function executeRule(current, previous) {

    if (current.last_heartbeat.nil()) {
        return;
    }

    var lastHB = new GlideDateTime(current.last_heartbeat);
    var now = new GlideDateTime();
    var diffSeconds = parseInt(gs.dateDiff(lastHB.getDisplayValue(), now.getDisplayValue(), true), 10);

    if (diffSeconds > 300 && current.status == 'Active') {
        current.status = 'Stale';
        current.work_notes = 'Agent marked stale — no heartbeat for ' + Math.floor(diffSeconds / 60) + ' minutes.';
    } else if (diffSeconds <= 300 && current.status == 'Stale') {
        current.status = 'Active';
        current.work_notes = 'Agent reactivated — heartbeat received.';
    }

})(current, previous);
