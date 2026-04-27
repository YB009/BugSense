import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-panel/92 shadow-panel backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  );
}
