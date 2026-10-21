import { CheckCircle2, Clock, FolderKanban, ListTodo, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ProjectGrid } from '../components/ProjectGrid';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useProjects, useStats } from '../hooks/queries';
import styles from './DashboardPage.module.css';

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const stats = useStats();
  const projects = useProjects();
  const { user } = useAuth();
  const { hash } = useLocation();

  useEffect(() => {
    if (hash === '#projects') document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  const cards = stats.data
    ? [
        { label: 'Projects', value: stats.data.projects, Icon: FolderKanban },
        { label: 'Total tasks', value: stats.data.totalTasks, Icon: ListTodo },
        { label: 'Pending tasks', value: stats.data.pendingTasks, Icon: Clock },
        { label: 'Completed tasks', value: stats.data.completedTasks, Icon: CheckCircle2 },
      ]
    : [];

  return (
    <>
      <div className="row-between">
        <div>
          <h1 className="page-title">
            {greeting()}, {user?.name}
          </h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Here is what is happening across your projects.
          </p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" />
          New project
        </Link>
      </div>

      <section aria-label="Statistics" className={styles.statsSection}>
        {stats.isPending && <Loading label="Loading stats" variant="stats" />}
        {stats.isError && <ErrorState message={errorMessage(stats.error)} onRetry={() => void stats.refetch()} />}
        {stats.data && (
          <div className={styles.stats}>
            {cards.map(({ label, value, Icon }) => (
              <div className={`card ${styles.stat}`} key={label}>
                <span className={styles.statIcon}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <div className={styles.statValue} data-testid={`stat-${label}`}>
                    {value}
                  </div>
                  <div className="muted small">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Projects" id="projects" className={styles.projects}>
        <h2>Your projects</h2>
        {projects.isPending && <Loading label="Loading projects" variant="cards" />}
        {projects.isError && (
          <ErrorState message={errorMessage(projects.error)} onRetry={() => void projects.refetch()} />
        )}
        {projects.data?.length === 0 && (
          <EmptyState
            title="No projects yet"
            action={
              <Link to="/projects/new" className="btn btn-primary">
                <Plus size={18} aria-hidden="true" />
                Create your first project
              </Link>
            }
          >
            Create a project to start tracking tasks.
          </EmptyState>
        )}
        {!!projects.data?.length && (
          <ProjectGrid projects={projects.data} />
        )}
      </section>
    </>
  );
}
