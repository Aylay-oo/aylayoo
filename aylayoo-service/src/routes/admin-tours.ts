/* Admin CRUD for guide-led tours, and the consent that gates publishing them.
 *
 * Mounted inside routes/admin.ts after its `use('*', requireAdmin)`, so everything here is
 * already behind a bearer token.
 *
 * Tours do not use registerCityCrud, and that is the point of this file. The city resources are
 * editorial content about places; a tour names a real person and makes a commitment on their
 * behalf, so its create and update handlers have to check something the generic factory knows
 * nothing about. Reusing the factory and bolting the check on afterwards would have left the
 * check on the easy path and absent from the one somebody adds later.
 */

import { Hono, type Context } from 'hono';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '../db/client';
import { cityTours, guideConsent, guides } from '../db/schema';
import { activeConsentScopes, consentRequiredMessage, hasConsent } from '../lib/consent';
import { parseId, readJson } from '../lib/http';
import {
  cityTourSchema, cityTourUpdateSchema, guideConsentRevokeSchema, guideConsentSchema,
} from '../lib/validators';
import type { AppEnv } from '../types';

export const adminTourRoutes = new Hono<AppEnv>();

/* ---------------------------------------------------------------------------
 * Tours
 * ------------------------------------------------------------------------- */

// GET /api/admin/city/tours — both statuses; this is where a draft is reviewed.
adminTourRoutes.get('/tours', async (c) => {
  const db = getDb(c.env.DB);

  const rows = await db
    .select({
      tour: cityTours,
      guideName: guides.name,
      guideStatus: guides.status,
    })
    .from(cityTours)
    .leftJoin(guides, eq(cityTours.guideId, guides.id))
    .orderBy(asc(cityTours.sortOrder), asc(cityTours.id));

  /* Each row carries the guide's consent scopes, so the screen can say *why* a publish button
   * is disabled instead of only refusing when it is pressed. */
  const data = [];
  for (const row of rows) {
    data.push({
      ...row.tour,
      guideName: row.guideName,
      guideStatus: row.guideStatus,
      guideConsentScopes: await activeConsentScopes(db, row.tour.guideId),
    });
  }

  return c.json({ data });
});

/* Refuses a write that would publish a tour its guide cannot carry.
 *
 * Two conditions, both about the guide rather than the tour:
 *
 *   1. They have agreed (`tours` consent).
 *   2. They are `approved`. `approved` is the only active state — the others are `pending` and
 *      `rejected` — and a tour whose guide is not approved is filtered out of every public
 *      response anyway. Refusing here rather than letting it through means the admin is told,
 *      instead of ending up with a row marked "published" that nobody can see. Silent
 *      invisibility is the worse failure: it looks like the site is broken.
 *
 * Returns a Response to send, or null to carry on. 409 rather than 400: the request is
 * well-formed, the state of the world is what makes it impossible.
 */
async function blockedFromPublishing(
  c: Context<AppEnv>,
  guideId: number,
  status: string | undefined,
) {
  if (status !== 'published') return null;

  const db = getDb(c.env.DB);

  const [guide] = await db
    .select({ status: guides.status })
    .from(guides)
    .where(eq(guides.id, guideId))
    .limit(1);

  /* No row at all: the guide was deleted between the checks above and here, or the id was
   * never real. Either way the tour cannot be published. (A delete normally takes the tour with
   * it — the FK cascades — so this is the narrow race, not the usual path.) */
  if (!guide) return c.json({ error: 'That guide does not exist' }, 409);

  if (guide.status !== 'approved') {
    return c.json({
      error: `That guide is "${guide.status}", not approved. A tour can only be published for an approved guide.`,
    }, 409);
  }

  if (!(await hasConsent(db, guideId, 'tours'))) {
    return c.json({ error: consentRequiredMessage('tours') }, 409);
  }

  return null;
}

adminTourRoutes.post('/tours', async (c) => {
  const body = await readJson(c, cityTourSchema);
  if ('error' in body) return body.error;
  const input = body.data;

  const db = getDb(c.env.DB);

  // Refuse the whole request rather than storing a tour pointing at a guide who is not there.
  const [guide] = await db
    .select({ id: guides.id })
    .from(guides)
    .where(eq(guides.id, input.guideId))
    .limit(1);
  if (!guide) return c.json({ error: 'That guide does not exist' }, 400);

  const blocked = await blockedFromPublishing(c, input.guideId, input.status);
  if (blocked) return blocked;

  const [created] = await db.insert(cityTours).values(input).returning();
  return c.json({ data: created }, 201);
});

adminTourRoutes.put('/tours/:id{[0-9]+}', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);

  const body = await readJson(c, cityTourUpdateSchema);
  if ('error' in body) return body.error;
  const fields = body.data as Record<string, unknown>;
  if (Object.keys(fields).length === 0) {
    return c.json({ error: 'Send at least one field to change' }, 400);
  }

  const db = getDb(c.env.DB);
  const [existing] = await db.select().from(cityTours).where(eq(cityTours.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Tour not found' }, 404);

  /* The guide to check is the one the tour will have after this write, not the one it has now —
   * otherwise reassigning a published tour to a guide who never agreed would slip through. */
  const guideId = typeof fields.guideId === 'number' ? fields.guideId : existing.guideId;
  const status = typeof fields.status === 'string' ? fields.status : existing.status;

  if (typeof fields.guideId === 'number' && fields.guideId !== existing.guideId) {
    const [guide] = await db
      .select({ id: guides.id })
      .from(guides)
      .where(eq(guides.id, fields.guideId))
      .limit(1);
    if (!guide) return c.json({ error: 'That guide does not exist' }, 400);
  }

  const blocked = await blockedFromPublishing(c, guideId, status);
  if (blocked) return blocked;

  const updated = await db
    .update(cityTours)
    .set(fields as never)
    .where(eq(cityTours.id, id))
    .returning();
  return c.json({ data: updated[0] });
});

adminTourRoutes.delete('/tours/:id{[0-9]+}', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);
  const db = getDb(c.env.DB);
  const deleted = await db.delete(cityTours).where(eq(cityTours.id, id)).returning({ id: cityTours.id });
  if (deleted.length === 0) return c.json({ error: 'Tour not found' }, 404);
  return c.json({ message: 'Deleted' });
});

/* ---------------------------------------------------------------------------
 * Consent
 * ------------------------------------------------------------------------- */

// GET /api/admin/guide-consent?guideId=12 — the full history, revoked rows included.
adminTourRoutes.get('/guide-consent', async (c) => {
  const db = getDb(c.env.DB);
  const guideId = parseId(c.req.query('guideId'));

  const rows = await db
    .select()
    .from(guideConsent)
    .where(guideId ? eq(guideConsent.guideId, guideId) : undefined)
    .orderBy(desc(guideConsent.recordedAt));

  return c.json({ data: rows });
});

// POST /api/admin/guide-consent — record one.
adminTourRoutes.post('/guide-consent', async (c) => {
  const body = await readJson(c, guideConsentSchema);
  if ('error' in body) return body.error;
  const input = body.data;

  const db = getDb(c.env.DB);
  const [guide] = await db
    .select({ id: guides.id })
    .from(guides)
    .where(eq(guides.id, input.guideId))
    .limit(1);
  if (!guide) return c.json({ error: 'That guide does not exist' }, 400);

  // Already active for this scope: nothing to record, and a second row would muddy the history.
  if (await hasConsent(db, input.guideId, input.scope)) {
    return c.json({ error: `This guide already has active "${input.scope}" consent` }, 409);
  }

  const [created] = await db
    .insert(guideConsent)
    .values({ ...input, recordedByAdminId: c.get('adminId') })
    .returning();

  return c.json({ data: created }, 201);
});

/* POST /api/admin/guide-consent/:id/revoke — the guide's opt-out.
 *
 * Sets revokedAt rather than deleting, so the history survives, and **unpublishes that guide's
 * tours in the same request**. Leaving them up until somebody noticed would mean the site kept
 * making a commitment on behalf of a person who had just withdrawn it. */
adminTourRoutes.post('/guide-consent/:id{[0-9]+}/revoke', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);

  const body = await readJson(c, guideConsentRevokeSchema);
  if ('error' in body) return body.error;

  const db = getDb(c.env.DB);
  const [consent] = await db
    .select()
    .from(guideConsent)
    .where(and(eq(guideConsent.id, id), isNull(guideConsent.revokedAt)))
    .limit(1);
  if (!consent) return c.json({ error: 'No active consent with that id' }, 404);

  const note = body.data.reason
    ? `${consent.evidenceNote} — revoked: ${body.data.reason}`
    : consent.evidenceNote;

  await db
    .update(guideConsent)
    .set({ revokedAt: new Date(), evidenceNote: note })
    .where(eq(guideConsent.id, id));

  /* Withdrawing `tours` consent takes the tours down with it. Other scopes do not touch them. */
  let unpublished = 0;
  if (consent.scope === 'tours') {
    const rows = await db
      .update(cityTours)
      .set({ status: 'draft' })
      .where(and(eq(cityTours.guideId, consent.guideId), eq(cityTours.status, 'published')))
      .returning({ id: cityTours.id });
    unpublished = rows.length;
  }

  return c.json({ data: { id, scope: consent.scope, toursUnpublished: unpublished } });
});
