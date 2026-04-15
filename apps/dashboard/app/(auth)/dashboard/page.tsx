import { LiveErrorFeed } from '../../components/LiveErrorFeed';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../lib/auth';
import { fetchIssues } from '../../../lib/issues';

export default async function DashboardPage() {
  const token = getDashboardAccessToken();
  const issues = await fetchIssues();

  return (
    <section className="page-card">
      <p className="eyebrow">App Router</p>
      <h2 className="headline">Protected dashboard route group is active.</h2>
      <p className="muted">
        This page renders only after the dashboard cookie is validated against
        <code> api-gateway /auth/me</code>.
      </p>
      <div className="stats-grid">
        <article className="stat-tile">
          <p className="stat-label">Issues</p>
          <p className="stat-value">{issues.length}</p>
        </article>
        <article className="stat-tile">
          <p className="stat-label">Error Rate</p>
          <p className="stat-value">0.00%</p>
        </article>
        <article className="stat-tile">
          <p className="stat-label">Projects</p>
          <p className="stat-value">1</p>
        </article>
      </div>
      <div className="issue-summary-list">
        {issues.slice(0, 3).map((issue) => (
          <a className="issue-summary-item" href={`/issues/${issue.issueId}`} key={issue.issueId}>
            <div>
              <p className="issue-title">{issue.title}</p>
              <p className="feed-detail">{issue.totalEvents} events</p>
            </div>
            <span className="feed-meta">{new Date(issue.lastSeenAt).toLocaleDateString()}</span>
          </a>
        ))}
      </div>
      {token ? (
        <LiveErrorFeed apiUrl={getDashboardApiUrl()} token={token} />
      ) : null}
    </section>
  );
}
