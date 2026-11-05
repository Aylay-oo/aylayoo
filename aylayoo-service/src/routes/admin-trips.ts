/* The admin side of trip requests — the relay, and nothing more.
 *
 * Mounted inside routes/admin.ts after `use('*', requireAdmin)`.
 *
 * In R1a there is no email and guides have no auth, so a request reaches a guide because an
 * admin picks up the phone. This file's job is to make that relay safe to do in the right
 * order, and the order is the whole point:
 *
 *   before accepted — name, message, party size, dates. NOT the contact.
 *   after accepted  — the contact too.
 *
 * So the list endpoint WITHHOLDS `email` and `phone` until the request is accepted, rather than
 * returning everything and asking the screen to hide it. A field the screen is trusted to hide
 * is a field that leaks the first time somebody adds a debug panel, an export, or a second
 * screen. Admins are trusted with the data; they are not trusted to remember the sequencing,
 * and they should not have to.
 */

import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import {
  CLOSED_REQUEST_STATUSES, cityTours, guides, tripRequests, type RequestStatus,
} from '../db/schema';
import { parseId, readJson } from '../lib/http';
import { formatReference, normaliseReference } from '../lib/reference';
import { erasureLookupSchema, tripRequestStatusSchema } from '../lib/validators';
import type { AppEnv } from '../types';

export const adminTripRoutes = new Hono<AppEnv>();

/* Everything about a request except the contact details, which are added back only once the
 * guide has accepted. Named explicitly, like every other allow-list in this service. */
const requestColumns = {
  id: tripRequests.id,
  reference: tripRequests.reference,
  travellerName: tripRequests.travellerName,
  message: tripRequests.message,
  partySize: tripRequests.partySize,
  preferredFrom: tripRequests.preferredFrom,
  preferredTo: tripRequests.preferredTo,
  tourId: tripRequests.tourId,
  guideId: tripRequests.guideId,
  status: tripRequests.status,
  createdAt: tripRequests.createdAt,
  acceptedAt: tripRequests.acceptedAt,
  closedAt: tripRequests.closedAt,
  contactClearedAt: tripRequests.contactClearedAt,
  reviewTokenDeliveredAt: tripRequests.reviewTokenDeliveredAt,
  // The contact, withheld below unless accepted.
  email: tripRequests.email,
  phone: tripRequests.phone,
} as const;

type RequestRow = Record<string, unknown> & { status: RequestStatus; acceptedAt: Date | null };

/**
 * Strips the contact unless the guide has accepted.
 *
 * Absent, not blanked, so the screen cannot render an empty field that looks like missing data
 * and a test can assert on shape. `contactWithheld` tells the screen which case it is in, so it
 * can explain rather than just show nothing.
 */
function stageContact(row: RequestRow) {
  const accepted = row.acceptedAt !== null;
  if (accepted) return { ...row, contactWithheld: false };

  const { email: _email, phone: _phone, ...rest } = row;
  return { ...rest, contactWithheld: true };
}

// GET /api/admin/trip-requests — newest first, contact staged.
adminTripRoutes.get('/trip-requests', async (c) => {
  const db = getDb(c.env.DB);

  const rows = await db
    .select({
      request: requestColumns,
      guideName: guides.name,
      guidePhone: guides.phone,
      guideEmail: guides.email,
      tourTitleMn: cityTours.titleMn,
    })
    .from(tripRequests)
    .leftJoin(guides, eq(tripRequests.guideId, guides.id))
    .leftJoin(cityTours, eq(tripRequests.tourId, cityTours.id))
    .orderBy(desc(tripRequests.createdAt));

  return c.json({
    data: rows.map((row) => ({
      ...stageContact(row.request as RequestRow),
      referenceFormatted: formatReference(String(row.request.reference)),
      /* The GUIDE's contact, which the admin needs in order to relay at all, and which is
       * admin-only everywhere in this service. Not the traveller's. */
      guide: { name: row.guideName, phone: row.guidePhone, email: row.guideEmail },
      tourTitleMn: row.tourTitleMn,
    })),
  });
});

/* PATCH /api/admin/trip-requests/:id — move it along the relay.
 *
 * Timestamps are set here rather than by the caller: `acceptedAt` is what unlocks the contact
 * details, and `closedAt` is half of the retention clock, so neither is something a screen
 * should be able to set to whatever it likes.
 */
adminTripRoutes.patch('/trip-requests/:id{[0-9]+}', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);

  const body = await readJson(c, tripRequestStatusSchema);
  if ('error' in body) return body.error;
  const { status } = body.data;

  const db = getDb(c.env.DB);
  const [existing] = await db.select().from(tripRequests).where(eq(tripRequests.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Request not found' }, 404);

  const now = new Date();
  const patch: Record<string, unknown> = { status };

  // Set once and kept: an accepted request that later completes keeps the time it was accepted.
  if (status === 'accepted' && !existing.acceptedAt) patch.acceptedAt = now;
  if (CLOSED_REQUEST_STATUSES.includes(status) && !existing.closedAt) patch.closedAt = now;

  /* Reopening clears closedAt, because the retention clock must not keep running from a
   * closure that was undone. */
  if (!CLOSED_REQUEST_STATUSES.includes(status) && existing.closedAt) patch.closedAt = null;

  const updated = await db
    .update(tripRequests)
    .set(patch as never)
    .where(eq(tripRequests.id, id))
    .returning();

  return c.json({ data: stageContact(updated[0] as unknown as RequestRow) });
});

/* DELETE /api/admin/trip-requests/:id
 *
 * The one action for both spam and an honoured erasure request. Spam is not a status: keeping a
 * stranger's phone number on file in order to label them a spammer is the wrong trade.
 */
adminTripRoutes.delete('/trip-requests/:id{[0-9]+}', async (c) => {
  const id = parseId(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid id' }, 400);

  const db = getDb(c.env.DB);
  const deleted = await db
    .delete(tripRequests)
    .where(eq(tripRequests.id, id))
    .returning({ id: tripRequests.id });

  if (deleted.length === 0) return c.json({ error: 'Request not found' }, 404);
  return c.json({ message: 'Deleted' });
});

/* POST /api/admin/trip-requests/erasure-lookup
 *
 * A traveller asks for their data to be deleted. They have a reference and the contact they
 * used; the only thing proving the request is theirs is that contact detail, which is the very
 * thing being deleted. So an admin runs the lookup and both halves must match.
 *
 * What this endpoint deliberately does NOT do:
 *   - it never says which half was wrong, so it cannot be used to test whether a given phone
 *     number is in the database;
 *   - it never returns the stored contact, only whether what was supplied matches;
 *   - it does not delete anything. The admin sees the match and uses DELETE above, so an
 *     erasure is a deliberate second act.
 *
 * Admin-only, so this is not itself a public oracle — but it is one an admin could be talked
 * into operating by somebody on the phone, which is why it answers as little as it does.
 */
adminTripRoutes.post('/trip-requests/erasure-lookup', async (c) => {
  const body = await readJson(c, erasureLookupSchema);
  if ('error' in body) return body.error;

  const reference = normaliseReference(body.data.reference);
  const supplied = body.data.contact.trim().toLowerCase();

  // Same answer for a malformed reference as for one that does not exist.
  const noMatch = c.json({ data: { matched: false } });
  if (!reference) return noMatch;

  const db = getDb(c.env.DB);
  const [row] = await db
    .select({
      id: tripRequests.id,
      email: tripRequests.email,
      phone: tripRequests.phone,
      status: tripRequests.status,
      createdAt: tripRequests.createdAt,
      contactClearedAt: tripRequests.contactClearedAt,
    })
    .from(tripRequests)
    .where(eq(tripRequests.reference, reference))
    .limit(1);

  if (!row) return noMatch;

  /* Compare on digits for a phone, so "+976 7000 0001" and "97670000001" match — a person will
   * not reproduce their own spacing. Email compares case-insensitively. */
  const digits = (value: string) => value.replace(/\D/g, '');
  const emailMatches = !!row.email && row.email.trim().toLowerCase() === supplied;
  const phoneMatches = !!row.phone
    && digits(row.phone).length > 0
    && digits(row.phone) === digits(supplied);

  if (!emailMatches && !phoneMatches) {
    /* Already cleared by the retention pass: there is nothing left to compare against, and the
     * honest answer is that the contact is already gone rather than "no match". */
    if (row.contactClearedAt) {
      return c.json({
        data: {
          matched: false,
          contactAlreadyCleared: true,
          id: row.id,
          status: row.status,
        },
      });
    }
    return noMatch;
  }

  /* A match returns the id to delete and the state of the row — never the stored contact. */
  return c.json({
    data: { matched: true, id: row.id, status: row.status, createdAt: row.createdAt },
  });
});
