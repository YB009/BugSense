'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, FolderKanban, LayoutDashboard, Menu, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { pageMotion } from '../../../lib/motion';
import { cn } from '../../../lib/utils';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Button } from '../ui/Button';
import { BugSenseLogo } from '../ui/Logo';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/issues', label: 'Issues', icon: AlertTriangle },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/grouping', label: 'Grouping', icon: Sparkles },
];

export function DashboardShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string;
}) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const currentSection = useMemo(() => {
    const match = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    return match?.label ?? 'Dashboard';
  }, [pathname]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.06),transparent_28%)]" />
      <div className="relative flex min-h-screen">
        <AnimatePresence>
          {mobileOpen ? (
            <motion.button
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          ) : null}
        </AnimatePresence>

        <motion.aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-panel/90 px-4 py-5 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={reducedMotion ? {} : { opacity: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <div className="mb-8 flex items-center justify-between">
            <Link className="flex items-center gap-3 px-1 py-1" href="/dashboard">
              <div className="flex size-10 items-center justify-center rounded-xl border border-info/20 bg-info/10 shadow-glow">
                <BugSenseLogo animated className="text-zinc-100" size={24} />
              </div>
              <div>
                <p className="font-mono text-[13px] font-bold uppercase tracking-[0.26em] text-foreground">
                  BUGSENSE
                </p>
                <p className="text-sm font-medium text-muted-foreground">Observability</p>
              </div>
            </Link>
            <button
              aria-label="Close navigation"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-transparent px-3 text-sm font-medium text-foreground transition-[background-color,border-color,color,transform,opacity,box-shadow] duration-200 ease-out hover:border-border hover:bg-panel-strong/60 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              <X className="size-4" />
              <span className="leading-none">Close</span>
            </button>
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-panel-strong/80 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
              Workspace
            </p>
            <p className="mt-2 truncate text-sm font-medium text-foreground">{userEmail}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Project-scoped monitoring with live ingestion and grouped triage.
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1.5">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-all duration-200 ease-out',
                    active
                      ? 'border-info/20 bg-info/10 text-foreground shadow-glow'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-panel-strong/70 hover:text-foreground',
                  )}
                  href={href}
                  key={href}
                  onClick={() => setMobileOpen(false)}
                  prefetch={false}
                >
                  <Icon className={cn('size-4', active ? 'text-info' : 'text-muted-foreground group-hover:text-foreground')} />
                  <span className="flex-1">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-border bg-panel-strong/70 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
              Signal discipline
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Calm surfaces by default. Severity only rises visually when the system does.
            </p>
          </div>
        </motion.aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-0">
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  className="lg:hidden"
                  icon={<Menu className="size-4" />}
                  onClick={() => setMobileOpen(true)}
                  size="sm"
                  variant="ghost"
                >
                  Menu
                </Button>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                    Protected workspace
                  </p>
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                    {currentSection}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <form action="/logout" method="post">
                  <Button size="sm" type="submit" variant="secondary">
                    Sign out
                  </Button>
                </form>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                {...pageMotion}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
