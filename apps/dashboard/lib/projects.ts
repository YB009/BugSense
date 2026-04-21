import { getDashboardAccessToken, getDashboardApiUrl } from './auth';

export interface DashboardProject {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
}

export interface ProjectErrorEvent {
  eventId: string;
  projectId: string;
  message: string;
  level: 'error' | 'warning' | 'info';
  platform: string;
  environment: string;
  exceptionType: string | null;
  receivedAt: string;
}

export async function fetchProjects(): Promise<DashboardProject[]> {
  const token = await getDashboardAccessToken();
  if (!token) {
    return [];
  }

  const response = await fetch(`${getDashboardApiUrl()}/projects`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { projects?: DashboardProject[] };
  return payload.projects ?? [];
}

export async function fetchRecentProjectErrors(): Promise<ProjectErrorEvent[]> {
  const token = await getDashboardAccessToken();
  if (!token) {
    return [];
  }

  const url = new URL('/sse/errors/recent', getDashboardApiUrl());
  url.searchParams.set('token', token);

  const response = await fetch(url.toString(), {
    cache: 'no-store',
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { events?: ProjectErrorEvent[] };
  return payload.events ?? [];
}
