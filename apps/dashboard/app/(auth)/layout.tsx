import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '../../lib/auth';
import { DashboardShell } from '../components/dashboard/DashboardShell';

// This layout reads the session cookie and the API URL at request time,
// so every route under it must be rendered on demand, not at build time.
export const dynamic = 'force-dynamic';

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardShell userEmail={user.email}>
      <Suspense fallback={<ProtectedRouteSkeleton />}>{children}</Suspense>
    </DashboardShell>
  );
}

function ProtectedRouteSkeleton() {
  return (
    <div className="space-y-4 p-2">
      <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
      <div className="h-10 w-64 animate-pulse rounded bg-muted/60" />
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-panel/70" />
    </div>
  );
}
