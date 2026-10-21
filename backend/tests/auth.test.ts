import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { app, registerUser, resetDb } from './helpers';

const cookieValue = (cookies: string[]) => cookies.find((c) => c.startsWith('refresh_token='))!.split(';')[0];

beforeAll(resetDb);

describe('registration', () => {
  it('registers, hashes the password with bcrypt, never returns the hash; duplicate email -> 409', async () => {
    const body = { email: 'Dup@Example.com', name: 'Dup', password: 'Password1' };
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    expect(res.body.user.email).toBe('dup@example.com');

    const row = await prisma.user.findUniqueOrThrow({ where: { email: 'dup@example.com' } });
    expect(row.passwordHash).toMatch(/^\$2[aby]\$(1\d|[2-3]\d)\$/);

    const again = await request(app).post('/api/auth/register').send({ ...body, email: 'dup@example.com' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects weak passwords with per-field details', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@example.com', name: 'X', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('password');
  });
});

describe('login', () => {
  it('logs in and sets an httpOnly refresh cookie; wrong password -> 401', async () => {
    const u = await registerUser();
    const ok = await request(app).post('/api/auth/login').send({ email: u.email, password: 'Password1' });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();
    const cookie = (ok.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('refresh_token='))!;
    expect(cookie).toMatch(/HttpOnly/i);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ok.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(u.email);

    const bad = await request(app).post('/api/auth/login').send({ email: u.email, password: 'Wrong1234' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('token protection', () => {
  it('returns 401 with no token, a garbage token and an expired token on every protected route', async () => {
    const u = await registerUser();
    const expired = jwt.sign({ sub: u.id }, process.env.JWT_SECRET!, { expiresIn: -10 });
    const routes = ['/api/auth/me', '/api/projects', '/api/stats', '/api/tasks/00000000-0000-0000-0000-000000000000'];
    for (const r of routes) {
      for (const header of [undefined, 'Bearer garbage', `Bearer ${expired}`]) {
        const req = request(app).get(r);
        if (header) req.set('Authorization', header);
        const res = await req;
        expect(res.status, `${r} ${header}`).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
      }
    }
  });
});

describe('refresh tokens', () => {
  it('rotates on use, rejects reuse, and logout revokes', async () => {
    const u = await registerUser();
    const first = cookieValue(u.cookies);

    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', first);
    expect(r1.status).toBe(200);
    expect(r1.body.accessToken).toBeTruthy();
    const second = cookieValue(r1.headers['set-cookie'] as unknown as string[]);
    expect(second).not.toBe(first);

    // reuse of the rotated token is rejected (and burns the session family)
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', first);
    expect(reuse.status).toBe(401);
    const afterReuse = await request(app).post('/api/auth/refresh').set('Cookie', second);
    expect(afterReuse.status).toBe(401);

    const u2 = await registerUser();
    const c = cookieValue(u2.cookies);
    expect((await request(app).post('/api/auth/logout').set('Cookie', c)).status).toBe(204);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', c)).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh')).status).toBe(401);
  });
});

describe('rate limiting', () => {
  it('returns 429 in the standard shape once the auth limit is exceeded', async () => {
    const limited = createApp({ authRateLimitMax: 2 });
    const send = () => request(limited).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'x' });
    await send();
    await send();
    const res = await send();
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('system', () => {
  it('serves /api/health, /docs and security headers', async () => {
    const h = await request(app).get('/api/health');
    expect(h.status).toBe(200);
    expect(h.headers['x-content-type-options']).toBe('nosniff');
    expect((await request(app).get('/docs/')).status).toBe(200);
    expect((await request(app).get('/api/nope')).body.error.code).toBe('NOT_FOUND');
  });
});
