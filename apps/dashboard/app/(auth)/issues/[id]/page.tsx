import Link from 'next/link';
import { AIPanel } from '../../../../app/components/AIPanel';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../../lib/auth';
import { fetchIssueDetail } from '../../../../lib/issues';

interface IssueDetailPageProps {
  params: {
    id: string;
  };
}

export default async function IssueDetailPage({ params }: IssueDetailPageProps) {
  const issue = await fetchIssueDetail(params.id);
  const token = getDashboardAccessToken();
  const apiUrl = getDashboardApiUrl();

  return (
    <div className="detail-grid">
      <section className="page-card">
        <div className="issue-detail-header">
          <div>
            <p className="eyebrow">Issue Detail</p>
            <h2 className="headline issue-headline">{issue.issue.title}</h2>
            <p className="muted">{issue.issue.summary}</p>
          </div>
          <Link className="ghost-button" href="/issues">
            Back to issues
          </Link>
        </div>

        <div className="stats-grid">
          <article className="stat-tile">
            <p className="stat-label">Affected Users</p>
            <p className="stat-value">{issue.affectedUsers}</p>
          </article>
          <article className="stat-tile">
            <p className="stat-label">Events</p>
            <p className="stat-value">{issue.totalEvents}</p>
          </article>
          <article className="stat-tile">
            <p className="stat-label">Last Seen</p>
            <p className="stat-value issue-stat-small">
              {new Date(issue.issue.lastSeenAt).toLocaleDateString()}
            </p>
          </article>
        </div>

        <div className="detail-sections">
          <section className="detail-block">
            <p className="stat-label">Browser Breakdown</p>
            <BreakdownList items={issue.browserBreakdown} emptyLabel="No browser data" />
          </section>
          <section className="detail-block">
            <p className="stat-label">OS Breakdown</p>
            <BreakdownList items={issue.osBreakdown} emptyLabel="No OS data" />
          </section>
          <section className="detail-block detail-block-full">
            <p className="stat-label">Stack Trace Viewer</p>
            <pre className="stack-trace-viewer">{issue.stackTrace || 'No stack trace available.'}</pre>
          </section>
        </div>
      </section>

      {token ? <AIPanel apiUrl={apiUrl} token={token} issueId={params.id} /> : null}
    </div>
  );
}

function BreakdownList({
  items,
  emptyLabel,
}: {
  items: Array<{ label: string; count: number }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="muted">{emptyLabel}</p>;
  }

  return (
    <div className="breakdown-list">
      {items.map((item) => (
        <div className="breakdown-item" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}
