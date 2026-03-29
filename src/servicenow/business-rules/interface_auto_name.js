/**
 * Business Rule: Interface CI — Auto-generate Name
 * Table: x_avnth_cmdb_ci_interface
 * When: Before Insert, Before Update
 * Condition: protocol, port, or direction changes
 *
 * Auto-generates the interface name as "{protocol}:{port} ({direction})".
 */
(function executeRule(current, previous) {

    if (current.protocol.nil() || current.port.nil() || current.direction.nil()) {
        return;
    }

    current.name = current.protocol + ':' + current.port + ' (' + current.direction + ')';

})(current, previous);
