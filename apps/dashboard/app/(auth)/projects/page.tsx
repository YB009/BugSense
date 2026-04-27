import Link from 'next/link';
import { createProjectAction } from './actions';
import {
  fetchProjects,
  fetchRecentProjectErrors,
  type DashboardProject,
  type ProjectErrorEvent,
} from '../../../lib/projects';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { SectionHeader } from '../../components/ui/SectionHeader';

interface ProjectsPageProps {
  searchParams?: Promise<{
    project?: string;
  }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const [paramsResult, projectsResult, errorsResult] = await Promise.allSettled([
    searchParams,
    fetchProjects(),
    fetchRecentProjectErrors(),
  ]);
  const selectedProjectId =
    paramsResult.status === 'fulfilled' ? paramsResult.value?.project : undefined;
  const projects =
    projectsResult.status === 'fulfilled' && Array.isArray(projectsResult.value)
      ? projectsResult.value
      : [];
  const errors =
    errorsResult.status === 'fulfilled' && Array.isArray(errorsResult.value)
      ? errorsResult.value
      : [];
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const selectedErrors = selectedProject
    ? errors.filter((event) => event.projectId === selectedProject.id)
    : [];

  return (
    <section className="project-workspace">
      <SectionHeader
        eyebrow="Projects"
        title="Separate every application into its own error space."
        description="Each project tab carries its own project ID, API key, and scoped live stream. Use one project per app or environment to keep monitoring clean."
        action={
          <form action={createProjectAction} className="project-create-form">
            <Input
              aria-label="Project name"
              className="project-name-input"
              name="name"
              placeholder="New project name"
              required
            />
            <Button size="lg" type="submit">
              Create project
            </Button>
          </form>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          description="Create a project to generate the credentials your client apps will use for ingestion and sourcemap uploads."
          title="No projects yet"
          action={
            <form action={createProjectAction} className="project-create-form max-w-md">
              <Input
                aria-label="Project name"
                className="project-name-input"
                name="name"
                placeholder="New project name"
                required
              />
              <Button type="submit">Create project</Button>
            </form>
          }
        />
      ) : (
        <>
          <nav className="project-tabs" aria-label="Projects">
            {projects.map((project) => (
              <Link
                className={`project-tab ${
                  project.id === selectedProject?.id ? 'project-tab-active' : ''
                }`}
                href={`/projects?project=${encodeURIComponent(project.id)}`}
                key={project.id}
              >
                <span className="text-sm font-medium text-foreground">{project.name}</span>
                <small className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {countProjectErrors(errors, project.id)} today
                </small>
              </Link>
            ))}
          </nav>

          {selectedProject ? (
            <SelectedProjectPanel
              errors={selectedErrors}
              project={selectedProject}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function SelectedProjectPanel({
  project,
  errors,
}: {
  project: DashboardProject;
  errors: ProjectErrorEvent[];
}) {
  return (
    <div className="project-detail-layout">
      <div className="space-y-5">
        <Card className="p-6">
          <div className="feed-header">
            <div>
              <p className="eyebrow">Overview</p>
              <h3 className="feed-title">{project.name}</h3>
              <p className="muted">
                Project-specific credentials and recent activity for this monitored surface.
              </p>
            </div>
            <Badge variant={errors.length > 0 ? 'warning' : 'success'}>
              {errors.length > 0 ? `${errors.length} events today` : 'No events today'}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Credential label="Project ID" value={project.id} />
            <Credential label="Created" value={new Date(project.createdAt).toLocaleString()} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="feed-header">
            <div>
              <p className="eyebrow">Credentials</p>
              <h3 className="feed-title">Install and ingest</h3>
            </div>
            <Badge variant="info">Railway hosted</Badge>
          </div>
          <div className="space-y-4">
            <Credential label="Project ID" value={project.id} />
            <Credential label="API key" value={project.apiKey} />
            <pre className="sdk-snippet">{`import { BugSense } from '@bugsense/bugsense-js';

const bugsense = new BugSense({
  projectId: '${project.id}',
  apiKey: '${project.apiKey}',
  endpoint: 'https://bugsenseapi-gateway-production.up.railway.app/ingest',
  environment: 'production',
  release: '1.0.0',
});`}</pre>
          </div>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-6">
            <p className="eyebrow">Usage</p>
            <h3 className="feed-title">Recommended structure</h3>
            <p className="muted">
              Use one project per deployed application or per environment if you need strict separation between staging and production noise.
            </p>
          </Card>
          <Card className="p-6">
            <p className="eyebrow">Settings</p>
            <h3 className="feed-title">Next extension</h3>
            <p className="muted">
              Future versions can expose project-specific alert routing, ownership controls, and usage analytics in this space.
            </p>
          </Card>
        </div>
      </div>

      <Card className="project-errors p-6">
        <div className="feed-header">
          <div>
            <p className="eyebrow">Recent errors</p>
            <h3 className="feed-title">{errors.length} event(s) today</h3>
            <p className="muted">
              Events currently scoped to this project tab only.
            </p>
          </div>
        </div>
        {errors.length === 0 ? (
          <EmptyState
            description="Ingest a smoke-test error or wait for runtime activity. New events will stay isolated to this project."
            title="No project errors yet"
          />
        ) : (
          <div className="feed-list">
            {errors.map((event) => (
              <article className="feed-item" key={event.eventId}>
                <div className="feed-item-top">
                  <span className={`feed-level feed-level-${event.level}`}>
                    {event.level}
                  </span>
                  <span className="feed-meta">
                    {event.platform} - {event.environment}
                  </span>
                </div>
                <p className="feed-message">{event.message}</p>
                <p className="feed-detail">
                  {event.exceptionType ?? 'UnknownError'} - {event.projectId}
                </p>
                <p className="feed-timestamp">
                  {new Date(event.receivedAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div className="credential-row">
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}

function countProjectErrors(events: ProjectErrorEvent[], projectId: string) {
  return events.filter((event) => event.projectId === projectId).length;
}
