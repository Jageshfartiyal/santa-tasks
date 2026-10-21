import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { app, createProject, createTask, registerUser, resetDb } from './helpers';

beforeAll(resetDb);

describe('projects', () => {
  it('supports full CRUD and validates input', async () => {
    const u = await registerUser();
    const created = await request(app).post('/api/projects').set(u.auth).send({ name: 'Alpha', description: 'd' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Alpha', status: 'ACTIVE', description: 'd' });
    expect(created.body.createdAt).toBeTruthy();
    const id = created.body.id;

    const list = await request(app).get('/api/projects?q=alp').set(u.auth);
    expect(list.body.data).toHaveLength(1);
    expect((await request(app).get('/api/projects?status=ARCHIVED').set(u.auth)).body.data).toHaveLength(0);

    const upd = await request(app).put(`/api/projects/${id}`).set(u.auth).send({ status: 'COMPLETED' });
    expect(upd.status).toBe(200);
    expect(upd.body.status).toBe('COMPLETED');
    expect(upd.body.name).toBe('Alpha');

    const bad = await request(app).post('/api/projects').set(u.auth).send({ name: '', status: 'NOPE' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['name', 'status']);

    expect((await request(app).delete(`/api/projects/${id}`).set(u.auth)).status).toBe(204);
    expect((await request(app).get(`/api/projects/${id}`).set(u.auth)).status).toBe(404);
  });

  it('hides other users resources behind 404 for read, update and delete', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const project = await createProject(a.auth);
    const task = await createTask(a.auth, project.id, { title: 'secret' });

    const attempts = [
      request(app).get(`/api/projects/${project.id}`).set(b.auth),
      request(app).put(`/api/projects/${project.id}`).set(b.auth).send({ name: 'hax' }),
      request(app).delete(`/api/projects/${project.id}`).set(b.auth),
      request(app).get(`/api/projects/${project.id}/tasks`).set(b.auth),
      request(app).post(`/api/projects/${project.id}/tasks`).set(b.auth).send({ title: 'x' }),
      request(app).get(`/api/tasks/${task.id}`).set(b.auth),
      request(app).put(`/api/tasks/${task.id}`).set(b.auth).send({ title: 'hax' }),
      request(app).delete(`/api/tasks/${task.id}`).set(b.auth),
    ];
    for (const res of await Promise.all(attempts)) expect(res.status).toBe(404);

    // untouched, and not in b's list
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).title).toBe('secret');
    expect((await request(app).get('/api/projects').set(b.auth)).body.data).toHaveLength(0);
  });

  it('cascades deletion of a project to its tasks', async () => {
    const u = await registerUser();
    const p = await createProject(u.auth);
    const t = await createTask(u.auth, p.id, { title: 'one' });
    await createTask(u.auth, p.id, { title: 'two' });
    await request(app).delete(`/api/projects/${p.id}`).set(u.auth).expect(204);
    expect(await prisma.task.count({ where: { projectId: p.id } })).toBe(0);
    expect((await request(app).get(`/api/tasks/${t.id}`).set(u.auth)).status).toBe(404);
  });
});

describe('tasks', () => {
  it('creates tasks with defaults and rejects invalid input', async () => {
    const u = await registerUser();
    const p = await createProject(u.auth);
    const ok = await request(app).post(`/api/projects/${p.id}/tasks`).set(u.auth).send({ title: 'Do it', dueDate: '2030-01-31' });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ status: 'TODO', priority: 'MEDIUM', dueDate: '2030-01-31' });
    expect(ok.body.priorityRank).toBeUndefined();

    const cases = [{ title: '' }, { title: 'x', status: 'BOGUS' }, { title: 'x', priority: 'URGENT' }, { title: 'x', dueDate: '2030-02-31' }, {}];
    for (const body of cases) {
      const res = await request(app).post(`/api/projects/${p.id}/tasks`).set(u.auth).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }

    const upd = await request(app).put(`/api/tasks/${ok.body.id}`).set(u.auth).send({ status: 'DONE', dueDate: null, priority: 'HIGH' });
    expect(upd.body).toMatchObject({ status: 'DONE', dueDate: null, priority: 'HIGH' });
    expect((await request(app).put(`/api/tasks/${ok.body.id}`).set(u.auth).send({ status: 'x' })).status).toBe(400);
  });

  describe('list', () => {
    let auth: Record<string, string>;
    let pid: string;
    const list = async (qs: string) => (await request(app).get(`/api/projects/${pid}/tasks?${qs}`).set(auth)).body;
    const titles = (b: { data: { title: string }[] }) => b.data.map((t) => t.title);

    beforeAll(async () => {
      const u = await registerUser();
      auth = u.auth;
      pid = (await createProject(auth)).id;
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      const seed = [
        { title: 'Alpha report', priority: 'LOW', status: 'TODO', dueDate: '2030-01-10' },
        { title: 'beta review', priority: 'HIGH', status: 'IN_PROGRESS', dueDate: '2030-01-20' },
        { title: 'Gamma ALPHA', priority: 'MEDIUM', status: 'DONE', dueDate: yesterday },
        { title: 'Delta', priority: 'HIGH', status: 'TODO', dueDate: yesterday },
        { title: 'Epsilon', priority: 'MEDIUM', status: 'TODO' },
      ];
      for (const t of seed) await createTask(auth, pid, t);
    });

    it('filters by q, status, priority and inclusive due range', async () => {
      expect(titles(await list('q=alpha&sortBy=dueDate&order=asc')).sort()).toEqual(['Alpha report', 'Gamma ALPHA']);
      expect((await list('status=TODO')).meta.total).toBe(3);
      expect(titles(await list('priority=HIGH&sortBy=dueDate&order=desc'))).toEqual(['beta review', 'Delta']);
      expect(titles(await list('dueFrom=2030-01-10&dueTo=2030-01-20&sortBy=dueDate&order=asc'))).toEqual(['Alpha report', 'beta review']);
    });

    it('overdue excludes finished and undated tasks', async () => {
      expect(titles(await list('overdue=true'))).toEqual(['Delta']);
    });

    it('sorts priority by rank not alphabetically, and dueDate with nulls last', async () => {
      const asc = (await list('sortBy=priority&order=asc')).data.map((t: { priority: string }) => t.priority);
      expect(asc).toEqual(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'HIGH']);
      const desc = (await list('sortBy=priority&order=desc')).data.map((t: { priority: string }) => t.priority);
      expect(desc).toEqual(['HIGH', 'HIGH', 'MEDIUM', 'MEDIUM', 'LOW']);
      const due = await list('sortBy=dueDate&order=asc');
      expect(due.data.at(-1).title).toBe('Epsilon');
    });

    it('paginates in SQL with accurate meta and validates bounds', async () => {
      const p1 = await list('limit=2&page=1&sortBy=createdAt&order=asc');
      expect(p1.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
      expect(titles(p1)).toEqual(['Alpha report', 'beta review']);
      const p3 = await list('limit=2&page=3&sortBy=createdAt&order=asc');
      expect(titles(p3)).toEqual(['Epsilon']);
      expect((await request(app).get(`/api/projects/${pid}/tasks?limit=51`).set(auth)).status).toBe(400);
      expect((await request(app).get(`/api/projects/${pid}/tasks?sortBy=title`).set(auth)).status).toBe(400);
    });
  });
});

describe('stats', () => {
  it('counts only the callers data', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const pa1 = await createProject(a.auth);
    await createProject(a.auth);
    await createTask(a.auth, pa1.id, { title: '1', status: 'TODO' });
    await createTask(a.auth, pa1.id, { title: '2', status: 'IN_PROGRESS' });
    await createTask(a.auth, pa1.id, { title: '3', status: 'DONE' });
    const pb = await createProject(b.auth);
    await createTask(b.auth, pb.id, { title: 'b', status: 'DONE' });

    const sa = await request(app).get('/api/stats').set(a.auth);
    expect(sa.body).toEqual({ projects: 2, totalTasks: 3, pendingTasks: 2, completedTasks: 1 });
    const sb = await request(app).get('/api/stats').set(b.auth);
    expect(sb.body).toEqual({ projects: 1, totalTasks: 1, pendingTasks: 0, completedTasks: 1 });
  });
});
