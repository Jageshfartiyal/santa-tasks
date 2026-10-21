import { z } from 'zod';
import { text } from '../../lib/text';

export const projectStatus = z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']);

export const createProjectSchema = z.object({
  name: text().trim().min(1, 'Name is required').max(100),
  description: text().trim().max(1000).default(''),
  status: projectStatus.default('ACTIVE'),
});

export const updateProjectSchema = z
  .object({
    name: createProjectSchema.shape.name,
    description: text().trim().max(1000),
    status: projectStatus,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const listProjectsQuery = z.object({
  status: projectStatus.optional(),
  q: text().trim().max(100).optional(),
});
