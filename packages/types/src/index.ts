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

export const SERVICE_TOKENS = {
  INGESTION: 'INGESTION_SERVICE',
  ALERT: 'ALERT_SERVICE',
} as const;

export const TRANSPORT_PATTERNS = {
  INGESTION_HEALTH: { cmd: 'ingestion.health' },
  ALERT_HEALTH: { cmd: 'alert.health' },
} as const;
