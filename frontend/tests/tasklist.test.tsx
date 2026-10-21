import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../src/api/types';
import { TaskList } from '../src/components/TaskList';
import { ToastProvider } from '../src/components/Toast';

const api = vi.hoisted(() => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock('../src/api/endpoints', () => api);

const task = (over: Partial<Task> = {}): Task => ({
  id: 't1',
  projectId: 'p1',
  title: 'Write report',
  description: '',
  status: 'TODO',
  priority: 'HIGH',
  dueDate: '2030-01-01',
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
  ...over,
});

const page = (data: Task[]) => ({ data, meta: { page: 1, limit: 10, total: data.length, totalPages: 1 } });

function renderList(initial = '/projects/p1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initial]}>
          <TaskList projectId="p1" />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
});

describe('TaskList states', () => {
  it('shows loading, then rows', async () => {
    api.listTasks.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderList();
    expect(screen.getByRole('status')).toHaveTextContent(/loading tasks/i);
    unmount();

    api.listTasks.mockResolvedValue(page([task()]));
    renderList();
    expect(await screen.findByText('Write report')).toBeInTheDocument();
  });

  it('shows the empty state, with different copy when filters are active', async () => {
    api.listTasks.mockResolvedValue(page([]));
    const { unmount } = renderList();
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
    unmount();

    renderList('/projects/p1?status=DONE');
    expect(await screen.findByText('No tasks match your filters')).toBeInTheDocument();
  });

  it('shows the error state and retries', async () => {
    api.listTasks.mockRejectedValueOnce(new Error('network')).mockResolvedValue(page([task()]));
    renderList();
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Write report')).toBeInTheDocument();
  });
});

describe('TaskList filters', () => {
  it('sends the right query params when filters, sort and search change', async () => {
    api.listTasks.mockResolvedValue(page([task()]));
    renderList();
    await screen.findByText('Write report');
    expect(api.listTasks).toHaveBeenLastCalledWith(
      'p1',
      expect.objectContaining({ sortBy: 'createdAt', order: 'desc', page: 1, limit: 10, status: undefined }),
    );

    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'DONE');
    await waitFor(() =>
      expect(api.listTasks).toHaveBeenLastCalledWith('p1', expect.objectContaining({ status: 'DONE', page: 1 })),
    );

    await userEvent.selectOptions(screen.getByLabelText('Filter by priority'), 'HIGH');
    await waitFor(() =>
      expect(api.listTasks).toHaveBeenLastCalledWith('p1', expect.objectContaining({ status: 'DONE', priority: 'HIGH' })),
    );

    await userEvent.selectOptions(screen.getByLabelText('Sort tasks'), 'priority:desc');
    await waitFor(() =>
      expect(api.listTasks).toHaveBeenLastCalledWith('p1', expect.objectContaining({ sortBy: 'priority', order: 'desc' })),
    );

    await userEvent.type(screen.getByLabelText('Search tasks'), 'rep');
    await waitFor(() => expect(api.listTasks).toHaveBeenLastCalledWith('p1', expect.objectContaining({ q: 'rep' })), {
      timeout: 2000,
    });
  });

  it('reads initial filters and page from the URL and requests the next page', async () => {
    api.listTasks.mockResolvedValue({ data: [task()], meta: { page: 2, limit: 10, total: 25, totalPages: 3 } });
    renderList('/projects/p1?status=TODO&overdue=true&page=2');
    await screen.findByText('Write report');
    expect(api.listTasks).toHaveBeenCalledWith('p1', expect.objectContaining({ status: 'TODO', overdue: true, page: 2 }));

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(api.listTasks).toHaveBeenLastCalledWith('p1', expect.objectContaining({ page: 3 })));
  });

  it('changes status inline', async () => {
    api.listTasks.mockResolvedValue(page([task()]));
    api.updateTask.mockResolvedValue(task({ status: 'DONE' }));
    renderList();
    await userEvent.selectOptions(await screen.findByLabelText('Status of Write report'), 'DONE');
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith('t1', { status: 'DONE' }));
    expect(await screen.findByText('Status updated')).toBeInTheDocument();
  });
});
