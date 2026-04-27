'use client';

import { useMemo, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import type { IssueAnalysisResult } from '../../../lib/issues';

export function AIAnalysisPanel({
  apiUrl,
  token,
  issueId,
}: {
  apiUrl: string;
  token: string;
  issueId: string;
}) {
  const [analysis, setAnalysis] = useState<IssueAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const affectedArea = useMemo(() => issueId.split('_').slice(-1)[0] ?? issueId, [issueId]);

  function handleAnalyze() {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${apiUrl}/issues/${issueId}/analysis`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Analysis request failed');
        }

        const payload = (await response.json()) as IssueAnalysisResult;
        setAnalysis(payload);
      } catch (caughtError) {
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
            <h3 className="text-lg font-semibold text-zinc-50">Root cause + suggested fix</h3>
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
          {analysis ? <Badge variant="success">{analysis.confidence} confidence</Badge> : null}
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
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Root cause
              </p>
              <p className="text-sm leading-6 text-zinc-200">{analysis.rootCause}</p>
            </section>

            <section className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Suggested fix
              </p>
              <pre className="overflow-x-auto rounded-2xl border border-violet-400/10 bg-[#111114] p-4 font-mono text-xs leading-6 text-zinc-200">
                <code>{analysis.suggestedFix}</code>
              </pre>
            </section>

            <div className="flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              <span>Model {analysis.model}</span>
              <span>Provider {analysis.provider}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-zinc-400">
            Request an on-demand AI summary when you need a fast root-cause read before opening the stack and frequency data.
          </p>
        )}
      </div>
    </Card>
  );
}
