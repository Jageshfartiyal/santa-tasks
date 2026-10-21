import { z } from 'zod';

const NUL = String.fromCharCode(0);

/** String that rejects NUL bytes (Postgres cannot store them and would otherwise 500). */
export const text = () => z.string().regex(new RegExp(`^[^${NUL}]*$`), 'Must not contain null characters');

/** Escape LIKE/ILIKE wildcards and the escape character so user input matches literally. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');
