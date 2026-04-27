import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-[hsl(var(--skeleton-base)/0.95)]',
        'before:absolute before:inset-y-0 before:w-1/2 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-shimmer',
        className,
      )}
      {...props}
    />
  );
}
