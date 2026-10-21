import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

export const app = createApp();

export async function resetDb() {
  await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
}

let n = 0;
export async function registerUser(name = 'Test User') {
  const email = `user${Date.now()}${n++}@example.com`;
  const res = await request(app).post('/api/auth/register').send({ email, name, password: 'Password1' });
  return {
    email,
    token: res.body.accessToken as string,
    id: res.body.user.id as string,
    cookies: res.headers['set-cookie'] as unknown as string[],
    auth: { Authorization: `Bearer ${res.body.accessToken}` },
  };
}

export async function createProject(auth: Record<string, string>, body: object = { name: 'Proj' }) {
  const res = await request(app).post('/api/projects').set(auth).send(body);
  return res.body as { id: string };
}

export async function createTask(auth: Record<string, string>, projectId: string, body: object) {
  const res = await request(app).post(`/api/projects/${projectId}/tasks`).set(auth).send(body);
  return res.body as { id: string };
}
