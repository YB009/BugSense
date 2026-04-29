'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import type { IssueAnalysisResult } from '../../../lib/issues';

interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
}

export function AIAnalysisPanel({
  issueId,
  projectId,
}: {
  issueId: string;
  projectId: string;
}) {
  const [analysis, setAnalysis] = useState<IssueAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const affectedArea = useMemo(() => issueId.split('_').slice(-1)[0] ?? issueId, [issueId]);
  const evidence = analysis?.evidence ?? [];
  const waysToImproveConfidence = analysis?.waysToImproveConfidence ?? [];
  const confidenceScore = analysis?.confidenceScore;
  const storageKey = useMemo(
    () => `bugsense:analysis:${projectId}:${issueId}`,
    [issueId, projectId],
  );

  useEffect(() => {
    setError(null);
    setAnalysis(readStoredAnalysis(storageKey));
  }, [storageKey]);

  useEffect(() => {
    writeStoredAnalysis(storageKey, analysis);
  }, [analysis, storageKey]);

  function handleAnalyze() {
    setError(null);
    setAnalysis(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/issues/${issueId}/analysis`, {
          method: 'POST',
        });

        if (!response.ok) {
          const raw = await response.text();
          let message = 'Analysis request failed';

          if (raw.trim()) {
            try {
              const parsed = JSON.parse(raw) as ApiErrorPayload;
              const parsedMessage = Array.isArray(parsed.message)
                ? parsed.message.join(', ')
                : parsed.message;
              message = parsedMessage ?? parsed.error ?? raw.trim();
            } catch {
              message = raw.trim();
            }
          }

          throw new Error(message);
        }

        const payload = (await response.json()) as IssueAnalysisResult;
        if (payload.provider !== 'gemini') {
          throw new Error(
            'Analysis succeeded, but the provider was not Gemini.',
          );
        }
        setAnalysis(payload);
      } catch (caughtError) {
        setAnalysis(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Analysis request failed',
        );
      }
    });
  }

  return (
    <Card className="relative overflow-hidden border-violet-500/20 bg-panel/92 p-5 shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_20px_60px_rgba(15,23,42,0.35)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_38%)]" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-violet-300/80">
              AI analysis
            </p>
            <h3 className="text-lg font-semibold text-foreground">Root cause + suggested fix</h3>
          </div>
          <Button
            className="shrink-0"
            icon={<Sparkles className="size-4" />}
            loading={isPending}
            onClick={handleAnalyze}
            type="button"
            variant="secondary"
          >
            {analysis ? 'Refresh analysis' : 'Run analysis'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">Gemini assisted</Badge>
          <Badge variant="warning">Affected area: {affectedArea}</Badge>
          {analysis ? (
            <Badge variant="success">
              {typeof confidenceScore === 'number'
                ? `${confidenceScore}% ${analysis.confidence} confidence`
                : `${analysis.confidence} confidence`}
            </Badge>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : null}

        {isPending ? (
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            className="space-y-4"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-28 w-full" />
          </motion.div>
        ) : analysis ? (
          <div className="space-y-4">
            <section className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Root cause
              </p>
              <p className="text-sm leading-6 text-foreground/90">{analysis.rootCause}</p>
            </section>

            <section className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Suggested fix
              </p>
              <pre className="overflow-x-auto rounded-2xl border border-violet-400/10 bg-[#111114] p-4 font-mono text-xs leading-6 text-zinc-200">
                <code>{analysis.suggestedFix}</code>
              </pre>
            </section>

            {evidence.length > 0 ? (
              <section className="space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Evidence used
                </p>
                <ul className="space-y-2 text-sm leading-6 text-foreground/90">
                  {evidence.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-violet-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {waysToImproveConfidence.length > 0 ? (
              <section className="space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  To make this result more solid
                </p>
                <ul className="space-y-2 text-sm leading-6 text-foreground/90">
                  {waysToImproveConfidence.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <span>Model {analysis.model}</span>
              <span>Provider {analysis.provider}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Request an on-demand AI summary when you need a fast root-cause read before opening the stack and frequency data.
          </p>
        )}
      </div>
    </Card>
  );
}

function readStoredAnalysis(storageKey: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as IssueAnalysisResult;
  } catch {
    return null;
  }
}

function writeStoredAnalysis(
  storageKey: string,
  analysis: IssueAnalysisResult | null,
) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!analysis) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(analysis));
  } catch {
    // Ignore storage failures.
  }
}
