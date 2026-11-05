/* POST /api/trips/requests — a traveller asking for a tour or a guide.
 *
 * The only unauthenticated write in Phase 3 that stores personal data, so it carries the most
 * defences of anything in this service:
 *
 *   - a per-IP rate limit, the same 5/hour the contact form uses;
 *   - a per-guide daily cap, because the IP limit does nothing about one guide being flooded
 *     from many addresses;
 *   - a honeypot field that must stay empty;
 *   - a message floor, which is what most spam fails;
 *   - phone-or-email required, so a request is answerable;
 *   - and contact details REFUSED inside the message — see CONTACT_IN_MESSAGE.
 *
 * The response deliberately contains almost nothing: the reference, and that is all. No echo of
 * the name, the message or the contact. An endpoint that reflects what it was given is an
 * endpoint somebody can use to check whether a value is valid.
 */

import { Hono } from 'hono';
import { and, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { cityTours, guides, tripRequests } from '../db/schema';
import { hasConsent } from '../lib/consent';
import { readJson } from '../lib/http';
import { rateLimit } from '../lib/rate-limit';
import { newReference } from '../lib/reference';
import { tripRequestSchema } from '../lib/validators';
import type { AppEnv } from '../types';

export const tripRoutes = new Hono<AppEnv>();

/** How many requests one guide may receive in a day, across every IP. */
const PER_GUIDE_DAILY_CAP = 20;

/* A reference is random, and the column is unique, so a clash is vanishingly unlikely — but
 * "unlikely" is not "impossible", and the failure mode would be a 500 on somebody's genuine
 * request. A couple of retries costs nothing. */
const REFERENCE_ATTEMPTS = 5;

tripRoutes.post(
  '/requests',
  rateLimit({ name: 'trip-request', limit: 5, windowSeconds: 3600 }),
  async (c) => {
    const body = await readJson(c, tripRequestSchema);
    if ('error' in body) return body.error;
    const input = body.data;

    /* The honeypot. Zod has already refused a non-empty value, so reaching here means it was
     * absent or empty — this is the explicit second check, because the schema's `.optional()`
     * is easy to widen by accident. */
    if (input.website) return c.json({ error: 'Invalid data' }, 400);

    const db = getDb(c.env.DB);

    /* Resolve what the request is actually for, and refuse anything that cannot be relayed.
     *
     * A tour must be published — a draft is not something a traveller can have seen, so a
     * request naming one is either a stale link or somebody probing ids. When a tour is named,
     * its guide is the guide, which is also how the consent check below gets a subject. */
    let guideId = input.guideId ?? null;

    if (input.tourId) {
      const [tour] = await db
        .select({ guideId: cityTours.guideId })
        .from(cityTours)
        .innerJoin(guides, eq(cityTours.guideId, guides.id))
        .where(and(
          eq(cityTours.id, input.tourId),
          eq(cityTours.status, 'published'),
          eq(guides.status, 'approved'),
        ))
        .limit(1);

      if (!tour) return c.json({ error: 'That tour is not available' }, 400);
      guideId = tour.guideId;
    } else if (guideId) {
      const [guide] = await db
        .select({ id: guides.id })
        .from(guides)
        .where(and(eq(guides.id, guideId), eq(guides.status, 'approved')))
        .limit(1);
      if (!guide) return c.json({ error: 'That guide is not available' }, 400);
    }

    /* Consent, scope `requests`.
     *
     * Being listed in a directory is not agreeing to be sent strangers' trip requests, so a
     * guide who has not agreed to that does not receive them — and the traveller is told
     * plainly rather than having the request accepted and quietly dropped. */
    if (guideId && !(await hasConsent(db, guideId, 'requests'))) {
      return c.json({
        error: 'This guide is not taking trip requests through the site yet. Please use the contact form.',
      }, 409);
    }

    /* The per-guide daily cap. Counted from the stored rows rather than from KV, so it holds
     * across IPs and across a KV outage — the thing it exists to stop is one guide's inbox
     * being buried, and that is a property of the table, not of a counter. */
    if (guideId) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tripRequests)
        .where(and(eq(tripRequests.guideId, guideId), gte(tripRequests.createdAt, dayAgo)));

      if (count >= PER_GUIDE_DAILY_CAP) {
        c.header('Retry-After', '3600');
        return c.json({
          error: 'This guide has received a lot of requests today. Please try again tomorrow.',
        }, 429);
      }
    }

    for (let attempt = 0; attempt < REFERENCE_ATTEMPTS; attempt += 1) {
      const reference = newReference();
      try {
        await db.insert(tripRequests).values({
          reference,
          travellerName: input.travellerName,
          email: input.email || null,
          phone: input.phone || null,
          message: input.message,
          partySize: input.partySize ?? null,
          preferredFrom: input.preferredFrom ?? null,
          preferredTo: input.preferredTo ?? null,
          tourId: input.tourId ?? null,
          guideId,
          // `status` and `createdAt` come from the column defaults.
        });

        /* The reference and nothing else. The traveller needs it to ask for deletion later, and
         * it is the only thing they are given — see the note at the top of this file. */
        return c.json({
          data: { reference },
          message: 'Request received. Our team will be in touch.',
        }, 201);
      } catch (err) {
        // A unique-constraint collision on the reference: try another. Anything else is real.
        const message = err instanceof Error ? err.message : '';
        if (!/unique/i.test(message)) throw err;
      }
    }

    throw new Error('Could not allocate a request reference');
  },
);
