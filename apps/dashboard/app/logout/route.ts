import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDashboardTokenCookieName } from '../../lib/auth';

export async function POST() {
  (await cookies()).delete(getDashboardTokenCookieName());
  return NextResponse.redirect(new URL('/login', 'http://localhost:3005'));
}
