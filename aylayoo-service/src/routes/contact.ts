import { Hono } from 'hono';
import { getDb } from '../db/client';
import { contactMessages } from '../db/schema';
import { readJson } from '../lib/http';
import { rateLimit } from '../lib/rate-limit';
import { contactSchema } from '../lib/validators';
import type { AppEnv } from '../types';

export const contactRoutes = new Hono<AppEnv>();

// POST /api/contact
//   { name, message, email and/or phone, guideId?, subject?, kind? }
// `kind` is "contact" when the dialog was opened from a guide and "booking" when it was
// opened from a trip; `subject` carries the guide or trip name it was opened with.
contactRoutes.post('/', rateLimit({ name: 'contact', limit: 5, windowSeconds: 3600 }), async (c) => {
  const body = await readJson(c, contactSchema);
  if ('error' in body) return body.error;
  const { email, phone, guideId, subject, ...rest } = body.data;

  const db = getDb(c.env.DB);
  await db.insert(contactMessages).values({
    ...rest,
    // The schema accepts "" for whichever of the two the visitor left blank; store a null
    // rather than an empty string so "has an email" stays a simple null check.
    email: email || null,
    phone: phone || null,
    guideId: guideId ?? null,
    subject: subject || null,
  });
  return c.json({ message: 'Thank you! We received your message.' }, 201);
});
