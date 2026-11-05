/* The public guide-led tour endpoints.
 *
 * Two rules, both of which Phase 2 learned the hard way (docs/incidents.md):
 *
 *   1. Only `status = 'published'` ever leaves, and the `:id` handler filters on status too, so
 *      a draft is not reachable by guessing its id — it answers the same 404 as a row that does
 *      not exist.
 *   2. Every column is named. A tour embeds its guide, which means this file decides what a
 *      guide looks like to the public for a second time, so it reuses the one allow-list rather
 *      than writing a second: `publicGuideColumns` is imported from routes/guides.ts and
 *      narrowed. Two independently-maintained lists is how they drift apart, and the drift is
 *      silent.
 */

import { Hono } from 'hono';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { cityTours, guides } from '../db/schema';
import { parseId } from '../lib/http';
import type { AppEnv } from '../types';
import { publicGuideColumns, withPublicRatings } from './guides';

export const tourRoutes = new Hono<AppEnv>();

/* The guide, as a tour shows them: who they are and what they speak, so a traveller can choose.
 * Not `phone`, not `email`, not `fullName` — a tour card needs none of those, and the contact
 * form works from the guide's id. Built from the shared allow-list so a column added there
 * cannot appear here without somebody naming it.
 *
 * `rating` and `reviewCount` are selected but then withheld unless the guide has enough
 * published reviews — see withPublicRatings. Until Phase 3's reviews table exists they are
 * always null and always withheld. */
const tourGuideColumns = {
  id: publicGuideColumns.id,
  name: publicGuideColumns.name,
  photoUrl: publicGuideColumns.photoUrl,
  languages: publicGuideColumns.languages,
  rating: publicGuideColumns.rating,
  reviewCount: publicGuideColumns.reviewCount,
} as const;

const tourColumns = {
  id: cityTours.id,
  titleMn: cityTours.titleMn,
  titleEn: cityTours.titleEn,
  summaryMn: cityTours.summaryMn,
  summaryEn: cityTours.summaryEn,
  durationMinutes: cityTours.durationMinutes,
  meetingPointMn: cityTours.meetingPointMn,
  meetingPointEn: cityTours.meetingPointEn,
  stops: cityTours.stops,
  sortOrder: cityTours.sortOrder,
} as const;

/** Flattens the joined row into `{ ...tour, guide }`, with ratings withheld below the floor. */
type JoinedTour = Record<string, unknown> & { guide: Record<string, unknown> };
const shape = (row: { tour: Record<string, unknown>; guide: Record<string, unknown> }): JoinedTour => ({
  ...row.tour,
  guide: withPublicRatings(row.guide),
});

/* GET /api/city/tours
 *
 * Published tours whose guide is also approved. The guide join is an inner join on purpose: a
 * tour whose guide has been removed or un-approved should disappear with them rather than
 * render with an empty byline. */
tourRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);

  const rows = await db
    .select({ tour: tourColumns, guide: tourGuideColumns })
    .from(cityTours)
    .innerJoin(guides, eq(cityTours.guideId, guides.id))
    .where(and(eq(cityTours.status, 'published'), eq(guides.status, 'approved')))
    .orderBy(asc(cityTours.sortOrder), asc(cityTours.id));

  return c.json({ data: rows.map(shape) });
});

// GET /api/city/tours/:id
tourRoutes.get('/:id{[0-9]+}', async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) return c.json({ error: 'Tour not found' }, 404);

  const db = getDb(c.env.DB);
  const rows = await db
    .select({ tour: tourColumns, guide: tourGuideColumns })
    .from(cityTours)
    .innerJoin(guides, eq(cityTours.guideId, guides.id))
    .where(and(
      eq(cityTours.id, id),
      eq(cityTours.status, 'published'),
      eq(guides.status, 'approved'),
    ))
    .limit(1);

  if (rows.length === 0) return c.json({ error: 'Tour not found' }, 404);
  return c.json({ data: shape(rows[0]) });
});
