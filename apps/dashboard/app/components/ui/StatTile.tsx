import type { ReactNode } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { TrendSparkline } from './TrendSparkline';
import { cn } from '../../../lib/utils';

export function StatTile({
  label,
  value,
  eyebrow,
  trend,
  trendLabel,
  data,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  eyebrow?: string;
  trend?: 'error' | 'warning' | 'success' | 'info';
  trendLabel?: string;
  data?: Array<{ value: number }>;
  icon?: ReactNode;
  className?: string;
}) {
  const color =
    trend === 'error'
      ? 'hsl(var(--error))'
      : trend === 'warning'
        ? 'hsl(var(--warning))'
        : trend === 'success'
          ? 'hsl(var(--success))'
          : 'hsl(var(--info))';

  return (
    <Card className={cn('group relative min-w-0 overflow-hidden p-5', className)}>
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_42%)]" />
      </div>
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3">
          {eyebrow ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </div>
          </div>
        </div>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-3">
        {trendLabel ? <Badge variant={trend ?? 'info'}>{trendLabel}</Badge> : <span />}
      </div>
      {data ? <TrendSparkline color={color} data={data} /> : null}
    </Card>
  );
}
