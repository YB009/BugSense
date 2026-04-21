import Link from 'next/link';
import { createProjectAction } from './actions';
import {
  fetchProjects,
  fetchRecentProjectErrors,
  type DashboardProject,
  type ProjectErrorEvent,
} from '../../../lib/projects';

interface ProjectsPageProps {
  searchParams?: Promise<{
    project?: string;
  }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const [{ project: selectedProjectId } = {}, projects, errors] = await Promise.all([
    searchParams,
    fetchProjects(),
    fetchRecentProjectErrors(),
  ]);
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const selectedErrors = selectedProject
    ? errors.filter((event) => event.projectId === selectedProject.id)
    : [];

  return (
    <section className="project-workspace">
      <div className="project-toolbar">
        <div>
          <p className="eyebrow">Projects</p>
          <h2 className="headline project-headline">Project error spaces</h2>
          <p className="muted">
            Each tab is scoped to one project ID and API key.
          </p>
        </div>
        <form action={createProjectAction} className="project-create-form">
          <input
            aria-label="Project name"
            className="field-input project-name-input"
            name="name"
            placeholder="New project name"
            required
          />
          <button className="primary-button" type="submit">
            Create
          </button>
        </form>
      </div>

      {projects.length === 0 ? (
        <p className="muted">No projects yet. Create your first project.</p>
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
                <span>{project.name}</span>
                <small>{countProjectErrors(errors, project.id)} errors</small>
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
      <section className="project-credentials">
        <div>
          <p className="stat-label">Selected Project</p>
          <h3 className="feed-title">{project.name}</h3>
        </div>
        <Credential label="Project ID" value={project.id} />
        <Credential label="API key" value={project.apiKey} />
        <pre className="sdk-snippet">{`new BugSense({
  projectId: '${project.id}',
  apiKey: '${project.apiKey}',
  endpoint: 'https://bugsenseapi-gateway-production.up.railway.app/ingest'
});`}</pre>
      </section>

      <section className="project-errors">
        <div className="feed-header">
          <div>
            <p className="stat-label">Scoped Errors</p>
            <h3 className="feed-title">{errors.length} event(s) today</h3>
          </div>
        </div>
        {errors.length === 0 ? (
          <p className="muted">
            No errors have been ingested for this project today.
          </p>
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
      </section>
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
