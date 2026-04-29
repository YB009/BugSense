import { NextResponse } from 'next/server';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../../../lib/auth';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const token = await getDashboardAccessToken();
  if (!token) {
    return NextResponse.json(
      { message: 'Missing dashboard token' },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const response = await fetch(`${getDashboardApiUrl()}/issues/${id}/analysis`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? 'application/json';
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': contentType,
    },
  });
}
