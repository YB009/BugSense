import Link from 'next/link';
import { AlertTriangle, FolderKanban, RadioTower } from 'lucide-react';
import { LiveErrorFeed } from '../../components/LiveErrorFeed';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../lib/auth';
import { fetchIssues } from '../../../lib/issues';
import { fetchProjects, fetchRecentProjectErrors } from '../../../lib/projects';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatTile } from '../../components/ui/StatTile';

export default async function DashboardPage() {
  const token = await getDashboardAccessToken();
  const [issuesResult, projectsResult, recentEventsResult] = await Promise.allSettled([
    fetchIssues(),
    fetchProjects(),
    fetchRecentProjectErrors(),
  ]);
  const issues =
    issuesResult.status === 'fulfilled' && Array.isArray(issuesResult.value)
      ? issuesResult.value
      : [];
  const projects =
    projectsResult.status === 'fulfilled' && Array.isArray(projectsResult.value)
      ? projectsResult.value
      : [];
  const recentEvents =
    recentEventsResult.status === 'fulfilled' && Array.isArray(recentEventsResult.value)
      ? recentEventsResult.value
      : [];

  const issueTrend = buildHourTrend(
    recentEvents.map((event) => event.receivedAt),
  );
  const projectTrend = buildProjectTrend(projects.length, recentEvents.length);
  const liveTrend = buildHourTrend(
    recentEvents.slice(0, 24).map((event) => event.receivedAt),
  );
  const projectErrorCounts = recentEvents.reduce<Record<string, number>>((acc, event) => {
    acc[event.projectId] = (acc[event.projectId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Control center"
        title="Observe project health at a glance."
        description="Track project scope, grouped issues, and live ingestion without losing technical density. The dashboard is calm by default and escalates only when the signal does."
        action={
          <Link className="ghost-button" href="/projects">
            Open projects
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatTile
          data={issueTrend}
          eyebrow="Triage"
          icon={<AlertTriangle className="size-4" />}
          label="Clustered issues"
          trend="error"
          trendLabel={`${issues.length} active`}
          value={issues.length}
        />
        <StatTile
          data={projectTrend}
          eyebrow="Scope"
          icon={<FolderKanban className="size-4" />}
          label="Projects in workspace"
          trend="info"
          trendLabel={`${projects.length} configured`}
          value={projects.length}
        />
        <StatTile
          data={liveTrend}
          eyebrow="Stream"
          icon={<RadioTower className="size-4" />}
          label="Live events today"
          trend={recentEvents.length > 0 ? 'warning' : 'success'}
          trendLabel={recentEvents.length > 0 ? 'stream active' : 'quiet feed'}
          value={recentEvents.length}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="feed-header">
            <div>
              <p className="eyebrow">Priority queue</p>
              <h3 className="feed-title">Recent grouped issues</h3>
              <p className="muted">
                The highest-signal clusters for the current workspace.
              </p>
            </div>
            <Link className="ghost-button" href="/grouping">
              View all grouped issues
            </Link>
          </div>
          {issues.length === 0 ? (
            <EmptyState
              description="No grouped issues are available yet. Run a grouping pass or wait for the scheduled job to produce the first clusters."
              title="No issues ready for triage"
            />
          ) : (
            <div className="issue-summary-list">
              {issues.slice(0, 3).map((issue) => (
                <Link className="issue-summary-item" href={`/issues/${issue.issueId}`} key={issue.issueId}>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="issue-title">{issue.title}</p>
                      <Badge variant="error">{issue.totalEvents} events</Badge>
                    </div>
                    <p className="feed-detail">{issue.summary}</p>
                  </div>
                  <div className="issue-list-meta">
                    <span>{issue.projectId}</span>
                    <span>{new Date(issue.lastSeenAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
              {issues.length > 3 ? (
                <div
                  aria-label={`${issues.length - 3} more grouped issues available`}
                  className="flex items-center justify-center py-2 text-xl tracking-[0.5em] text-muted-foreground"
                >
                  ...
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="feed-header">
            <div>
              <p className="eyebrow">Project surface</p>
              <h3 className="feed-title">Workspace projects</h3>
              <p className="muted">
                Each project keeps its own identity, key, and scoped error stream.
              </p>
            </div>
            <Link className="ghost-button" href="/projects">
              Manage
            </Link>
          </div>
          {projects.length === 0 ? (
            <EmptyState
              description="Create your first project to generate the project ID and API key your apps will use for ingestion."
              title="No projects yet"
            />
          ) : (
            <div className="issue-summary-list">
              {projects.slice(0, 4).map((project) => (
                <article className="issue-summary-item" key={project.id}>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="issue-title">{project.name}</p>
                      <Badge variant={projectErrorCounts[project.id] ? 'warning' : 'success'}>
                        {projectErrorCounts[project.id] ?? 0} today
                      </Badge>
                    </div>
                    <p className="feed-detail">Project ID: {project.id}</p>
                  </div>
                  <div className="issue-list-meta">
                    <span>Created</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-0">
        {token ? (
          <LiveErrorFeed apiUrl={getDashboardApiUrl()} token={token} />
        ) : (
          <div className="p-6">
            <EmptyState
              description="The dashboard session is missing a valid token, so the live stream could not be attached."
              title="Live feed unavailable"
            />
          </div>
        )}
      </Card>
    </section>
  );
}

function buildHourTrend(values: string[]) {
  const hours = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date();
    date.setHours(date.getHours() - (5 - offset), 0, 0, 0);
    return {
      bucket: `${String(date.getHours()).padStart(2, '0')}:00`,
      value: 0,
    };
  });

  for (const value of values) {
    const date = new Date(value);
    const bucket = `${String(date.getHours()).padStart(2, '0')}:00`;
    const target = hours.find((item) => item.bucket === bucket);
    if (target) {
      target.value += 1;
    }
  }

  return hours.map(({ value }) => ({ value }));
}

function buildProjectTrend(projectCount: number, eventCount: number) {
  const baseline = Math.max(projectCount, 1);
  return Array.from({ length: 6 }, (_, index) => ({
    value: index < 3 ? baseline : baseline + Math.min(eventCount, index),
  }));
}
