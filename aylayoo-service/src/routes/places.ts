import { Hono } from 'hono';
import { and, eq, getTableColumns, type SQL } from 'drizzle-orm';
import { getDb } from '../db/client';
import { aimags, PLACE_CATEGORIES, places, type PlaceCategory } from '../db/schema';
import { parseId } from '../lib/http';
import type { AppEnv } from '../types';

export const placeRoutes = new Hono<AppEnv>();

/* A place always travels with its aimag's slug and name, because every screen that shows a place
 * also says where it is — and /places/[id] needs the slug to link back to the aimag's page.
 * Shared between the two routes so they cannot drift apart. */
const placeColumns = {
  ...getTableColumns(places),
  aimagSlug: aimags.slug,
  aimagNameMn: aimags.nameMn,
  aimagNameEn: aimags.nameEn,
};

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
    .select(placeColumns)
    .from(places)
    .innerJoin(aimags, eq(places.aimagId, aimags.id))
    .where(and(...conditions));

  return c.json({ data: rows });
});

/* GET /api/places/:id
 *
 * The id regex keeps a non-numeric path off this handler, so it falls through to the app's own
 * 404 rather than running a query that cannot match. A place has no slug — the integer id is its
 * only stable public identifier — so this is what /places/[id] on the web side fetches. */
placeRoutes.get('/:id{[0-9]+}', async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) return c.json({ error: 'Place not found' }, 404);

  const db = getDb(c.env.DB);
  const rows = await db
    .select(placeColumns)
    .from(places)
    .innerJoin(aimags, eq(places.aimagId, aimags.id))
    .where(eq(places.id, id))
    .limit(1);

  if (rows.length === 0) return c.json({ error: 'Place not found' }, 404);
  return c.json({ data: rows[0] });
});
