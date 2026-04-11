export interface Project {
    id: string;
    name: string;
    apiKey: string;
    createdAt: string;
}
export interface ErrorEvent {
    id: string;
    projectId: string;
    message: string;
    level: 'error' | 'warning' | 'info';
    timestamp: string;
}
export interface ServiceHealth {
    service: string;
    status: 'ok';
    timestamp: string;
}
export interface TransportHealthResponse extends ServiceHealth {
    dependencies?: ServiceHealth[];
}
export type ErrorLevel = 'error' | 'warning' | 'info';
export interface IngestEventRequest {
    projectId: string;
    message: string;
    level?: ErrorLevel;
    platform: string;
    environment?: string;
    releaseVersion?: string | null;
    exceptionType?: string | null;
    stackTrace?: string | null;
    handled?: boolean;
    sessionId?: string | null;
    userId?: string | null;
    requestUrl?: string | null;
    userAgent?: string | null;
    browserName?: string | null;
    browserVersion?: string | null;
    osName?: string | null;
    osVersion?: string | null;
    tags?: Record<string, string>;
    contexts?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    occurredAt?: string;
}
export interface IngestEventResponse {
    eventId: string;
    projectId: string;
    status: 'accepted';
    receivedAt: string;
}
export interface EnrichedErrorEvent {
    eventId: string;
    projectId: string;
    issueFingerprint: string;
    environment: string;
    releaseVersion: string | null;
    level: ErrorLevel;
    platform: string;
    message: string;
    exceptionType: string | null;
    stackTrace: string;
    handled: number;
    sessionId: string | null;
    userId: string | null;
    requestUrl: string | null;
    userAgent: string | null;
    browserName: string | null;
    browserVersion: string | null;
    osName: string | null;
    osVersion: string | null;
    tagsJson: string;
    contextsJson: string;
    metadataJson: string;
    occurredAt: string;
    receivedAt: string;
}
export interface AlertEvaluationJob {
    eventId: string;
    projectId: string;
    issueFingerprint: string;
    level: ErrorLevel;
    message: string;
    environment: string;
    platform: string;
    occurredAt: string;
    receivedAt: string;
}
export declare const SERVICE_TOKENS: {
    readonly INGESTION: "INGESTION_SERVICE";
    readonly ALERT: "ALERT_SERVICE";
};
export declare const BULL_QUEUES: {
    readonly ALERTS: "alerts";
};
export declare const BULL_JOBS: {
    readonly EVALUATE_ALERT: "evaluate-alert";
};
export declare const TRANSPORT_PATTERNS: {
    readonly INGESTION_HEALTH: {
        readonly cmd: "ingestion.health";
    };
    readonly INGEST_EVENT: {
        readonly cmd: "ingestion.event.ingest";
    };
    readonly ALERT_HEALTH: {
        readonly cmd: "alert.health";
    };
};
