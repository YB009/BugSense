import { LiveErrorFeed } from '../../components/LiveErrorFeed';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../lib/auth';
import { fetchIssues } from '../../../lib/issues';
import { fetchProjects } from '../../../lib/projects';

export default async function DashboardPage() {
  const token = await getDashboardAccessToken();
  const issues = await fetchIssues();
  const projects = await fetchProjects();

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
          <p className="stat-value">{projects.length}</p>
        </article>
      </div>
      <div className="issue-summary-list">
        {projects.map((project) => (
          <article className="issue-summary-item" key={project.id}>
            <div>
              <p className="issue-title">{project.name}</p>
              <p className="feed-detail">Project ID: {project.id}</p>
              <p className="feed-detail">API key: {project.apiKey}</p>
            </div>
            <span className="feed-meta">
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </article>
        ))}
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
