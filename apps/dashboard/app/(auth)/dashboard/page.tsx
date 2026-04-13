import { LiveErrorFeed } from '../../components/LiveErrorFeed';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../lib/auth';

export default function DashboardPage() {
  const token = getDashboardAccessToken();

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
          <p className="stat-value">0</p>
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
      {token ? (
        <LiveErrorFeed apiUrl={getDashboardApiUrl()} token={token} />
      ) : null}
    </section>
  );
}
