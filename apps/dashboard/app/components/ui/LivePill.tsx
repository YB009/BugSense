import { cn } from '../../../lib/utils';

export function LivePill({
  status,
}: {
  status: 'connecting' | 'live' | 'offline';
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium capitalize',
        status === 'live' && 'border-success/25 bg-success/10 text-success',
        status === 'connecting' && 'border-warning/25 bg-warning/10 text-warning',
        status === 'offline' && 'border-error/25 bg-error/10 text-error',
      )}
    >
      <span
        className={cn(
          'size-2 rounded-full',
          status === 'live' && 'bg-success animate-pulse-soft',
          status === 'connecting' && 'bg-warning animate-pulse-soft',
          status === 'offline' && 'bg-error',
        )}
      />
      {status}
    </div>
  );
}
