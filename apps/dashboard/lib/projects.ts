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
  try {
    const token = await getDashboardAccessToken();
    if (!token) {
      return [];
    }

    const response = await fetch(`${getDashboardApiUrl()}/projects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as
      | { projects?: DashboardProject[]; data?: DashboardProject[] }
      | DashboardProject[];

    if (Array.isArray(payload)) {
      return payload;
    }

    return payload.projects ?? payload.data ?? [];
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

export async function fetchRecentProjectErrors(): Promise<ProjectErrorEvent[]> {
  try {
    const token = await getDashboardAccessToken();
    if (!token) {
      return [];
    }

    const url = new URL('/sse/errors/recent', getDashboardApiUrl());
    url.searchParams.set('token', token);

    const response = await fetch(url.toString(), {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as
      | { events?: ProjectErrorEvent[]; data?: ProjectErrorEvent[] }
      | ProjectErrorEvent[];

    if (Array.isArray(payload)) {
      return payload;
    }

    return payload.events ?? payload.data ?? [];
  } catch (error) {
    console.error('Failed to fetch recent project errors:', error);
    return [];
  }
}
