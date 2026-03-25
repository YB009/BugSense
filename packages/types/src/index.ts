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

