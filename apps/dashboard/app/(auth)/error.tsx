'use client';

import { useEffect } from 'react';

export default function ProtectedWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Protected workspace error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          Component failed to load
        </p>
        <p className="text-sm text-muted-foreground">
          A protected dashboard view crashed during navigation.
        </p>
      </div>
      <button
        className="rounded-xl border border-border bg-panel-strong/80 px-4 py-2 text-sm text-foreground transition-colors hover:border-zinc-600 hover:bg-panel"
        onClick={reset}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}
