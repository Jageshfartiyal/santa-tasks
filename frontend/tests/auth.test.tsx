import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../src/pages/LoginPage';
import { ProtectedRoute } from '../src/routes/ProtectedRoute';

const auth = vi.hoisted(() => ({
  value: { status: 'unauthenticated', user: null, login: vi.fn(), register: vi.fn(), logout: vi.fn() } as {
    status: string;
    user: unknown;
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  },
}));

vi.mock('../src/auth/AuthContext', () => ({ useAuth: () => auth.value }));

beforeEach(() => {
  auth.value.status = 'unauthenticated';
  auth.value.login.mockReset();
});

function renderProtected() {
  render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<div>login screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/secret" element={<div>secret content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects an unauthenticated user to /login', () => {
    renderProtected();
    expect(screen.getByText('login screen')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  it('shows a loading state while the session is being restored, then the content when authenticated', () => {
    auth.value.status = 'loading';
    const { unmount } = render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/secret" element={<div>secret content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/restoring session/i);
    unmount();

    auth.value.status = 'authenticated';
    renderProtected();
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  const renderLogin = () =>
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

  it('shows inline validation errors and does not submit invalid data', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(auth.value.login).not.toHaveBeenCalled();
  });

  it('fills both fields from the demo account card without submitting', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Use demo account' }));
    expect(screen.getByLabelText('Email')).toHaveValue('demo@santa.dev');
    expect(screen.getByLabelText('Password')).toHaveValue('Demo1234');
    expect(screen.getByRole('button', { name: 'Copy demo email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy demo password' })).toBeInTheDocument();
    expect(auth.value.login).not.toHaveBeenCalled();
    auth.value.login.mockResolvedValue(undefined);
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() =>
      expect(auth.value.login).toHaveBeenCalledWith({ email: 'demo@santa.dev', password: 'Demo1234' }),
    );
  });

  it('submits valid data and navigates to the dashboard', async () => {
    auth.value.login.mockResolvedValue(undefined);
    renderLogin();
    await userEvent.type(screen.getByLabelText('Email'), 'demo@santa.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'Demo1234');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() =>
      expect(auth.value.login).toHaveBeenCalledWith({ email: 'demo@santa.dev', password: 'Demo1234' }),
    );
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
  });

  it('shows a server error when login fails', async () => {
    auth.value.login.mockRejectedValue(new Error('boom'));
    renderLogin();
    await userEvent.type(screen.getByLabelText('Email'), 'demo@santa.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'Wrong1234');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });
});
