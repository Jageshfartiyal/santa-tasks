import { z } from 'zod';
import { text } from '../../lib/text';

const email = text().trim().toLowerCase().email('Enter a valid email').max(254);

export const registerSchema = z.object({
  email,
  name: text().trim().min(1, 'Name is required').max(100),
  password: text()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a digit'),
});

export const loginSchema = z.object({
  email,
  password: text().min(1, 'Password is required').max(72),
});
