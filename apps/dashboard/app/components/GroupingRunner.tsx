'use client';

import { useState, useTransition } from 'react';
import type { IssueGroupingRunResult } from '../../lib/issues';

export interface GroupingRunnerProps {
  apiUrl: string;
  token: string;
}

export function GroupingRunner({ apiUrl, token }: GroupingRunnerProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<IssueGroupingRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${apiUrl}/issues/grouping/run`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to run grouping');
        }

        const payload = (await response.json()) as IssueGroupingRunResult;
        setResult(payload);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to run grouping',
        );
      }
    });
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
          disabled={isPending}
          onClick={handleRun}
          type="button"
        >
          {isPending ? 'Running…' : 'Run grouping now'}
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
