import { Router } from 'express';
import type { Prisma, Task } from '@prisma/client';
import { notFound } from '../../lib/errors';
import { parseId } from '../../lib/ids';
import { prisma } from '../../lib/prisma';
import { uid } from '../../middleware/auth';
import { PRIORITY_RANK, createTaskSchema, listTasksQuery, toDate, updateTaskSchema } from './tasks.schemas';

const toDto = ({ priorityRank: _rank, dueDate, ...t }: Task) => ({
  ...t,
  dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
});

/** Mounted at /projects/:id/tasks */
export const tasksByProjectRouter = Router({ mergeParams: true });

async function ownedProjectId(raw: unknown, userId: string) {
  const id = parseId(raw, 'Project');
  const project = await prisma.project.findFirst({ where: { id, userId }, select: { id: true } });
  if (!project) throw notFound('Project');
  return id;
}

tasksByProjectRouter.get('/', async (req, res) => {
  const projectId = await ownedProjectId((req.params as Record<string, string>).id, uid(req));
  const p = listTasksQuery.parse(req.query);

  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
  const due: Prisma.DateTimeNullableFilter = {};
  if (p.dueFrom) due.gte = toDate(p.dueFrom);
  if (p.dueTo) due.lte = toDate(p.dueTo);
  if (p.overdue) due.lt = today;

  const where: Prisma.TaskWhereInput = {
    projectId,
    title: p.q ? { contains: p.q, mode: 'insensitive' } : undefined,
    status: p.status,
    priority: p.priority,
    dueDate: Object.keys(due).length ? due : undefined,
    // overdue = past due and not finished
    AND: p.overdue ? [{ status: { not: 'DONE' } }] : undefined,
  };

  const primary: Prisma.TaskOrderByWithRelationInput =
    p.sortBy === 'priority'
      ? { priorityRank: p.order }
      : p.sortBy === 'dueDate'
        ? { dueDate: { sort: p.order, nulls: 'last' } }
        : { createdAt: p.order };

  const [total, rows] = await prisma.$transaction([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: [primary, { createdAt: 'desc' }, { id: 'asc' }],
      skip: (p.page - 1) * p.limit,
      take: p.limit,
    }),
  ]);

  res.json({
    data: rows.map(toDto),
    meta: { page: p.page, limit: p.limit, total, totalPages: Math.ceil(total / p.limit) },
  });
});

tasksByProjectRouter.post('/', async (req, res) => {
  const projectId = await ownedProjectId((req.params as Record<string, string>).id, uid(req));
  const input = createTaskSchema.parse(req.body);
  const task = await prisma.task.create({
    data: {
      projectId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      priorityRank: PRIORITY_RANK[input.priority],
      dueDate: input.dueDate ? toDate(input.dueDate) : null,
    },
  });
  res.status(201).json(toDto(task));
});

/** Mounted at /tasks */
export const tasksRouter = Router();

const ownedTask = (id: string, userId: string) => ({ id, project: { userId } });

tasksRouter.get('/:id', async (req, res) => {
  const task = await prisma.task.findFirst({ where: ownedTask(parseId(req.params.id, 'Task'), uid(req)) });
  if (!task) throw notFound('Task');
  res.json(toDto(task));
});

tasksRouter.put('/:id', async (req, res) => {
  const id = parseId(req.params.id, 'Task');
  const input = updateTaskSchema.parse(req.body);
  const { dueDate, ...rest } = input;
  const { count } = await prisma.task.updateMany({
    where: ownedTask(id, uid(req)),
    data: {
      ...rest,
      ...(rest.priority ? { priorityRank: PRIORITY_RANK[rest.priority] } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? toDate(dueDate) : null } : {}),
    },
  });
  if (count === 0) throw notFound('Task');
  res.json(toDto(await prisma.task.findUniqueOrThrow({ where: { id } })));
});

tasksRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.task.deleteMany({ where: ownedTask(parseId(req.params.id, 'Task'), uid(req)) });
  if (count === 0) throw notFound('Task');
  res.status(204).end();
});
