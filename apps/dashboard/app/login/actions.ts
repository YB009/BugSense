'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getDashboardTokenCookieName,
  getDashboardApiUrl,
} from '../../lib/auth';

export async function loginAction(_previousState: LoginActionState, formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Email and password are required.' };
  }

  const response = await fetch(`${getDashboardApiUrl()}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return { error: 'Invalid email or password.' };
  }

  const payload = (await response.json()) as { accessToken?: string };

  if (!payload.accessToken) {
    return { error: 'Login response did not contain an access token.' };
  }

  (await cookies()).set(getDashboardTokenCookieName(), payload.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  });

  redirect('/dashboard');
}

export interface LoginActionState {
  error?: string;
}
