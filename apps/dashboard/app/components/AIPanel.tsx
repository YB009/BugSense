'use client';

import { useState } from 'react';
import type { IssueAnalysisResult } from '../../lib/issues';

interface AIPanelProps {
  apiUrl: string;
  token: string;
  issueId: string;
}

export function AIPanel({ apiUrl, token, issueId }: AIPanelProps) {
  const [analysis, setAnalysis] = useState<IssueAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

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
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Analysis request failed',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-card ai-panel">
      <div className="feed-header">
        <div>
          <p className="eyebrow">AI Panel</p>
          <h3 className="feed-title">Root cause + suggested fix</h3>
        </div>
        <button
          className="primary-button"
          disabled={loading}
          onClick={handleAnalyze}
          type="button"
        >
          {loading ? 'Analyzing...' : 'Run analysis'}
        </button>
      </div>
      {error ? <p className="status-note">{error}</p> : null}
      {analysis ? (
        <div className="analysis-grid">
          <article className="analysis-block">
            <p className="stat-label">Likely Root Cause</p>
            <p className="analysis-copy">{analysis.rootCause}</p>
          </article>
          <article className="analysis-block">
            <p className="stat-label">Suggested Fix</p>
            <p className="analysis-copy">{analysis.suggestedFix}</p>
          </article>
          <div className="analysis-meta-row">
            <span className="feed-meta">
              Model: {analysis.model}
            </span>
            <span className="feed-meta">
              Confidence: {analysis.confidence}
            </span>
            <span className="feed-meta">
              Provider: {analysis.provider}
            </span>
          </div>
        </div>
      ) : (
        <p className="muted">
          Trigger the analysis only when you need it. This keeps background quota
          for grouping and reserves the better model for user-facing diagnosis.
        </p>
      )}
    </section>
  );
}
