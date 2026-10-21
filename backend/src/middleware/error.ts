import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError, notFound } from '../lib/errors';
import { logger } from '../lib/logger';

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound('Route'));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const send = (status: number, code: string, message: string, details?: unknown) =>
    res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}) } });

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return send(400, 'VALIDATION_ERROR', 'Invalid input', details);
  }
  if (err instanceof AppError) return send(err.status, err.code, err.message, err.details);
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    return send(404, 'NOT_FOUND', 'Resource not found');
  }
  const status = (err as { status?: number }).status;
  if (status === 400 || (err as { type?: string }).type === 'entity.parse.failed') {
    return send(400, 'BAD_REQUEST', 'Malformed request body');
  }
  if (status === 413) return send(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');

  logger.error({ err }, 'unhandled error');
  return send(500, 'INTERNAL_ERROR', 'Something went wrong');
};
