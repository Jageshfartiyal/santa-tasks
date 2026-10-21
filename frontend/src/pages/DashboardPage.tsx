import { Link } from 'react-router';
import { errorMessage } from '../api/client';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useProjects, useStats } from '../hooks/queries';

export function DashboardPage() {
  const stats = useStats();
  const projects = useProjects();

  const cards = stats.data
    ? [
        ['Projects', stats.data.projects],
        ['Total tasks', stats.data.totalTasks],
        ['Pending tasks', stats.data.pendingTasks],
        ['Completed tasks', stats.data.completedTasks],
      ]
    : [];

  return (
    <>
      <div className="row-between">
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <Link to="/projects/new" className="btn btn-primary">
          New project
        </Link>
      </div>

      <section aria-label="Statistics">
        {stats.isPending && <Loading label="Loading stats" />}
        {stats.isError && <ErrorState message={errorMessage(stats.error)} onRetry={() => void stats.refetch()} />}
        {stats.data && (
          <div className="stats">
            {cards.map(([label, value]) => (
              <div className="card" key={label}>
                <div className="muted">{label}</div>
                <div className="stat-value" data-testid={`stat-${label}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Projects">
        <h2>Your projects</h2>
        {projects.isPending && <Loading label="Loading projects" />}
        {projects.isError && (
          <ErrorState message={errorMessage(projects.error)} onRetry={() => void projects.refetch()} />
        )}
        {projects.data?.length === 0 && (
          <EmptyState title="No projects yet">
            <Link to="/projects/new">Create your first project</Link> to start tracking tasks.
          </EmptyState>
        )}
        {!!projects.data?.length && (
          <ul className="project-list">
            {projects.data.map((p) => (
              <li key={p.id} className="card project-item">
                <div>
                  <Link to={`/projects/${p.id}`}>{p.name}</Link>
                  {p.description && <div className="muted small">{p.description}</div>}
                </div>
                <div className="row">
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                  <span className="muted small">
                    {p.taskCount ?? 0} task{p.taskCount === 1 ? '' : 's'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
