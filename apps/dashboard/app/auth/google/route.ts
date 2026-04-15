import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  getDashboardApiUrl,
  getDashboardTokenCookieName,
} from '../../../lib/auth';

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { credential?: string }
    | null;

  if (!payload?.credential) {
    return NextResponse.json(
      {
        error: 'Missing Google credential.',
      },
      {
        status: 400,
      },
    );
  }

  const response = await fetch(`${getDashboardApiUrl()}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credential: payload.credential,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        error: 'Google sign-in failed.',
      },
      {
        status: 401,
      },
    );
  }

  const authPayload = (await response.json()) as { accessToken?: string };
  if (!authPayload.accessToken) {
    return NextResponse.json(
      {
        error: 'Google login response did not contain an access token.',
      },
      {
        status: 500,
      },
    );
  }

  cookies().set(getDashboardTokenCookieName(), authPayload.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  });

  return NextResponse.json({
    ok: true,
  });
}
