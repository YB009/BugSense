'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getDashboardApiUrl,
  getDashboardTokenCookieName,
} from '../../lib/auth';

export async function signupAction(
  _previousState: SignupActionState,
  formData: FormData,
) {
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof confirmPassword !== 'string'
  ) {
    return { error: 'Email, password, and confirm password are required.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const response = await fetch(`${getDashboardApiUrl()}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;

    const message = Array.isArray(payload?.message)
      ? payload?.message[0]
      : payload?.message;

    return {
      error:
        message ??
        'Could not create your account. Please try a different email.',
    };
  }

  const payload = (await response.json()) as { accessToken?: string };

  if (!payload.accessToken) {
    return { error: 'Signup response did not contain an access token.' };
  }

  (await cookies()).set(getDashboardTokenCookieName(), payload.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  });

  redirect('/dashboard');
}

export interface SignupActionState {
  error?: string;
}
