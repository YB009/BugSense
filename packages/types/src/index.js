"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSPORT_PATTERNS = exports.BULL_JOBS = exports.BULL_QUEUES = exports.SERVICE_TOKENS = void 0;
exports.SERVICE_TOKENS = {
    INGESTION: 'INGESTION_SERVICE',
    ALERT: 'ALERT_SERVICE',
};
exports.BULL_QUEUES = {
    ALERTS: 'alerts',
};
exports.BULL_JOBS = {
    EVALUATE_ALERT: 'evaluate-alert',
};
exports.TRANSPORT_PATTERNS = {
    INGESTION_HEALTH: { cmd: 'ingestion.health' },
    INGEST_EVENT: { cmd: 'ingestion.event.ingest' },
    ALERT_HEALTH: { cmd: 'alert.health' },
};
//# sourceMappingURL=index.js.map