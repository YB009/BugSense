import { fetchIssues } from '../../../lib/issues';
import { fetchProjects, fetchRecentProjectErrors } from '../../../lib/projects';
import { getDashboardAccessToken, getDashboardApiUrl } from '../../../lib/auth';
import { IssuesListWorkspace } from '../../components/issues/IssuesListWorkspace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function IssuesPage() {
  const renderedAt = new Date().toISOString();
  const token = await getDashboardAccessToken();
  const [issuesResult, projectsResult, recentEventsResult] = await Promise.allSettled([
    fetchIssues(),
    fetchProjects(),
    fetchRecentProjectErrors(),
  ]);

  const safeIssues =
    issuesResult.status === 'fulfilled' && Array.isArray(issuesResult.value)
      ? issuesResult.value
      : [];
  const safeProjects =
    projectsResult.status === 'fulfilled' && Array.isArray(projectsResult.value)
      ? projectsResult.value
      : [];
  const safeRecentEvents =
    recentEventsResult.status === 'fulfilled' && Array.isArray(recentEventsResult.value)
      ? recentEventsResult.value
      : [];

  return (
    <IssuesListWorkspace
      issues={safeIssues}
      projects={safeProjects}
      recentEvents={safeRecentEvents}
      renderedAt={renderedAt}
      apiUrl={getDashboardApiUrl()}
      token={token}
    />
  );
}
