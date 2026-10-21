import type { RequestHandler } from 'express';
import { unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized());
  try {
    req.userId = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
};

/** For handlers behind requireAuth. */
export function uid(req: { userId?: string }): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
