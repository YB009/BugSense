import type { ReactNode } from 'react';
import { Card } from './Card';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex min-h-52 flex-col items-start justify-center gap-3 border-dashed p-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        Empty state
      </p>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action}
    </Card>
  );
}
