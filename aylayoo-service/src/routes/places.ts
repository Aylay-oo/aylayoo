import { Hono } from 'hono';
import { and, eq, getTableColumns, type SQL } from 'drizzle-orm';
import { getDb } from '../db/client';
import { aimags, PLACE_CATEGORIES, places, type PlaceCategory } from '../db/schema';
import type { AppEnv } from '../types';

export const placeRoutes = new Hono<AppEnv>();

// GET /api/places?aimag=khuvsgul&category=nature&mustSee=true
placeRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const { aimag, category, mustSee } = c.req.query();

  const conditions: SQL[] = [];
  if (aimag) conditions.push(eq(aimags.slug, aimag));
  if (category && (PLACE_CATEGORIES as readonly string[]).includes(category)) {
    conditions.push(eq(places.category, category as PlaceCategory));
  }
  if (mustSee === 'true') conditions.push(eq(places.isMustSee, true));

  const rows = await db
    .select({
      ...getTableColumns(places),
      aimagSlug: aimags.slug,
      aimagNameMn: aimags.nameMn,
      aimagNameEn: aimags.nameEn,
    })
    .from(places)
    .innerJoin(aimags, eq(places.aimagId, aimags.id))
    .where(and(...conditions));

  return c.json({ data: rows });
});
