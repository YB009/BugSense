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

export interface AlertThresholdRule {
  threshold: number;
  windowSeconds: number;
  cooldownSeconds: number;
}

export interface ProjectAlertRules {
  error?: AlertThresholdRule;
  warning?: AlertThresholdRule;
  info?: AlertThresholdRule;
}

export interface AlertRulesConfig {
  [projectId: string]: ProjectAlertRules;
}

export interface AlertEmailRecipientsConfig {
  [projectId: string]: string[];
}

export interface SourcemapUploadRequest {
  projectId: string;
  release: string;
  fileName: string;
  relativePath: string;
  sourceMap: string;
}

export interface SourcemapUploadResponse {
  projectId: string;
  release: string;
  fileName: string;
  relativePath: string;
  status: 'stored';
  storedAt: string;
  checksum: string;
  storagePath: string;
}

export interface LiveErrorEvent {
  eventId: string;
  projectId: string;
  message: string;
  level: ErrorLevel;
  platform: string;
  environment: string;
  exceptionType: string | null;
  receivedAt: string;
}

export interface GroupingCandidateEvent {
  eventId: string;
  projectId: string;
  issueFingerprint: string;
  message: string;
  exceptionType: string | null;
  stackTrace: string;
  requestUrl: string | null;
  metadataJson: string;
  environment: string;
  platform: string;
  receivedAt: string;
}

export interface GroupedIssue {
  issueId: string;
  projectId: string;
  clusterKey: string;
  title: string;
  summary: string;
  eventIds: string[];
  fingerprints: string[];
  sampleMessage: string;
  sampleStackTrace: string;
  environments: string[];
  platforms: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
}

export interface IssueListItem extends GroupedIssue {
  totalEvents: number;
}

export interface IssueBreakdownItem {
  label: string;
  count: number;
}

export interface IssueDetail {
  issue: GroupedIssue;
  totalEvents: number;
  affectedUsers: number;
  browserBreakdown: IssueBreakdownItem[];
  osBreakdown: IssueBreakdownItem[];
  stackTrace: string;
}

export interface IssueAnalysisResult {
  issueId: string;
  model: string;
  provider: 'gemini' | 'heuristic';
  rootCause: string;
  suggestedFix: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface IssueGroupingRunResult {
  status: 'completed';
  groupedCount: number;
  generatedAt: string;
  issues: GroupedIssue[];
}

export const SERVICE_TOKENS = {
  INGESTION: 'INGESTION_SERVICE',
  ALERT: 'ALERT_SERVICE',
} as const;

export const BULL_QUEUES = {
  ALERTS: 'alerts',
} as const;

export const BULL_JOBS = {
  EVALUATE_ALERT: 'evaluate-alert',
  GROUP_ISSUES_NIGHTLY: 'group-issues-nightly',
} as const;

export const TRANSPORT_PATTERNS = {
  INGESTION_HEALTH: { cmd: 'ingestion.health' },
  INGEST_EVENT: { cmd: 'ingestion.event.ingest' },
  UPLOAD_SOURCEMAP: { cmd: 'ingestion.sourcemap.upload' },
  ALERT_HEALTH: { cmd: 'alert.health' },
} as const;
