import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app, createProject, registerUser, resetDb } from './helpers';

beforeAll(resetDb);

describe('QA regression: malformed input must yield 400, never 500', () => {
  it('rejects unparseable dates in task list query', async () => {
    const u = await registerUser();
    const p = await createProject(u.auth);
    for (const q of ['dueFrom=2026-13-45', 'dueTo=bad', 'dueFrom=99999-01-01']) {
      const res = await request(app).get(`/api/projects/${p.id}/tasks?${q}`).set(u.auth);
      expect(res.status, q).toBe(400);
    }
  });

  it('rejects unparseable dueDate on task create', async () => {
    const u = await registerUser();
    const p = await createProject(u.auth);
    const res = await request(app).post(`/api/projects/${p.id}/tasks`).set(u.auth).send({ title: 't', dueDate: '99999-01-01' });
    expect(res.status).toBe(400);
  });

  it('rejects absurdly large page numbers', async () => {
    const u = await registerUser();
    const p = await createProject(u.auth);
    const res = await request(app).get(`/api/projects/${p.id}/tasks?page=99999999999999999999`).set(u.auth);
    expect(res.status).toBe(400);
  });

  it('rejects NUL bytes in text fields', async () => {
    const u = await registerUser();
    const p = await createProject(u.auth);
    expect((await request(app).post('/api/projects').set(u.auth).send({ name: 'a\u0000b' })).status).toBe(400);
    expect((await request(app).post(`/api/projects/${p.id}/tasks`).set(u.auth).send({ title: 'a\u0000b' })).status).toBe(400);
    expect((await request(app).get('/api/projects?q=%00').set(u.auth)).status).toBe(400);
  });
});

describe('QA regression: LIKE wildcards are matched literally', () => {
  it('q=% and q=_ do not match every row', async () => {
    const u = await registerUser();
    const p = await createProject(u.auth, { name: 'Plain' });
    await request(app).post(`/api/projects/${p.id}/tasks`).set(u.auth).send({ title: 'abc' });
    await request(app).post(`/api/projects/${p.id}/tasks`).set(u.auth).send({ title: '100% done' });
    for (const q of ['%', '_', '\']) {
      const tasks = await request(app).get(`/api/projects/${p.id}/tasks`).query({ q }).set(u.auth);
      expect(tasks.body.meta.total, q).toBe(q === '%' ? 1 : 0);
      const projects = await request(app).get('/api/projects').query({ q }).set(u.auth);
      expect(projects.body.data, q).toHaveLength(0);
    }
  });
});
