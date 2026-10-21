import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/endpoints';
import type { ProjectInput, TaskInput, TaskQuery } from '../api/types';

export const keys = {
  stats: ['stats'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  tasks: (projectId: string) => ['tasks', projectId] as const,
  taskList: (projectId: string, q: TaskQuery) => ['tasks', projectId, q] as const,
};

export const useStats = () => useQuery({ queryKey: keys.stats, queryFn: api.getStats });
export const useProjects = () => useQuery({ queryKey: keys.projects, queryFn: api.listProjects });
export const useProject = (id: string) => useQuery({ queryKey: keys.project(id), queryFn: () => api.getProject(id) });

export const useTasks = (projectId: string, query: TaskQuery) =>
  useQuery({
    queryKey: keys.taskList(projectId, query),
    queryFn: () => api.listTasks(projectId, query),
    placeholderData: keepPreviousData,
  });

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: ProjectInput) => api.createProject(b),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.projects });
      void qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: ProjectInput) => api.updateProject(id, b),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.projects }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.projects });
      void qc.invalidateQueries({ queryKey: keys.stats });
      void qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

function useInvalidateTasks(projectId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: keys.tasks(projectId) });
    void qc.invalidateQueries({ queryKey: keys.stats });
    void qc.invalidateQueries({ queryKey: keys.projects });
  };
}

export function useCreateTask(projectId: string) {
  const done = useInvalidateTasks(projectId);
  return useMutation({ mutationFn: (b: TaskInput) => api.createTask(projectId, b), onSuccess: done });
}

export function useUpdateTask(projectId: string) {
  const done = useInvalidateTasks(projectId);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<TaskInput> }) => api.updateTask(id, body),
    onSuccess: done,
  });
}

export function useDeleteTask(projectId: string) {
  const done = useInvalidateTasks(projectId);
  return useMutation({ mutationFn: (id: string) => api.deleteTask(id), onSuccess: done });
}
