# Santa Tasks - Task & Project Management System

A full-stack app where users register, log in, and manage their own projects and the tasks inside them, with filtering, sorting, pagination and a dashboard of counts.

## Overview

- **Auth:** register / login with bcrypt-hashed passwords, 15-minute JWT access tokens, rotating refresh tokens in an httpOnly cookie.
- **Projects:** CRUD with name, description, status (Active / Completed / Archived) and created date.
- **Tasks:** CRUD with title, description, status, priority, due date; server-side search, filters, sorting and pagination.
- **Dashboard:** total projects, total / pending / completed tasks, and a project list.
- **Ops:** helmet, rate-limited auth routes, CORS locked to one origin, structured JSON logs, `/api/health`, Swagger UI at `/docs`.

## Architecture

```
React SPA (Vite)  --/api-->  Express 5 API  --Prisma-->  PostgreSQL
 TanStack Query               modules/{auth,projects,tasks,stats}
 axios + 401 refresh          Zod validation, JWT middleware
```

- Monorepo with npm workspaces: `backend/` and `frontend/`.
- Each API module holds its schemas (Zod) and routes; shared pieces live in `config/`, `middleware/` and `lib/`.
- Ownership is enforced in every query via `project.userId`. Another user's resource returns **404**, so ids cannot be probed.
- Filtering, sorting and pagination run in SQL (Prisma `where` / `orderBy` / `skip` / `take`). Priority sorts by a `priority_rank` smallint (LOW=1, MEDIUM=2, HIGH=3) so the order is not alphabetical.
- The access token is kept in memory on the client. On a 401 the axios interceptor performs one single-flight refresh and retries the request; if the refresh fails the user is logged out and sent to `/login`. On page load the app tries a silent refresh.
- Task filters and page number live in URL query params, so views are shareable and survive reloads.

## Setup

Prerequisites: Node 20+ (developed on 24), Docker.

```bash
docker compose up -d db                 # Postgres 16 on localhost:5433 (DBs: santa, santa_test)
cp backend/.env.example backend/.env    # review values; set a real JWT_SECRET
cp frontend/.env.example frontend/.env
npm i                                   # also runs prisma generate
npm run migrate                         # prisma migrate deploy
npm run seed                            # demo user + sample data
npm run dev                             # API http://localhost:4000, web http://localhost:5173
```

Demo login: `demo@santa.dev` / `Demo1234` (shown on the login page; override or hide via `VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD`, see `frontend/.env.example`).

Other scripts (from the repo root): `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Docker Postgres is mapped to host port **5433** to avoid clashing with a locally installed Postgres on 5432.

## Environment variables

`backend/.env` (validated at startup; the process exits with a clear message if `DATABASE_URL` or `JWT_SECRET` is missing):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | required | Postgres connection string |
| `DATABASE_URL_TEST` | local `santa_test` | Database used by the backend tests |
| `JWT_SECRET` | required (16+ chars) | Signs access tokens |
| `ACCESS_TOKEN_TTL` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Refresh token lifetime |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | The only origin allowed by CORS |
| `COOKIE_CROSS_SITE` | `false` | `true` makes the refresh cookie `SameSite=None; Secure` (frontend and API on different sites) |
| `AUTH_RATE_LIMIT_MAX` | `20` | Auth requests per IP per 15 minutes |
| `PORT`, `NODE_ENV`, `LOG_LEVEL` | `4000`, `development`, `info` | Runtime |

`frontend/.env`: `VITE_API_URL` is the API base URL. Leave it empty in development (Vite proxies `/api` to `localhost:4000`).

## Database setup

Schema and migrations are managed by Prisma (`backend/prisma`). Tables: `users`, `refresh_tokens` (hashed, rotated), `projects`, `tasks`, with cascading deletes and indexes on the common filter columns.

- Apply migrations: `npm run migrate`
- Create a migration after editing the schema: `npm run migrate:dev -w backend -- --name <name>`
- Seed (idempotent): `npm run seed`

## API documentation

Interactive Swagger UI at **http://localhost:4000/docs** (source: `backend/openapi.yaml`). Summary:

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/refresh`, `/logout` | refresh uses the httpOnly cookie |
| GET | `/api/auth/me` | current user |
| GET, POST | `/api/projects` | `?status`, `?q` |
| GET, PUT, DELETE | `/api/projects/:id` | delete cascades to tasks |
| GET, POST | `/api/projects/:id/tasks` | `q, status, priority, dueFrom, dueTo, overdue, sortBy, order, page, limit` |
| GET, PUT, DELETE | `/api/tasks/:id` | |
| GET | `/api/stats` | `{projects, totalTasks, pendingTasks, completedTasks}` |
| GET | `/api/health` | checks the database |

Errors always look like `{"error":{"code","message","details?"}}` (400 validation with per-field `details`, 401, 404, 409, 429, 500).

## Tests

```bash
npm test                  # backend (Vitest + Supertest, real Postgres) then frontend (Vitest + RTL)
npm test -w backend
npm test -w frontend
```

The backend suite uses the `santa_test` database (created by the compose init script) and applies migrations itself. It never touches the dev database. CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build against a Postgres service container.

## Deployment

Deploy-ready but not deployed. Placeholders:

- Frontend: `https://<your-frontend-url>`
- API: `https://<your-api-url>` (Swagger at `/docs`)

Steps:
1. Provision Postgres; set `DATABASE_URL`, a strong `JWT_SECRET`, `FRONTEND_ORIGIN=https://<your-frontend-url>`, and `COOKIE_CROSS_SITE=true` if the two apps are on different sites.
2. API image (from the repo root): `docker build -f backend/Dockerfile -t santa-api .`. The container runs `prisma migrate deploy` on start. Behind a proxy it trusts one hop for client IPs.
3. Web image: `docker build -f frontend/Dockerfile --build-arg VITE_API_URL=https://<your-api-url> -t santa-web .` (nginx with SPA fallback). Or deploy `frontend/dist` to any static host.

## Assumptions

- The frontend is React (the spec's framework choice was open).
- `dueDate` is date-only; `dueFrom` / `dueTo` are inclusive; "overdue" means due before today (UTC) and not Done.
- Password: 8-72 characters with at least one letter and one digit.
- PUT endpoints accept any subset of fields (partial update).
- "Pending" tasks = To do + In progress.
- Emails are case-insensitive (stored lowercased).

## Known limitations

- No email verification, password reset, OAuth, roles or sharing.
- Rate limiting is in-process memory (per instance); use a shared store if you scale horizontally.
- Refresh-token reuse revokes all of that user's sessions (deliberate, but can log out other devices).
- Expired/revoked refresh tokens are not purged automatically.
- No end-to-end browser tests; frontend tests mock the API.
- Two browser tabs refreshing at the same moment can trip refresh-token reuse detection and log the user out.
- "Overdue" is computed against the UTC date, not the user's local date.
- `requireAuth` only verifies the JWT; it does not re-check that the user still exists (a deleted user's token works until it expires).
