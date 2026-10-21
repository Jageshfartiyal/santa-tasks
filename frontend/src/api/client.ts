import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { Session } from './types';

const baseURL = `${import.meta.env.VITE_API_URL ?? ''}/api`;

// The access token lives in memory only; the refresh token is an httpOnly cookie the browser manages.
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

let onAuthFailure: () => void = () => {};
export const setAuthFailureHandler = (fn: () => void) => {
  onAuthFailure = fn;
};

export const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<Session> | null = null;

/** Single-flight refresh: concurrent callers (incl. React StrictMode double effects) share one request. */
export function refreshSession(): Promise<Session> {
  refreshing ??= axios
    .post<Session>('/auth/refresh', null, { baseURL, withCredentials: true })
    .then((r) => {
      accessToken = r.data.accessToken;
      return r.data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type Retriable = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as Retriable | undefined;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status !== 401 || !original || original._retried || isAuthCall) throw error;
    original._retried = true;
    try {
      await refreshSession();
    } catch {
      accessToken = null;
      onAuthFailure();
      throw error;
    }
    return api(original);
  },
);

export interface ApiFieldError {
  field: string;
  message: string;
}

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(e)) {
    if (!e.response) return 'Cannot reach the server. Check your connection.';
    const msg = e.response.data?.error?.message;
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

export function fieldErrors(e: unknown): ApiFieldError[] {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data?.error?.details;
    if (Array.isArray(d)) return d as ApiFieldError[];
  }
  return [];
}
