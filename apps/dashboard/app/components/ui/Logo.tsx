'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../../lib/utils';

export function BugSenseLogo({
  size = 32,
  animated = false,
  className,
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  return (
    <motion.span
      animate={
        shouldAnimate
          ? {
              filter: [
                'drop-shadow(0 0 0 rgba(239,68,68,0))',
                'drop-shadow(0 0 6px rgba(239,68,68,0.35))',
                'drop-shadow(0 0 0 rgba(239,68,68,0))',
              ],
            }
          : undefined
      }
      className={cn('inline-flex items-center justify-center', className)}
      transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
    >
      <svg
        aria-label="BugSense Logo"
        fill="none"
        height={size}
        role="img"
        viewBox="0 0 32 32"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          animate={
            shouldAnimate
              ? {
                  opacity: [0.88, 1, 0.88],
                }
              : undefined
          }
          d="M8 4H20L25 8.5V12L22 15.5L25 19V23.5L20 28H8V20.5M8 11.5H2M8 11.5L12 11.5L14 18L17 8L20 14L22 11.5M8 11.5V4M8 11.5V20.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
          transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
        />
      </svg>
    </motion.span>
  );
}
