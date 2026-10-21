import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { errorMessage } from '../api/client';
import type { Priority, Task, TaskInput, TaskQuery, TaskStatus } from '../api/types';
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '../hooks/queries';
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

  // Debounce the search box into the URL.
  useEffect(() => {
    if (search === (query.q ?? '')) return;
    const t = setTimeout(() => setParam({ q: search.trim() || undefined }), 300);
    return () => clearTimeout(t);

  }, [search]);

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
        <h2 style={{ margin: 0 }}>Tasks</h2>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          Add task
        </button>
      </div>

      <div className={`card ${styles.filters}`}>
        <input
          type="search"
          placeholder="Search by title…"
          aria-label="Search tasks"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
        <label className={styles.inline}>
          Due from
          <input
            type="date"
            value={query.dueFrom ?? ''}
            onChange={(e) => setParam({ dueFrom: e.target.value || undefined })}
          />
        </label>
        <label className={styles.inline}>
          Due to
          <input
            type="date"
            value={query.dueTo ?? ''}
            onChange={(e) => setParam({ dueTo: e.target.value || undefined })}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={!!query.overdue}
            onChange={(e) => setParam({ overdue: e.target.checked ? 'true' : undefined })}
          />
          Overdue only
        </label>
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
        {hasFilters && (
          <button
            type="button"
            className="btn btn-sm"
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
            Clear filters
          </button>
        )}
      </div>

      {tasks.isPending && <Loading label="Loading tasks" />}
      {tasks.isError && <ErrorState message={errorMessage(tasks.error)} onRetry={() => void tasks.refetch()} />}
      {tasks.data && tasks.data.data.length === 0 && (
        <EmptyState title={hasFilters ? 'No tasks match your filters' : 'No tasks yet'}>
          {hasFilters ? 'Try changing or clearing the filters.' : 'Add a task to get started.'}
        </EmptyState>
      )}
      {tasks.data && tasks.data.data.length > 0 && (
        <>
          <div className={styles.tableWrap} aria-busy={tasks.isFetching}>
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
                {tasks.data.data.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Title">
                      <div className={styles.title}>{t.title}</div>
                      {t.description && <div className="muted small">{t.description}</div>}
                    </td>
                    <td data-label="Status">
                      <select
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
                      <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                    </td>
                    <td data-label="Due">
                      {t.dueDate ? (
                        <span className={t.dueDate < today && t.status !== 'DONE' ? styles.overdue : undefined}>
                          {t.dueDate}
                          {t.dueDate < today && t.status !== 'DONE' ? ' (overdue)' : ''}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className={styles.actions}>
                      <button type="button" className="btn btn-sm" onClick={() => setEditing(t)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => setDeleting(t)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={tasks.data.meta.page}
            totalPages={tasks.data.meta.totalPages}
            total={tasks.data.meta.total}
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
