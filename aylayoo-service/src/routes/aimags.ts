import { Hono } from 'hono';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { aimags, places } from '../db/schema';
import type { AppEnv } from '../types';

export const aimagRoutes = new Hono<AppEnv>();

// GET /api/aimags  -> all 21 aimags + Ulaanbaatar
aimagRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(aimags).orderBy(asc(aimags.nameEn));
  return c.json({ data: rows });
});

// GET /api/aimags/:slug  -> one aimag with its places
aimagRoutes.get('/:slug', async (c) => {
  const db = getDb(c.env.DB);
  const [aimag] = await db.select().from(aimags).where(eq(aimags.slug, c.req.param('slug'))).limit(1);
  if (!aimag) return c.json({ error: 'Aimag not found' }, 404);

  const aimagPlaces = await db.select().from(places).where(eq(places.aimagId, aimag.id));
  return c.json({ data: { ...aimag, places: aimagPlaces } });
});
