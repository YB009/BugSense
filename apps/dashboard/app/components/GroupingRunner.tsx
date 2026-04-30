'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IssueGroupingRunResult } from '../../lib/issues';

export interface GroupingRunnerProps {
  apiUrl: string;
  initialResult: IssueGroupingRunResult | null;
  token: string;
}

const GROUPING_RUN_TIMEOUT_MS = 70_000;

export function GroupingRunner({
  apiUrl,
  initialResult,
  token,
}: GroupingRunnerProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<IssueGroupingRunResult | null>(
    initialResult,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(initialResult);
  }, [initialResult]);

  function handleRun() {
    if (isRunning) {
      return;
    }

    setError(null);
    setIsRunning(true);

    void (async () => {
      try {
        const response = await fetch(`${apiUrl}/issues/grouping/run`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(GROUPING_RUN_TIMEOUT_MS),
        });

        if (!response.ok) {
          let message = 'Failed to run grouping';

          try {
            const contentType = response.headers.get('content-type') ?? '';

            if (contentType.includes('application/json')) {
              const payload = (await response.json()) as {
                message?: string | string[];
                error?: string;
              };
              const details = Array.isArray(payload.message)
                ? payload.message.join(', ')
                : payload.message || payload.error;

              if (details) {
                message = String(details);
              }
            } else {
              const text = (await response.text()).trim();
              if (text) {
                message = text;
              }
            }
          } catch {
            // Ignore parse errors and fall back to the generic message.
          }

          throw new Error(message);
        }

        const payload = (await response.json()) as IssueGroupingRunResult;
        setResult(payload);
        router.refresh();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to run grouping',
        );
      } finally {
        setIsRunning(false);
      }
    })();
  }

  return (
    <section className="page-card">
      <p className="eyebrow">Grouping</p>
      <h2 className="headline">Run issue grouping now</h2>
      <p className="muted">
        Use this during local testing after ingesting a batch of events. The run
        will cluster recent events into issues immediately instead of waiting for
        the nightly BullMQ schedule.
      </p>
      <div className="grouping-actions">
        <button
          className="ghost-button"
          disabled={isRunning}
          onClick={handleRun}
          type="button"
        >
          {isRunning ? 'Running...' : 'Run grouping now'}
        </button>
      </div>
      {error ? <p className="muted error-text">{error}</p> : null}
      {result ? (
        <div className="grouping-result">
          <p className="feed-detail">
            Generated {result.groupedCount} issue(s) at{' '}
            {new Date(result.generatedAt).toLocaleString()}.
          </p>
          <div className="issue-list">
            {result.issues.map((issue) => (
              <a
                className="issue-list-item"
                href={`/issues/${issue.issueId}`}
                key={issue.issueId}
              >
                <div>
                  <p className="issue-title">{issue.title}</p>
                  <p className="feed-detail">{issue.summary}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-400/90">
                    Tap to view details
                  </p>
                </div>
                <div className="issue-list-meta">
                  <span>{issue.eventIds.length} events</span>
                  <span>{new Date(issue.lastSeenAt).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
