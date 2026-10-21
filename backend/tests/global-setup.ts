import { execSync } from 'node:child_process';
import dotenv from 'dotenv';

export default function globalSetup() {
  dotenv.config({ quiet: true });
  const url = process.env.DATABASE_URL_TEST ?? 'postgresql://santa:santa@localhost:5433/santa_test?schema=public';
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: { ...process.env, DATABASE_URL: url } });
}
