import { Hono } from 'hono';
import { getDb } from '../db/client';
import { contactMessages } from '../db/schema';
import { readJson } from '../lib/http';
import { rateLimit } from '../lib/rate-limit';
import { contactSchema } from '../lib/validators';
import type { AppEnv } from '../types';

export const contactRoutes = new Hono<AppEnv>();

// POST /api/contact   { name, email, message }
contactRoutes.post('/', rateLimit({ name: 'contact', limit: 5, windowSeconds: 3600 }), async (c) => {
  const body = await readJson(c, contactSchema);
  if ('error' in body) return body.error;

  const db = getDb(c.env.DB);
  await db.insert(contactMessages).values(body.data);
  return c.json({ message: 'Thank you! We received your message.' }, 201);
});
