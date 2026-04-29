import { getDashboardAccessToken, getDashboardApiUrl } from './auth';

const DASHBOARD_FETCH_TIMEOUT_MS = 3_000;

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
      signal: AbortSignal.timeout(DASHBOARD_FETCH_TIMEOUT_MS),
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
    if (!isAbortTimeoutError(error)) {
      console.warn('Failed to fetch projects');
    }
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
      signal: AbortSignal.timeout(DASHBOARD_FETCH_TIMEOUT_MS),
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
    if (!isAbortTimeoutError(error)) {
      console.warn('Failed to fetch recent project errors');
    }
    return [];
  }
}

function isAbortTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'TimeoutError' ||
    error.name === 'AbortError' ||
    error.message.includes('aborted due to timeout')
  );
}
