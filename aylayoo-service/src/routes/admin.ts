import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { admins, contactMessages, facts, guides, places, teamMembers } from '../db/schema';
import { createToken, requireAdmin } from '../lib/auth';
import { getFile, parseId, readJson, uploadImage } from '../lib/http';
import { verifyPassword } from '../lib/password';
import { rateLimit } from '../lib/rate-limit';
import {
  factSchema, guideStatusSchema, loginSchema, placeSchema, teamMemberSchema,
} from '../lib/validators';
import type { AppEnv } from '../types';
import { attachAimags } from './guides';

export const adminRoutes = new Hono<AppEnv>();

// POST /api/admin/login  { email, password }  -> { token }
// (registered BEFORE requireAdmin, so it stays public)
// The 10-per-hour cap is brute-force protection for password auth.
adminRoutes.post('/login', rateLimit({ name: 'login', limit: 10, windowSeconds: 3600 }), async (c) => {
  const body = await readJson(c, loginSchema);
  if ('error' in body) return body.error;

  const db = getDb(c.env.DB);
  const [admin] = await db.select().from(admins).where(eq(admins.email, body.data.email)).limit(1);
  const ok = admin ? await verifyPassword(body.data.password, admin.passwordHash) : false;
  if (!admin || !ok) return c.json({ error: 'Wrong email or password' }, 401);

  return c.json({ token: await createToken(admin.id, c.env.JWT_SECRET) });
});

// Everything below needs:  Authorization: Bearer <token>
adminRoutes.use('*', requireAdmin);

// ---------- Guides ----------
// GET /api/admin/guides?status=pending
adminRoutes.get('/guides', async (c) => {
  const db = getDb(c.env.DB);
  const status = c.req.query('status');
  const valid = status === 'pending' || status === 'approved' || status === 'rejected';
  const rows = await db.select().from(guides)
    .where(valid ? eq(guides.status, status) : undefined)
    .orderBy(desc(guides.createdAt));
  return c.json({ data: await attachAimags(db, rows) });
});

// PATCH /api/admin/guides/:id/status  { status: "approved" | "rejected" | "pending" }
adminRoutes.patch('/guides/:id/status', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);
  const body = await readJson(c, guideStatusSchema);
  if ('error' in body) return body.error;

  const db = getDb(c.env.DB);
  const updated = await db.update(guides).set({ status: body.data.status })
    .where(eq(guides.id, id)).returning({ id: guides.id, status: guides.status });
  if (updated.length === 0) return c.json({ error: 'Guide not found' }, 404);
  return c.json({ data: updated[0] });
});

// DELETE /api/admin/guides/:id
adminRoutes.delete('/guides/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);
  const db = getDb(c.env.DB);
  const deleted = await db.delete(guides).where(eq(guides.id, id)).returning({ id: guides.id });
  if (deleted.length === 0) return c.json({ error: 'Guide not found' }, 404);
  return c.json({ message: 'Deleted' });
});

// ---------- Places ----------
adminRoutes.post('/places', async (c) => {
  const body = await readJson(c, placeSchema);
  if ('error' in body) return body.error;
  const db = getDb(c.env.DB);
  const [created] = await db.insert(places).values(body.data).returning();
  return c.json({ data: created }, 201);
});

adminRoutes.put('/places/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);
  const body = await readJson(c, placeSchema.partial());
  if ('error' in body) return body.error;
  const db = getDb(c.env.DB);
  const updated = await db.update(places).set(body.data).where(eq(places.id, id)).returning();
  if (updated.length === 0) return c.json({ error: 'Place not found' }, 404);
  return c.json({ data: updated[0] });
});

adminRoutes.delete('/places/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);
  const db = getDb(c.env.DB);
  const deleted = await db.delete(places).where(eq(places.id, id)).returning({ id: places.id });
  if (deleted.length === 0) return c.json({ error: 'Place not found' }, 404);
  return c.json({ message: 'Deleted' });
});

// ---------- Facts ----------
adminRoutes.post('/facts', async (c) => {
  const body = await readJson(c, factSchema);
  if ('error' in body) return body.error;
  const db = getDb(c.env.DB);
  const [created] = await db.insert(facts).values(body.data).returning();
  return c.json({ data: created }, 201);
});

adminRoutes.put('/facts/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);
  const body = await readJson(c, factSchema.partial());
  if ('error' in body) return body.error;
  const db = getDb(c.env.DB);
  const updated = await db.update(facts).set(body.data).where(eq(facts.id, id)).returning();
  if (updated.length === 0) return c.json({ error: 'Fact not found' }, 404);
  return c.json({ data: updated[0] });
});

adminRoutes.delete('/facts/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);
  const db = getDb(c.env.DB);
  const deleted = await db.delete(facts).where(eq(facts.id, id)).returning({ id: facts.id });
  if (deleted.length === 0) return c.json({ error: 'Fact not found' }, 404);
  return c.json({ message: 'Deleted' });
});

// ---------- Team ----------
adminRoutes.post('/team', async (c) => {
  const body = await readJson(c, teamMemberSchema);
  if ('error' in body) return body.error;
  const db = getDb(c.env.DB);
  const [created] = await db.insert(teamMembers).values(body.data).returning();
  return c.json({ data: created }, 201);
});

adminRoutes.put('/team/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);
  const body = await readJson(c, teamMemberSchema.partial());
  if ('error' in body) return body.error;
  const db = getDb(c.env.DB);
  const updated = await db.update(teamMembers).set(body.data).where(eq(teamMembers.id, id)).returning();
  if (updated.length === 0) return c.json({ error: 'Team member not found' }, 404);
  return c.json({ data: updated[0] });
});

adminRoutes.delete('/team/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);
  const db = getDb(c.env.DB);
  const deleted = await db.delete(teamMembers).where(eq(teamMembers.id, id)).returning({ id: teamMembers.id });
  if (deleted.length === 0) return c.json({ error: 'Team member not found' }, 404);
  return c.json({ message: 'Deleted' });
});

// ---------- Messages & uploads ----------
// GET /api/admin/messages
adminRoutes.get('/messages', async (c) => {
  const db = getDb(c.env.DB);
  return c.json({ data: await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)) });
});

// POST /api/admin/upload   (multipart/form-data, field "file", optional field "folder")
// Use the returned url in places.images or team photoUrl.
adminRoutes.post('/upload', async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form && getFile(form, 'file');
  if (!file) return c.json({ error: 'Send an image in the "file" field' }, 400);
  const folder = String(form?.get('folder') ?? 'misc').replace(/[^a-z0-9-]/gi, '') || 'misc';
  const upload = await uploadImage(c.env.BUCKET, file, folder);
  if ('error' in upload) return c.json({ error: upload.error }, 400);
  return c.json({ data: { url: upload.url } }, 201);
});
