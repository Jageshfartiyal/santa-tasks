import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { AppError, unauthorized } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { hashToken, newRefreshToken, signAccessToken } from '../../lib/tokens';

const BCRYPT_COST = 10;
// Compared against when the email is unknown so login timing does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

type PublicUser = { id: string; email: string; name: string; createdAt: Date };
const publicUser = (u: PublicUser): PublicUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  createdAt: u.createdAt,
});

async function issueSession(user: PublicUser) {
  const refreshToken = newRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    },
  });
  return { user, accessToken: signAccessToken(user.id), refreshToken };
}

export async function register(input: { email: string; name: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  try {
    const user = await prisma.user.create({ data: { email: input.email, name: input.name, passwordHash } });
    return await issueSession(publicUser(user));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw e;
  }
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Invalid email or password');
  return issueSession(publicUser(user));
}

/** Rotates the refresh token. Presenting an already-revoked token revokes the user's whole session family. */
export async function refresh(token: string | undefined) {
  if (!token) throw unauthorized('Missing refresh token');
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record) throw unauthorized('Invalid refresh token');
  if (record.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('Invalid refresh token');
  }
  if (record.expiresAt <= new Date()) throw unauthorized('Refresh token expired');
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: record.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count !== 1) throw unauthorized('Invalid refresh token');
  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) throw unauthorized();
  return issueSession(publicUser(user));
}

export async function logout(token: string | undefined) {
  if (!token) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  return publicUser(user);
}
