import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error('bad payload');
  return payload.sub;
}

export const newRefreshToken = () => crypto.randomBytes(48).toString('hex');
export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
