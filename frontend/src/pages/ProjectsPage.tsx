import { Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { errorMessage } from '../api/client';
import type { ProjectQuery, ProjectStatus } from '../api/types';
import { ProjectGrid } from '../components/ProjectGrid';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useProjects } from '../hooks/queries';
import styles from './ProjectsPage.module.css';

const STATUSES: ProjectStatus[] = ['ACTIVE', 'COMPLETED', 'ARCHIVED'];
const LABEL: Record<ProjectStatus, string> = { ACTIVE: 'Active', COMPLETED: 'Completed', ARCHIVED: 'Archived' };

export function ProjectsPage() {
  const [sp, setSp] = useSearchParams();
  const rawStatus = sp.get('status');
  const status = STATUSES.find((s) => s === rawStatus);
  const q = sp.get('q')?.trim() || undefined;
  const query = useMemo<ProjectQuery>(() => ({ q, status }), [q, status]);
  const projects = useProjects(query);
  const [search, setSearch] = useState(q ?? '');
  const hasFilters = !!(q || status);
  const pushedQ = useRef(q);

  const setParam = (changes: Record<string, string | undefined>) =>
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      },
      { replace: true },
    );

  // Resync the input when the URL changes externally (back button, nav link), not for our own pushes.
  useEffect(() => {
    if (q === pushedQ.current) return;
    pushedQ.current = q;
    setSearch(q ?? '');
  }, [q]);

  // Debounce the search box into the URL.
  useEffect(() => {
    if (search.trim() === (q ?? '')) return;
    const t = setTimeout(() => {
      pushedQ.current = search.trim() || undefined;
      setParam({ q: pushedQ.current });
    }, 300);
    return () => clearTimeout(t);
    // Only the typed text should restart the debounce; q and setParam change on every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <>
      <div className="row-between">
        <h1 className="page-title">Projects</h1>
        <Link to="/projects/new" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" />
          New project
        </Link>
      </div>

      <div className={`card ${styles.filters}`}>
        <div className={styles.search}>
          <Search size={18} aria-hidden="true" className={styles.searchIcon} />
          <input
            type="search"
            placeholder="Search projects…"
            aria-label="Search projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by status"
          value={status ?? ''}
          onChange={(e) => setParam({ status: e.target.value || undefined })}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {projects.isPending && <Loading label="Loading projects" variant="cards" />}
      {projects.isError && <ErrorState message={errorMessage(projects.error)} onRetry={() => void projects.refetch()} />}
      {projects.data?.length === 0 &&
        (hasFilters ? (
          <EmptyState title="No projects match your filters">Try changing or clearing the filters.</EmptyState>
        ) : (
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
        ))}
      {!!projects.data?.length && <ProjectGrid projects={projects.data} />}
    </>
  );
}
