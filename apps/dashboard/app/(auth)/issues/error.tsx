'use client';

import { useEffect } from 'react';

export default function IssuesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Issues page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-muted-foreground">Failed to load issues</p>
      <button
        className="text-sm underline underline-offset-4 transition-opacity hover:opacity-80"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}
