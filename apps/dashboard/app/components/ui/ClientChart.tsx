'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

export function ClientChart({
  children,
  height = 300,
}: {
  children: ReactNode;
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height }} />;
  }

  return <>{children}</>;
}
