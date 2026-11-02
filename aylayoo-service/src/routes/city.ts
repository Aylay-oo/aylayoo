/* The public Ulaanbaatar endpoints.
 *
 * One rule runs through every handler here: only `status = 'published'` ever leaves. A draft is
 * the team's working copy, visible on /admin and nowhere else, so a draft row must not be
 * reachable by guessing its id either — which is why the two `:id` handlers filter on status as
 * well as id, and answer a draft with the same 404 as a row that does not exist.
 *
 * Ordering is `sort_order` then `id` everywhere, so what the admin arranged is what a visitor
 * sees, and rows that have never been reordered (all sharing sort_order 0) still come back in a
 * stable order rather than whatever the query planner felt like.
 */

import { Hono } from 'hono';
import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import {
  cityEvents, cityFood, cityItineraries, cityRoutes, cityTips, phrases,
} from '../db/schema';
import { parseId } from '../lib/http';
import type { AppEnv } from '../types';

export const cityRoutesApi = new Hono<AppEnv>();

// GET /api/city/itineraries?days=1|2|3
cityRoutesApi.get('/itineraries', async (c) => {
  const db = getDb(c.env.DB);
  const days = Number(c.req.query('days'));
  // Only 1, 2 and 3 exist; anything else is ignored rather than refused, so a stale link with
  // ?days=4 shows the whole list instead of an error.
  const filterDays = days === 1 || days === 2 || days === 3;

  const rows = await db
    .select()
    .from(cityItineraries)
    .where(and(
      eq(cityItineraries.status, 'published'),
      filterDays ? eq(cityItineraries.days, days) : undefined,
    ))
    .orderBy(asc(cityItineraries.sortOrder), asc(cityItineraries.id));

  return c.json({ data: rows });
});

// GET /api/city/itineraries/:id
cityRoutesApi.get('/itineraries/:id{[0-9]+}', async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) return c.json({ error: 'Itinerary not found' }, 404);

  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(cityItineraries)
    .where(and(eq(cityItineraries.id, id), eq(cityItineraries.status, 'published')))
    .limit(1);

  if (rows.length === 0) return c.json({ error: 'Itinerary not found' }, 404);
  return c.json({ data: rows[0] });
});

// GET /api/city/routes
cityRoutesApi.get('/routes', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(cityRoutes)
    .where(eq(cityRoutes.status, 'published'))
    .orderBy(asc(cityRoutes.sortOrder), asc(cityRoutes.id));
  return c.json({ data: rows });
});

// GET /api/city/routes/:id
cityRoutesApi.get('/routes/:id{[0-9]+}', async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) return c.json({ error: 'Route not found' }, 404);

  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(cityRoutes)
    .where(and(eq(cityRoutes.id, id), eq(cityRoutes.status, 'published')))
    .limit(1);

  if (rows.length === 0) return c.json({ error: 'Route not found' }, 404);
  return c.json({ data: rows[0] });
});

/* GET /api/city/food
 *
 * Empty until the team fills it in from /admin. A restaurant, what it charges and when it opens
 * are facts about somebody else's business, so none of them are invented here. */
cityRoutesApi.get('/food', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(cityFood)
    .where(eq(cityFood.status, 'published'))
    .orderBy(asc(cityFood.sortOrder), asc(cityFood.id));
  return c.json({ data: rows });
});

/* GET /api/city/tips
 *
 * Returned as one flat list rather than grouped by topic: the front end groups them for
 * display, and a flat list keeps the response shape the same as every other endpoint here. */
cityRoutesApi.get('/tips', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(cityTips)
    .where(eq(cityTips.status, 'published'))
    .orderBy(asc(cityTips.sortOrder), asc(cityTips.id));
  return c.json({ data: rows });
});

// GET /api/city/phrases
cityRoutesApi.get('/phrases', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(phrases)
    .where(eq(phrases.status, 'published'))
    .orderBy(asc(phrases.sortOrder), asc(phrases.id));
  return c.json({ data: rows });
});

/* GET /api/city/events
 *
 * Published events that have not finished yet, soonest first.
 *
 * "Not finished" compares against COALESCE(end_date, start_date), because end_date is null for
 * a single-day event — comparing end_date alone would drop every one-day event from the list.
 * The cut-off is today in UTC rather than Ulaanbaatar time: a Worker has no local timezone, and
 * being one day generous at the boundary keeps an event that is on today from vanishing a few
 * hours early for a visitor who is standing in the city.
 *
 * Also empty until the team adds events — nobody has told us about one, and an event we made up
 * would send somebody across town for nothing. */
cityRoutesApi.get('/events', async (c) => {
  const db = getDb(c.env.DB);
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(cityEvents)
    .where(and(
      eq(cityEvents.status, 'published'),
      gte(sql`coalesce(${cityEvents.endDate}, ${cityEvents.startDate})`, today),
    ))
    .orderBy(asc(cityEvents.startDate), asc(cityEvents.sortOrder), asc(cityEvents.id));

  return c.json({ data: rows });
});
