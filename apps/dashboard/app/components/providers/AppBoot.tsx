'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { BugSenseLogo } from '../ui/Logo';

const BOOT_KEY = 'bugsense-dashboard-booted';

export function AppBoot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [showSplash, setShowSplash] = useState(true);
  const isPublicLanding = pathname === '/';

  useEffect(() => {
    if (isPublicLanding) {
      setShowSplash(false);
      return;
    }

    const alreadyBooted = window.sessionStorage.getItem(BOOT_KEY);
    if (alreadyBooted) {
      setShowSplash(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      window.sessionStorage.setItem(BOOT_KEY, '1');
      setShowSplash(false);
    }, reducedMotion ? 60 : 280);

    return () => window.clearTimeout(timeout);
  }, [isPublicLanding, reducedMotion]);

  return (
    <>
      {children}
      <AnimatePresence>
        {showSplash ? (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[100] overflow-hidden bg-background"
            exit={{ opacity: 0 }}
            initial={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.45, ease: 'easeOut' }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at top, hsl(var(--surface-glow-primary) / 0.14), transparent 38%), radial-gradient(circle at bottom left, hsl(var(--surface-glow-secondary) / 0.08), transparent 28%)',
              }}
            />
            <div
              className="absolute inset-0 bg-[size:44px_44px]"
              style={{
                backgroundImage:
                  'linear-gradient(hsl(var(--surface-grid-line) / calc(var(--surface-grid-opacity) + 0.005)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--surface-grid-line) / calc(var(--surface-grid-opacity) + 0.005)) 1px, transparent 1px)',
                opacity: 0.3,
              }}
            />
            <div
              className="absolute inset-x-0 top-0 h-40 animate-scan bg-gradient-to-b to-transparent"
              style={{
                ['--tw-gradient-from' as string]: 'hsl(var(--surface-scan) / var(--surface-scan-opacity))',
                ['--tw-gradient-via' as string]: 'hsl(var(--surface-scan) / 0)',
              }}
            />
            <div className="relative flex h-full flex-col items-center justify-center gap-4">
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7], y: [0, -3, 0] }}
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0, y: 10 }}
                transition={{ duration: reducedMotion ? 0.2 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="rounded-[28px] border border-border bg-panel/70 p-5 shadow-[0_0_28px_rgba(255,255,255,0.05)]">
                  <BugSenseLogo animated className="text-foreground" size={72} />
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
                  Initializing BugSense...
                </span>
              </motion.div>
              <div className="relative mt-4 h-1 w-52 overflow-hidden rounded-full bg-panel-strong">
                <motion.div
                  animate={{ x: ['-100%', '120%'] }}
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                  transition={{ duration: reducedMotion ? 0.7 : 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
