import { AlertCircle, CalendarDays, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { errorMessage } from '../api/client';
import type { Priority, Task, TaskInput, TaskQuery, TaskStatus } from '../api/types';
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '../hooks/queries';
import { Badge } from './Badge';
import { ConfirmDialog } from './Modal';
import { Pagination } from './Pagination';
import { EmptyState, ErrorState, Loading } from './States';
import { TaskFormModal } from './TaskFormModal';
import { useToast } from './Toast';
import styles from './TaskList.module.css';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
const SORTS = ['createdAt', 'dueDate', 'priority'] as const;
const LABEL: Record<string, string> = { TODO: 'To do', IN_PROGRESS: 'In progress', DONE: 'Done' };
const PAGE_SIZE = 10;

/** Format a date-only YYYY-MM-DD string without timezone drift. */
function formatDue(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const pick = <T extends string>(v: string | null, allowed: readonly T[]): T | undefined =>
  allowed.includes(v as T) ? (v as T) : undefined;

/** Filter, sort and page state live in the URL so views are shareable and survive reloads. */
export function parseTaskQuery(sp: URLSearchParams): TaskQuery {
  const page = Number(sp.get('page'));
  return {
    q: sp.get('q') || undefined,
    status: pick(sp.get('status'), STATUSES),
    priority: pick(sp.get('priority'), PRIORITIES),
    dueFrom: sp.get('dueFrom') || undefined,
    dueTo: sp.get('dueTo') || undefined,
    overdue: sp.get('overdue') === 'true' ? true : undefined,
    sortBy: pick(sp.get('sortBy'), SORTS) ?? 'createdAt',
    order: pick(sp.get('order'), ['asc', 'desc'] as const) ?? 'desc',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: PAGE_SIZE,
  };
}

export function TaskList({ projectId }: { projectId: string }) {
  const [sp, setSp] = useSearchParams();
  const query = useMemo(() => parseTaskQuery(sp), [sp]);
  const tasks = useTasks(projectId, query);
  const toast = useToast();
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);

  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [search, setSearch] = useState(query.q ?? '');
  const pushedQ = useRef(query.q);

  const setParam = (changes: Record<string, string | undefined>, resetPage = true) => {
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        if (resetPage) next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  // Resync the input when the URL changes externally (back button, nav), not for our own pushes.
  useEffect(() => {
    if (query.q === pushedQ.current) return;
    pushedQ.current = query.q;
    setSearch(query.q ?? '');
  }, [query.q]);

  // Debounce the search box into the URL.
  useEffect(() => {
    if (search === (query.q ?? '')) return;
    const t = setTimeout(() => {
      pushedQ.current = search.trim() || undefined;
      setParam({ q: pushedQ.current });
    }, 300);
    return () => clearTimeout(t);
    // Only the typed text should restart the debounce; query.q and setParam change on every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // A stale ?page= (or deleting the last task on the last page) lands past the end: step back to the last page.
  const meta = tasks.data?.meta;
  useEffect(() => {
    if (meta && meta.total > 0 && meta.page > meta.totalPages) setParam({ page: String(meta.totalPages) }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);

  const hasFilters = !!(query.q || query.status || query.priority || query.dueFrom || query.dueTo || query.overdue);

  const save = async (input: TaskInput) => {
    if (editing && editing !== 'new') {
      await updateTask.mutateAsync({ id: editing.id, body: input });
      toast.success('Task updated');
    } else {
      await createTask.mutateAsync(input);
      toast.success('Task created');
    }
    setEditing(null);
  };

  const changeStatus = async (task: Task, status: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ id: task.id, body: { status } });
      toast.success('Status updated');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteTask.mutateAsync(deleting.id);
      toast.success('Task deleted');
      setDeleting(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section aria-label="Tasks">
      <div className="row-between">
        <h2 className="page-title">Tasks</h2>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          <Plus size={18} aria-hidden="true" />
          New task
        </button>
      </div>

      <div className={`card ${styles.toolbar}`}>
        <div className={styles.primaryRow}>
          <div className={styles.search}>
            <Search size={18} aria-hidden="true" className={styles.searchIcon} />
            <input
              type="search"
              placeholder="Search by title…"
              aria-label="Search tasks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter by status"
            value={query.status ?? ''}
            onChange={(e) => setParam({ status: e.target.value || undefined })}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {LABEL[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by priority"
            value={query.priority ?? ''}
            onChange={(e) => setParam({ priority: e.target.value || undefined })}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0] + p.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort tasks"
            value={`${query.sortBy}:${query.order}`}
            onChange={(e) => {
              const [sortBy, order] = e.target.value.split(':');
              setParam({ sortBy, order }, false);
            }}
          >
            <option value="createdAt:desc">Newest first</option>
            <option value="createdAt:asc">Oldest first</option>
            <option value="dueDate:asc">Due date (soonest)</option>
            <option value="dueDate:desc">Due date (latest)</option>
            <option value="priority:desc">Priority (high to low)</option>
            <option value="priority:asc">Priority (low to high)</option>
          </select>
        </div>
        <div className={styles.secondaryRow}>
          <label className={styles.inline}>
            <CalendarDays size={16} aria-hidden="true" />
            Due from
            <input
              type="date"
              value={query.dueFrom ?? ''}
              onChange={(e) => setParam({ dueFrom: e.target.value || undefined })}
            />
          </label>
          <label className={styles.inline}>
            <CalendarDays size={16} aria-hidden="true" />
            Due to
            <input
              type="date"
              value={query.dueTo ?? ''}
              onChange={(e) => setParam({ dueTo: e.target.value || undefined })}
            />
          </label>
          <label className={styles.chip}>
            <input
              type="checkbox"
              checked={!!query.overdue}
              onChange={(e) => setParam({ overdue: e.target.checked ? 'true' : undefined })}
            />
            Overdue only
          </label>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setSearch('');
                setParam({
                  q: undefined,
                  status: undefined,
                  priority: undefined,
                  dueFrom: undefined,
                  dueTo: undefined,
                  overdue: undefined,
                });
              }}
            >
              <X size={14} aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {tasks.isPending && <Loading label="Loading tasks" />}
      {tasks.isError && <ErrorState message={errorMessage(tasks.error)} onRetry={() => void tasks.refetch()} />}
      {tasks.data && tasks.data.meta.total === 0 && (
        <EmptyState
          title={hasFilters ? 'No tasks match your filters' : 'No tasks yet'}
          action={
            !hasFilters && (
              <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
                <Plus size={18} aria-hidden="true" />
                Add your first task
              </button>
            )
          }
        >
          {hasFilters ? 'Try changing or clearing the filters.' : 'Add a task to get started.'}
        </EmptyState>
      )}
      {tasks.data && tasks.data.data.length > 0 && (
        <>
          <div className={styles.tableWrap} aria-busy={tasks.isFetching} data-fetching={tasks.isFetching}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {tasks.data.data.map((t) => {
                  const overdue = !!t.dueDate && t.dueDate < today && t.status !== 'DONE';
                  return (
                    <tr key={t.id}>
                      <td data-label="Title">
                        <div className={styles.title}>{t.title}</div>
                        {t.description && <div className={`muted small ${styles.desc}`}>{t.description}</div>}
                      </td>
                      <td data-label="Status">
                        <select
                          className={styles.statusSelect}
                          aria-label={`Status of ${t.title}`}
                          value={t.status}
                          onChange={(e) => void changeStatus(t, e.target.value as TaskStatus)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Priority">
                        <Badge value={t.priority} />
                      </td>
                      <td data-label="Due">
                        {t.dueDate ? (
                          <span className={overdue ? styles.overdue : styles.due}>
                            {overdue && <AlertCircle size={14} aria-hidden="true" />}
                            {formatDue(t.dueDate)}
                            {overdue && <span className={styles.overdueTag}>Overdue</span>}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className={styles.actions}>
                        <button
                          type="button"
                          className="btn btn-icon"
                          aria-label={`Edit ${t.title}`}
                          title="Edit"
                          onClick={() => setEditing(t)}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-icon btn-icon-danger"
                          aria-label={`Delete ${t.title}`}
                          title="Delete"
                          onClick={() => setDeleting(t)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={tasks.data.meta.page}
            totalPages={tasks.data.meta.totalPages}
            total={tasks.data.meta.total}
            pageSize={tasks.data.meta.limit}
            onChange={(p) => setParam({ page: String(p) }, false)}
          />
        </>
      )}

      {editing && (
        <TaskFormModal
          task={editing === 'new' ? undefined : editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${deleting.title}"? This cannot be undone.`}
          busy={deleteTask.isPending}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
