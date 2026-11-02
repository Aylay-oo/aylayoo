/* The admin CRUD the six city resources share.
 *
 * Why a factory here and nowhere else in this service: the places, facts and team handlers in
 * routes/admin.ts are three resources written out longhand, which is perfectly readable. The
 * city section adds six more, each needing list / create / update / delete / reorder — thirty
 * handlers that would differ only in a table name and a schema. Writing them out would bury
 * the one thing a reviewer needs to check (that each resource is wired to the right table)
 * under three hundred lines of copy.
 *
 * The existing handlers are deliberately left alone. Folding working code into this would
 * make the diff for a new feature look like a rewrite of the old one.
 *
 * Every route registered here inherits `requireAdmin`, because the router this is called on is
 * mounted under one — see routes/admin-city.ts.
 */

import { asc, eq, inArray, sql } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Hono } from 'hono';
import type { z } from 'zod';
import { getDb } from '../db/client';
import { parseId, readJson } from './http';
import { reorderSchema } from './validators';
import type { AppEnv } from '../types';

/* What this needs of a table: an integer primary key and a sort column. Narrower than
 * `SQLiteTable` so a table missing either is a compile error rather than a 500 at runtime. */
export type OrderedTable = SQLiteTable & {
  id: SQLiteColumn;
  sortOrder: SQLiteColumn;
};

export type CrudResource = {
  /** The path segment, e.g. "itineraries" → /api/admin/city/itineraries. */
  path: string;
  table: OrderedTable;
  /** Singular, for the 404 message: "Itinerary not found". */
  label: string;
  /** Validates a create. Every field required. */
  create: z.ZodType;
  /** Validates a PUT. The same shape with every field optional. */
  update: z.ZodType;
};

/* How many rows one UPDATE … CASE may cover.
 *
 * D1 refuses a statement whose expression tree grows too deep, so a single CASE over a few
 * hundred branches is not safe to assume. Fifty keeps each statement small, and a list long
 * enough to need a second one is already longer than anything this screen will show. */
const REORDER_CHUNK = 50;

/**
 * Registers GET / POST / PUT / DELETE / PATCH …/reorder for one resource.
 *
 * `app` is expected to be the admin city router, so paths here are relative to
 * /api/admin/city.
 */
export function registerCityCrud(app: Hono<AppEnv>, resource: CrudResource) {
  const { path, table, label, create, update } = resource;
  const notFound = `${label} not found`;

  /* Both statuses, unlike the public routes: this is the screen where a draft is reviewed, so
   * hiding drafts here would hide the only thing it exists to show. */
  app.get(`/${path}`, async (c) => {
    const db = getDb(c.env.DB);
    const rows = await db.select().from(table).orderBy(asc(table.sortOrder), asc(table.id));
    return c.json({ data: rows });
  });

  app.post(`/${path}`, async (c) => {
    const body = await readJson(c, create);
    if ('error' in body) return body.error;
    const db = getDb(c.env.DB);
    // The `values`/`set` casts: drizzle derives these types from a concrete table, and this
    // function only knows it has an OrderedTable. The Zod schema is what guarantees the shape.
    const [created] = await db.insert(table).values(body.data as never).returning();
    return c.json({ data: created }, 201);
  });

  /* Registered before the `:id` routes for clarity only — the `[0-9]+` pattern already means
   * "reorder" can never reach them. */
  app.patch(`/${path}/reorder`, async (c) => {
    const body = await readJson(c, reorderSchema);
    if ('error' in body) return body.error;

    const ids = [...new Set(body.data.ids)];
    const db = getDb(c.env.DB);

    /* Refuse the whole request rather than reordering the ids that happen to exist: a partial
     * reorder leaves the list in an order the admin never chose and cannot see is wrong. */
    const found = await db.select({ id: table.id }).from(table).where(inArray(table.id, ids));
    if (found.length !== ids.length) {
      return c.json({ error: `One or more ${label.toLowerCase()} ids do not exist` }, 400);
    }

    // `sort_order` becomes the row's index in the list the admin sent.
    for (let start = 0; start < ids.length; start += REORDER_CHUNK) {
      const group = ids.slice(start, start + REORDER_CHUNK);
      const branches = group.map((id, i) => sql`when ${id} then ${start + i}`);
      await db
        .update(table)
        .set({ sortOrder: sql`case ${table.id} ${sql.join(branches, sql` `)} end` } as never)
        .where(inArray(table.id, group));
    }

    return c.json({ data: { ids } });
  });

  app.put(`/${path}/:id{[0-9]+}`, async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'Invalid id' }, 400);
    const body = await readJson(c, update);
    if ('error' in body) return body.error;

    /* Every field on an update schema is optional, so `{}` parses cleanly — and would reach
     * drizzle as an UPDATE with nothing to SET, which is a SQL error rather than a no-op.
     * Refused here instead, the same way guideAssignmentSchema refuses a request that changes
     * nothing. (Zod drops absent optional keys, which is what makes this check meaningful:
     * what is left is exactly the set of columns the editor meant to change.) */
    const fields = body.data as Record<string, unknown>;
    if (Object.keys(fields).length === 0) {
      return c.json({ error: 'Send at least one field to change' }, 400);
    }

    const db = getDb(c.env.DB);
    const updated = await db
      .update(table)
      .set(fields as never)
      .where(eq(table.id, id))
      .returning();
    if (updated.length === 0) return c.json({ error: notFound }, 404);
    return c.json({ data: updated[0] });
  });

  app.delete(`/${path}/:id{[0-9]+}`, async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'Invalid id' }, 400);
    const db = getDb(c.env.DB);
    const deleted = await db.delete(table).where(eq(table.id, id)).returning({ id: table.id });
    if (deleted.length === 0) return c.json({ error: notFound }, 404);
    return c.json({ message: 'Deleted' });
  });
}
