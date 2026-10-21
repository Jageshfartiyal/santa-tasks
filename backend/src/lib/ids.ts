import { z } from 'zod';
import { notFound } from './errors';

const uuid = z.string().uuid();

/** Malformed ids are treated as "not found" so callers cannot distinguish them from foreign ids. */
export function parseId(raw: unknown, what: string): string {
  const r = uuid.safeParse(raw);
  if (!r.success) throw notFound(what);
  return r.data;
}
