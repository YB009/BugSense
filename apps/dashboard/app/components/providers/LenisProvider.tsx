'use client';

import Lenis from 'lenis';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return undefined;
    }

    const lenis = new Lenis({
      anchors: true,
      autoRaf: true,
      lerp: 0.09,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return children;
}
