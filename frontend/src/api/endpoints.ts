import { api } from './client';
import type { Paginated, Project, ProjectInput, ProjectQuery, Session, Stats, Task, TaskInput, TaskQuery, User } from './types';

export const authApi = {
  register: (b: { name: string; email: string; password: string }) =>
    api.post<Session>('/auth/register', b).then((r) => r.data),
  login: (b: { email: string; password: string }) => api.post<Session>('/auth/login', b).then((r) => r.data),
  logout: () => api.post('/auth/logout').then(() => undefined),
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
};

export const getStats = () => api.get<Stats>('/stats').then((r) => r.data);

export const listProjects = (params?: ProjectQuery) =>
  api.get<{ data: Project[] }>('/projects', { params }).then((r) => r.data.data);
export const getProject = (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data);
export const createProject = (b: ProjectInput) => api.post<Project>('/projects', b).then((r) => r.data);
export const updateProject = (id: string, b: Partial<ProjectInput>) =>
  api.put<Project>(`/projects/${id}`, b).then((r) => r.data);
export const deleteProject = (id: string) => api.delete(`/projects/${id}`).then(() => undefined);

export const listTasks = (projectId: string, params: TaskQuery) =>
  api.get<Paginated<Task>>(`/projects/${projectId}/tasks`, { params }).then((r) => r.data);
export const createTask = (projectId: string, b: TaskInput) =>
  api.post<Task>(`/projects/${projectId}/tasks`, b).then((r) => r.data);
export const updateTask = (id: string, b: Partial<TaskInput>) => api.put<Task>(`/tasks/${id}`, b).then((r) => r.data);
export const deleteTask = (id: string) => api.delete(`/tasks/${id}`).then(() => undefined);
