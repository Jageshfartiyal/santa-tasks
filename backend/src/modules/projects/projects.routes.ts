import { Router } from 'express';
import { notFound } from '../../lib/errors';
import { parseId } from '../../lib/ids';
import { prisma } from '../../lib/prisma';
import { escapeLike } from '../../lib/text';
import { uid } from '../../middleware/auth';
import { tasksByProjectRouter } from '../tasks/tasks.routes';
import { createProjectSchema, listProjectsQuery, updateProjectSchema } from './projects.schemas';

export const projectsRouter = Router();

projectsRouter.get('/', async (req, res) => {
  const { status, q } = listProjectsQuery.parse(req.query);
  const rows = await prisma.project.findMany({
    where: { userId: uid(req), status, name: q ? { contains: escapeLike(q), mode: 'insensitive' } : undefined },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    include: { _count: { select: { tasks: true } } },
  });
  res.json({ data: rows.map(({ _count, ...p }) => ({ ...p, taskCount: _count.tasks })) });
});

projectsRouter.post('/', async (req, res) => {
  const input = createProjectSchema.parse(req.body);
  const project = await prisma.project.create({ data: { ...input, userId: uid(req) } });
  res.status(201).json(project);
});

projectsRouter.get('/:id', async (req, res) => {
  const project = await prisma.project.findFirst({ where: { id: parseId(req.params.id, 'Project'), userId: uid(req) } });
  if (!project) throw notFound('Project');
  res.json(project);
});

projectsRouter.put('/:id', async (req, res) => {
  const id = parseId(req.params.id, 'Project');
  const input = updateProjectSchema.parse(req.body);
  const { count } = await prisma.project.updateMany({ where: { id, userId: uid(req) }, data: input });
  if (count === 0) throw notFound('Project');
  res.json(await prisma.project.findUniqueOrThrow({ where: { id } }));
});

projectsRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.project.deleteMany({ where: { id: parseId(req.params.id, 'Project'), userId: uid(req) } });
  if (count === 0) throw notFound('Project');
  res.status(204).end();
});

projectsRouter.use('/:id/tasks', tasksByProjectRouter);
