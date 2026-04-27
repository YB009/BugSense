import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDashboardTokenCookieName } from '../../lib/auth';

export async function POST(request: Request) {
  (await cookies()).delete(getDashboardTokenCookieName());
  return NextResponse.redirect(new URL('/login', request.url));
}
