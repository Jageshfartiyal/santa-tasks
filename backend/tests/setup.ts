import dotenv from 'dotenv';

// Runs before any test module is imported: point the app at the dedicated test database.
dotenv.config({ quiet: true });
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://santa:santa@localhost:5433/santa_test?schema=public';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
