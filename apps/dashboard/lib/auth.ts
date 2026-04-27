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

export function getDashboardGoogleClientId() {
  return (
    process.env.NEXT_PUBLIC_BUGSENSE_GOOGLE_CLIENT_ID ??
    process.env.BUGSENSE_GOOGLE_CLIENT_ID ??
    ''
  );
}

export async function getDashboardAccessToken() {
  return (await cookies()).get(getDashboardTokenCookieName())?.value ?? null;
}

export async function getAuthenticatedUser(): Promise<DashboardUser | null> {
  try {
    const token = await getDashboardAccessToken();

    if (!token) {
      return null;
    }

    const response = await fetch(`${getDashboardApiUrl()}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { user?: DashboardUser };
    return payload.user ?? null;
  } catch (error) {
    console.error('Failed to fetch authenticated user:', error);
    return null;
  }
}
