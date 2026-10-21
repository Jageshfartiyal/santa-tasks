import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsPage } from '../src/pages/ProjectsPage';

const api = vi.hoisted(() => ({ listProjects: vi.fn() }));
vi.mock('../src/api/endpoints', () => api);

const project = {
  id: 'p1',
  name: 'Alpha',
  description: 'First',
  status: 'ACTIVE',
  taskCount: 2,
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
};

beforeEach(() => api.listProjects.mockReset());

describe('ProjectsPage', () => {
  it('renders projects and requests status= when the filter changes', async () => {
    api.listProjects.mockResolvedValue([project]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/projects']}>
          <ProjectsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Alpha')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'ARCHIVED');
    await waitFor(() =>
      expect(api.listProjects).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ARCHIVED' })),
    );
  });
});
