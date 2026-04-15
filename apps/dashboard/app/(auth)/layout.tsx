import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '../../lib/auth';

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
    <div className="auth-shell">
      <aside className="auth-sidebar">
        <div className="brand-mark">BugSense</div>
        <nav className="sidebar-nav">
          <a className="sidebar-link" href="/dashboard">
            <span>Overview</span>
            <span>01</span>
          </a>
          <a className="sidebar-link" href="/issues">
            <span>Issues</span>
            <span>02</span>
          </a>
          <a className="sidebar-link" href="/grouping">
            <span>Grouping</span>
            <span>03</span>
          </a>
          <a className="sidebar-link" href="/dashboard">
            <span>Live Feed</span>
            <span>04</span>
          </a>
        </nav>
      </aside>
      <main className="auth-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Protected Workspace</p>
            <h1 className="topbar-title">Dashboard</h1>
            <p className="topbar-subtitle">
              Signed in as {user.email}
            </p>
          </div>
          <form action="/logout" method="post">
            <button className="ghost-button" type="submit">
              Sign out
            </button>
          </form>
        </header>
        {children}
      </main>
    </div>
  );
}
