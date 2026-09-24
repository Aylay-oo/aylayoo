import { Hono } from 'hono';
import { asc } from 'drizzle-orm';
import { getDb } from '../db/client';
import { facts, teamMembers } from '../db/schema';
import type { AppEnv } from '../types';

export const contentRoutes = new Hono<AppEnv>();

// GET /api/facts
contentRoutes.get('/facts', async (c) => {
  const db = getDb(c.env.DB);
  return c.json({ data: await db.select().from(facts).orderBy(asc(facts.sortOrder)) });
});

// GET /api/team
contentRoutes.get('/team', async (c) => {
  const db = getDb(c.env.DB);
  return c.json({ data: await db.select().from(teamMembers).orderBy(asc(teamMembers.sortOrder)) });
});

// GET /api/images/guides/abc.jpg  -> streams the image from R2
contentRoutes.get('/images/:key{.+}', async (c) => {
  const object = await c.env.BUCKET.get(c.req.param('key'));
  if (!object) return c.json({ error: 'Image not found' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
});
