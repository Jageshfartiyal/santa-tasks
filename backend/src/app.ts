import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './modules/auth/auth.routes';
import { projectsRouter } from './modules/projects/projects.routes';
import { statsRouter } from './modules/stats/stats.routes';
import { tasksRouter } from './modules/tasks/tasks.routes';

export function createApp(opts: { authRateLimitMax?: number } = {}) {
  const app = express();
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Swagger UI needs inline scripts, so it gets its own helmet config without CSP.
  const spec = YAML.parse(fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8'));
  app.use('/docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(spec));

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'up' });
    } catch {
      res.status(503).json({ status: 'error', db: 'down' });
    }
  });

  app.use('/api/auth', authRouter({ rateLimitMax: opts.authRateLimitMax }));
  app.use('/api/projects', requireAuth, projectsRouter);
  app.use('/api/tasks', requireAuth, tasksRouter);
  app.use('/api/stats', requireAuth, statsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
