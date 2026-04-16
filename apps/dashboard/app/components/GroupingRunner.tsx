'use client';

import { useEffect, useState, useTransition } from 'react';
import type { IssueGroupingRunResult } from '../../lib/issues';

export interface GroupingRunnerProps {
  apiUrl: string;
  initialResult: IssueGroupingRunResult | null;
  token: string;
}

const STORAGE_PREFIX = 'bugsense:grouping-result:';

export function GroupingRunner({
  apiUrl,
  initialResult,
  token,
}: GroupingRunnerProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<IssueGroupingRunResult | null>(
    initialResult,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(initialResult ?? readTodayResult());
  }, [initialResult]);

  useEffect(() => {
    writeTodayResult(result);
  }, [result]);

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
          {isPending ? 'Running...' : 'Run grouping now'}
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

function readTodayResult() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    clearOldGroupingKeys();
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as IssueGroupingRunResult;
    return isToday(parsed.generatedAt) ? parsed : null;
  } catch {
    return null;
  }
}

function writeTodayResult(result: IssueGroupingRunResult | null) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!result || !isToday(result.generatedAt)) {
      window.localStorage.removeItem(storageKey());
      return;
    }

    window.localStorage.setItem(storageKey(), JSON.stringify(result));
  } catch {
    // Storage failures should not block grouping.
  }
}

function storageKey() {
  return `${STORAGE_PREFIX}${todayKey()}`;
}

function todayKey() {
  return dateKey(new Date());
}

function isToday(value: string) {
  return dateKey(new Date(value)) === todayKey();
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function clearOldGroupingKeys() {
  const currentKey = storageKey();

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX) && key !== currentKey) {
      window.localStorage.removeItem(key);
    }
  }
}
