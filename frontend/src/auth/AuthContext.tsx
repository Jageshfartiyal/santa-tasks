import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/endpoints';
import { refreshSession, setAccessToken, setAuthFailureHandler } from '../api/client';
import type { User } from '../api/types';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthValue {
  user: User | null;
  status: Status;
  login: (b: { email: string; password: string }) => Promise<void>;
  register: (b: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const qc = useQueryClient();

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setAuthFailureHandler(clear);
    // Silent refresh on load: the httpOnly cookie, if valid, gives us a fresh access token.
    refreshSession()
      .then((s) => {
        setUser(s.user);
        setStatus('authenticated');
      })
      .catch(() => setStatus('unauthenticated'));
  }, [clear]);

  const value = useMemo<AuthValue>(() => {
    const start = (s: { user: User; accessToken: string }) => {
      setAccessToken(s.accessToken);
      setUser(s.user);
      setStatus('authenticated');
    };
    return {
      user,
      status,
      login: async (b) => start(await authApi.login(b)),
      register: async (b) => start(await authApi.register(b)),
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          clear();
        }
      },
    };
  }, [user, status, clear]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
