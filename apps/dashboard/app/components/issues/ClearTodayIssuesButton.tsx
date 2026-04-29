'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';

export function ClearTodayIssuesButton({
  apiUrl,
  token,
}: {
  apiUrl: string;
  token: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return null;
  }

  async function handleClear() {
    const confirmed = window.confirm(
      "Clear today's grouped issues and recent events for your workspace? Only new events received after this will appear.",
    );

    if (!confirmed) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/issues/clear-today`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(raw.trim() || 'Failed to clear today\'s issues');
      }

      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to clear today\'s issues';
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        icon={<Trash2 className="size-4" />}
        loading={pending}
        onClick={handleClear}
        variant="destructive"
      >
        Clear today&apos;s issues
      </Button>
      {error ? (
        <p className="max-w-xs text-right text-xs text-error">{error}</p>
      ) : null}
    </div>
  );
}
