import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { uid } from '../../middleware/auth';

export const statsRouter = Router();

statsRouter.get('/', async (req, res) => {
  const userId = uid(req);
  const [projects, grouped] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    prisma.task.groupBy({ by: ['status'], where: { project: { userId } }, _count: { _all: true } }),
  ]);
  const count = (s: string) => grouped.find((g) => g.status === s)?._count._all ?? 0;
  const completedTasks = count('DONE');
  const pendingTasks = count('TODO') + count('IN_PROGRESS');
  res.json({ projects, totalTasks: completedTasks + pendingTasks, pendingTasks, completedTasks });
});
