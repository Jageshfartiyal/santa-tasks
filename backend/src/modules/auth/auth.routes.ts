import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { requireAuth, uid } from '../../middleware/auth';
import { loginSchema, registerSchema } from './auth.schemas';
import * as service from './auth.service';

export const REFRESH_COOKIE = 'refresh_token';

// Clearing must repeat the attributes used to set the cookie, or browsers ignore it (SameSite=None needs Secure).
const cookieOptions = () => ({
  httpOnly: true,
  secure: env.COOKIE_CROSS_SITE || env.NODE_ENV === 'production',
  sameSite: env.COOKIE_CROSS_SITE ? ('none' as const) : ('lax' as const),
  path: '/api/auth',
});

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions(), maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000 });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}

export function authRouter(opts: { rateLimitMax?: number } = {}) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: opts.rateLimitMax ?? env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } }),
  });

  router.post('/register', limiter, async (req, res) => {
    const s = await service.register(registerSchema.parse(req.body));
    setRefreshCookie(res, s.refreshToken);
    res.status(201).json({ user: s.user, accessToken: s.accessToken });
  });

  router.post('/login', limiter, async (req, res) => {
    const s = await service.login(loginSchema.parse(req.body));
    setRefreshCookie(res, s.refreshToken);
    res.json({ user: s.user, accessToken: s.accessToken });
  });

  router.post('/refresh', async (req, res) => {
    try {
      const s = await service.refresh(req.cookies?.[REFRESH_COOKIE]);
      setRefreshCookie(res, s.refreshToken);
      res.json({ user: s.user, accessToken: s.accessToken });
    } catch (e) {
      clearRefreshCookie(res);
      throw e;
    }
  });

  router.post('/logout', async (req, res) => {
    await service.logout(req.cookies?.[REFRESH_COOKIE]);
    clearRefreshCookie(res);
    res.status(204).end();
  });

  router.get('/me', requireAuth, async (req, res) => {
    res.json({ user: await service.me(uid(req)) });
  });

  return router;
}
