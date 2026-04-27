import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

type BadgeVariant = 'neutral' | 'error' | 'warning' | 'success' | 'info';

const badgeClasses: Record<BadgeVariant, string> = {
  neutral: 'border-border text-muted-foreground',
  error: 'border-error/30 text-error',
  warning: 'border-warning/30 text-warning',
  success: 'border-success/30 text-success',
  info: 'border-info/30 text-info',
};

export function Badge({
  className,
  children,
  variant = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em]',
        badgeClasses[variant],
        className,
      )}
      {...props}
    >
      <span className={cn('size-1.5 rounded-full', variant === 'neutral' && 'bg-muted-foreground/80', variant === 'error' && 'bg-error', variant === 'warning' && 'bg-warning', variant === 'success' && 'bg-success', variant === 'info' && 'bg-info')} />
      {children}
    </span>
  );
}
