export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  taskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectQuery {
  q?: string;
  status?: ProjectStatus;
}

export interface ProjectInput {
  name: string;
  description: string;
  status: ProjectStatus;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
}

export interface TaskQuery {
  q?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueFrom?: string;
  dueTo?: string;
  overdue?: boolean;
  sortBy: 'createdAt' | 'dueDate' | 'priority';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Stats {
  projects: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
}

export interface Session {
  user: User;
  accessToken: string;
}
