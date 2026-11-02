import { Hono } from 'hono';
import { and, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { getDb, type Db } from '../db/client';
import { aimags, guideAimags, GUIDE_TYPES, guides, type GuideType } from '../db/schema';
import { getFile, uploadImage } from '../lib/http';
import { rateLimit } from '../lib/rate-limit';
import { guideRegisterSchema } from '../lib/validators';
import type { AppEnv } from '../types';

export const guideRoutes = new Hono<AppEnv>();

/* What a guide looks like to the public.
 *
 * An explicit allow-list, not `getTableColumns(guides)` minus a few. It used to be the latter,
 * with the comment "everything except status is safe to show publicly" — and that was wrong:
 * `phone` and `email` went out with every guide on /api/guides, including the tourism
 * association's fifty real people. A subtractive list is the wrong shape for this, because the
 * failure mode is silent and backwards: adding a column to the table publishes it, and nobody
 * reviewing that migration is looking at this file.
 *
 * So: a new column is private until somebody adds it here on purpose.
 *
 * Deliberately absent:
 *   status  — pending and rejected guides have no public page at all; the route filters on it.
 *   phone   — how the admin reaches a guide, not how a traveller does.
 *   email     A traveller contacts a guide through POST /api/contact, which takes the guide's
 *             id and never exposes either. Both are still readable on /api/admin/guides.
 */
const publicColumns = {
  id: guides.id,
  type: guides.type,
  name: guides.name,
  fullName: guides.fullName,
  bioMn: guides.bioMn,
  bioEn: guides.bioEn,
  languages: guides.languages,
  tripTypes: guides.tripTypes,
  photoUrl: guides.photoUrl,
  website: guides.website,
  createdAt: guides.createdAt,
  experienceYears: guides.experienceYears,
  experienceRange: guides.experienceRange,
  routeMn: guides.routeMn,
  routeEn: guides.routeEn,
  car: guides.car,
  rating: guides.rating,
  reviewCount: guides.reviewCount,
} as const;

// Adds the list of aimags each guide works in.
export async function attachAimags<T extends { id: number }>(db: Db, rows: T[]) {
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return rows.map((r) => ({ ...r, aimags: [] }));

  const links = await db
    .select({ guideId: guideAimags.guideId, id: aimags.id, slug: aimags.slug, nameMn: aimags.nameMn, nameEn: aimags.nameEn })
    .from(guideAimags)
    .innerJoin(aimags, eq(aimags.id, guideAimags.aimagId))
    .where(inArray(guideAimags.guideId, ids));

  return rows.map((r) => ({
    ...r,
    aimags: links.filter((l) => l.guideId === r.id).map(({ guideId: _g, ...a }) => a),
  }));
}

// GET /api/guides?aimag=khuvsgul,arkhangai&type=individual&language=en&tripType=countryside&page=1&limit=12
guideRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const q = c.req.query();
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 12));

  const conditions: SQL[] = [eq(guides.status, 'approved')];

  if ((GUIDE_TYPES as readonly string[]).includes(q.type)) {
    conditions.push(eq(guides.type, q.type as GuideType));
  }

  if (q.language) {
    conditions.push(sql`exists (select 1 from json_each(${guides.languages}) where value = ${q.language})`);
  }
  if (q.tripType === 'city' || q.tripType === 'countryside') {
    conditions.push(sql`exists (select 1 from json_each(${guides.tripTypes}) where value = ${q.tripType})`);
  }
  if (q.aimag) {
    const slugs = q.aimag.split(',').map((s) => s.trim()).filter(Boolean);
    if (slugs.length) {
      const inAimags = db
        .select({ id: guideAimags.guideId })
        .from(guideAimags)
        .innerJoin(aimags, eq(aimags.id, guideAimags.aimagId))
        .where(inArray(aimags.slug, slugs));
      conditions.push(inArray(guides.id, inAimags));
    }
  }

  const where = and(...conditions);
  const [rows, totals] = await Promise.all([
    db.select(publicColumns).from(guides).where(where)
      .orderBy(desc(guides.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(guides).where(where),
  ]);
  const total = totals[0]?.total ?? 0;

  return c.json({
    data: await attachAimags(db, rows),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/guides/:id
guideRoutes.get('/:id{[0-9]+}', async (c) => {
  const db = getDb(c.env.DB);
  const id = Number(c.req.param('id'));
  const rows = await db.select(publicColumns).from(guides)
    .where(and(eq(guides.id, id), eq(guides.status, 'approved'))).limit(1);
  if (rows.length === 0) return c.json({ error: 'Guide not found' }, 404);

  const [guide] = await attachAimags(db, rows);
  return c.json({ data: guide });
});

// POST /api/guides/register   (multipart/form-data)
//   field "data"  = JSON string matching guideRegisterSchema
//   field "photo" = optional image file
guideRoutes.post('/register', rateLimit({ name: 'register', limit: 3, windowSeconds: 3600 }), async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) return c.json({ error: 'Send the form as multipart/form-data' }, 400);

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get('data') ?? ''));
  } catch {
    return c.json({ error: 'The "data" field must be valid JSON' }, 400);
  }

  const parsed = guideRegisterSchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: 'Invalid data', details: parsed.error.issues }, 400);
  const input = parsed.data;

  const db = getDb(c.env.DB);

  // make sure every aimag id really exists
  const aimagIds = [...new Set(input.aimagIds)];
  const found = await db.select({ id: aimags.id }).from(aimags).where(inArray(aimags.id, aimagIds));
  if (found.length !== aimagIds.length) return c.json({ error: 'One or more aimags do not exist' }, 400);

  let photoUrl: string | null = null;
  const photo = getFile(form, 'photo');
  if (photo) {
    const upload = await uploadImage(c.env.BUCKET, photo, 'guides');
    if ('error' in upload) return c.json({ error: upload.error }, 400);
    photoUrl = upload.url;
  }

  const [created] = await db
    .insert(guides)
    .values({
      type: input.type,
      name: input.name,
      bioMn: input.bioMn ?? null,
      bioEn: input.bioEn ?? null,
      languages: input.languages,
      tripTypes: input.tripTypes,
      phone: input.phone,
      email: input.email,
      website: input.website || null,
      photoUrl,
      status: 'pending',
      experienceYears: input.experienceYears ?? null,
      routeMn: input.routeMn ?? null,
      routeEn: input.routeEn ?? null,
      car: input.car ?? null,
      // rating / reviewCount stay null: they are earned from real travellers, never
      // supplied at registration.
    })
    .returning({ id: guides.id });

  if (!created) return c.json({ error: 'Could not save registration' }, 500);

  await db.insert(guideAimags).values(aimagIds.map((aimagId) => ({ guideId: created.id, aimagId })));

  return c.json(
    { data: { id: created.id, status: 'pending' }, message: 'Registration received. We will review it soon.' },
    201,
  );
});
