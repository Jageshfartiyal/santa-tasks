import { z } from 'zod';

export const taskStatus = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export const priority = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const PRIORITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;

/** Date-only string (YYYY-MM-DD) that must be a real calendar date. */
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD')
  .refine((s) => new Date(`${s}T00:00:00.000Z`).toISOString().slice(0, 10) === s, 'Invalid date');

export const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

const fields = {
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000),
  status: taskStatus,
  priority,
  dueDate: dateOnly.nullable(),
};

export const createTaskSchema = z.object({
  title: fields.title,
  description: fields.description.default(''),
  status: fields.status.default('TODO'),
  priority: fields.priority.default('MEDIUM'),
  dueDate: fields.dueDate.default(null),
});

export const updateTaskSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

export const listTasksQuery = z.object({
  q: z.string().trim().max(200).optional(),
  status: taskStatus.optional(),
  priority: priority.optional(),
  dueFrom: dateOnly.optional(),
  dueTo: dateOnly.optional(),
  overdue: bool.optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
