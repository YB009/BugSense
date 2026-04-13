import { cookies } from 'next/headers';

export interface DashboardUser {
  sub: string;
  email: string;
  role: 'admin';
  iat?: number;
  exp?: number;
}

export function getDashboardApiUrl() {
  return process.env.BUGSENSE_API_URL ?? 'http://localhost:3000';
}

export function getDashboardTokenCookieName() {
  return (
    process.env.BUGSENSE_DASHBOARD_TOKEN_COOKIE ??
    'bugsense_dashboard_token'
  );
}

export function getDashboardAccessToken() {
  return cookies().get(getDashboardTokenCookieName())?.value ?? null;
}

export async function getAuthenticatedUser(): Promise<DashboardUser | null> {
  const token = getDashboardAccessToken();

  if (!token) {
    return null;
  }

  const response = await fetch(`${getDashboardApiUrl()}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { user?: DashboardUser };
  return payload.user ?? null;
}
