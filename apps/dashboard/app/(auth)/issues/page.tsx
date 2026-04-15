import Link from 'next/link';
import { fetchIssues } from '../../../lib/issues';

export default async function IssuesPage() {
  const issues = await fetchIssues();

  return (
    <section className="page-card">
      <p className="eyebrow">Issues</p>
      <h2 className="headline">Clustered issues</h2>
      <p className="muted">
        Nightly grouping results from the background job. Open an issue to inspect
        affected users, browser and OS breakdown, stack trace, and AI analysis.
      </p>
      <p className="muted">
        Need fresh issue clusters during local testing? Use the{' '}
        <a className="inline-link" href="/grouping">
          manual grouping page
        </a>
        .
      </p>
      <div className="issue-list">
        {issues.length === 0 ? (
          <p className="muted">
            No grouped issues yet. Run the nightly grouping job or wait for the
            scheduler to produce the first set.
          </p>
        ) : (
          issues.map((issue) => (
            <Link className="issue-list-item" href={`/issues/${issue.issueId}`} key={issue.issueId}>
              <div>
                <p className="issue-title">{issue.title}</p>
                <p className="feed-detail">{issue.summary}</p>
              </div>
              <div className="issue-list-meta">
                <span>{issue.totalEvents} events</span>
                <span>{new Date(issue.lastSeenAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
