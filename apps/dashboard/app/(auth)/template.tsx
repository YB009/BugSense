'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function AuthTemplate({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <Suspense fallback={<TemplateSkeleton />}>{children}</Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function TemplateSkeleton() {
  return (
    <div className="space-y-4 p-2">
      <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
      <div className="h-10 w-64 animate-pulse rounded bg-muted/60" />
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-panel/70" />
    </div>
  );
}
