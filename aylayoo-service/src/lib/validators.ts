import { z } from 'zod';
import {
  CITY_STATUSES, CONTACT_KINDS, GUIDE_STATUSES, GUIDE_TYPES, ITINERARY_DAYS,
  PHRASE_CATEGORIES, PLACE_CATEGORIES, PRICE_LEVELS, TIMES_OF_DAY, TIP_TOPICS, TRIP_TYPES,
} from '../db/schema';

const optionalText = (max: number) => z.string().trim().max(max).optional();

/* Two shapes of "this field may be absent", and the difference between them matters.
 *
 * `nullableText` fills an absent field in with an explicit null. It is used ONLY inside
 * cityStopSchema, whose objects are serialised whole into a json column: there a missing key
 * and a null are not the same thing, because the missing key is what gets stored.
 *
 * `nullishText` leaves an absent field absent. It is used for ordinary table columns, where
 * the key simply not being in the object is what tells drizzle to leave that column alone —
 * see the note above the city schemas for why no column-level field may carry a default. */
const nullableText = (max: number) => z.string().trim().max(max).nullable().default(null);
const nullishText = (max: number) => z.string().trim().max(max).nullish();

/* An http(s)-only URL.
 *
 * Zod's .url() accepts anything URL() parses, which includes `javascript:alert(1)` and a
 * `data:` document — and every field built on this is rendered as a link: a guide's website on
 * their public page and in the admin queue, an event's link on the city page. The front end
 * guards it again at render time (`safeHttpUrl` in aylayoo-web/src/lib/format.ts), for rows
 * stored before this rule existed and for anything inserted by hand.
 */
export const httpUrl = (message: string) =>
  z
    .string()
    .trim()
    .url()
    .refine((value) => /^https?:$/.test(new URL(value).protocol), { message })
    .optional()
    .or(z.literal(''));

export const guideRegisterSchema = z
  .object({
    type: z.enum(GUIDE_TYPES),
    name: z.string().trim().min(2).max(120),
    bioMn: optionalText(2000),
    bioEn: optionalText(2000),
    languages: z.array(z.string().trim().min(2).max(5)).min(1).max(10), // e.g. ["mn","en","ru"]
    tripTypes: z.array(z.enum(TRIP_TYPES)).min(1),
    aimagIds: z.array(z.number().int().positive()).min(1).max(22),
    phone: z.string().trim().min(6).max(30),
    email: z.string().trim().email(),
    website: httpUrl('Website must be an http or https address'),
    experienceYears: z.number().int().min(0).max(70).optional(),
    routeMn: optionalText(300),
    routeEn: optionalText(300),
    car: optionalText(120),
  })
  // A driver's vehicle is the one thing their card shows in place of languages, so the
  // form has to come back with it. Guides and companies must not send one.
  .refine((v) => v.type !== 'driver' || !!v.car?.trim(), {
    path: ['car'],
    message: 'Drivers must say which car they drive',
  })
  .refine((v) => v.type === 'driver' || !v.car?.trim(), {
    path: ['car'],
    message: 'Only drivers can have a car',
  });

export const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().min(6).max(30).optional().or(z.literal('')),
    message: z.string().trim().min(5).max(3000),
    guideId: z.number().int().positive().optional(),
    subject: optionalText(200),
    kind: z.enum(CONTACT_KINDS).default('contact'),
  })
  // The form asks for "phone or email", so either one alone is enough — but not neither.
  .refine((v) => !!v.email || !!v.phone, {
    path: ['email'],
    message: 'Give either a phone number or an email address',
  });

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const guideStatusSchema = z.object({ status: z.enum(GUIDE_STATUSES) });

/* What an admin may change about an existing guide.
 *
 * Deliberately only these two. The association's roster arrives without aimags or trip types
 * — it does not record them — so an admin fills them in afterwards, and a guide with no aimag
 * can never appear in the map's recommendations until they do. Everything else about a guide
 * belongs to the guide, and is changed by re-registering rather than edited behind their back.
 *
 * Both are optional, but sending neither is a no-op request and is refused as such. */
export const guideAssignmentSchema = z
  .object({
    aimagIds: z.array(z.number().int().positive()).max(22).optional(),
    tripTypes: z.array(z.enum(TRIP_TYPES)).max(TRIP_TYPES.length).optional(),
  })
  .refine((v) => v.aimagIds !== undefined || v.tripTypes !== undefined, {
    message: 'Send aimagIds, tripTypes, or both',
  });

export const placeSchema = z.object({
  aimagId: z.number().int().positive(),
  nameMn: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  descriptionMn: optionalText(5000),
  descriptionEn: optionalText(5000),
  category: z.enum(PLACE_CATEGORIES),
  lat: z.number().min(41).max(53).nullish(), // Mongolia's latitude range
  lng: z.number().min(87).max(120).nullish(), // Mongolia's longitude range
  images: z.array(z.string()).max(20).optional(),
  isMustSee: z.boolean().optional(),
  imageKey: optionalText(40),
  bestMonthsMn: optionalText(60),
  bestMonthsEn: optionalText(60),
  mustTitleMn: optionalText(200),
  mustTitleEn: optionalText(200),
  mustSummaryMn: optionalText(1000),
  mustSummaryEn: optionalText(1000),
});

export const factSchema = z.object({
  titleMn: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  bodyMn: z.string().trim().min(1).max(3000),
  bodyEn: z.string().trim().min(1).max(3000),
  icon: optionalText(50),
  sortOrder: z.number().int().optional(),
});

export const teamMemberSchema = z.object({
  name: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(100),
  photoUrl: optionalText(500),
  sortOrder: z.number().int().optional(),
  nameEn: optionalText(100),
  roleEn: optionalText(100),
  schoolMn: optionalText(120),
  schoolEn: optionalText(120),
  descriptionMn: optionalText(1000),
  descriptionEn: optionalText(1000),
});

/* ---------------------------------------------------------------------------
 * Phase 2 — the Ulaanbaatar city section.
 *
 * Each resource exposes two schemas: `*Schema` for a create, and `*UpdateSchema` for a PUT.
 * The update is the same shape with every field optional, so an editor can send just what it
 * changed. They are declared as a pair rather than derived with `.partial()` at the call site
 * because two of them carry a cross-field rule, and `.partial()` is not available on a schema
 * that has been through `.refine()`.
 *
 * NO COLUMN-LEVEL FIELD HERE MAY CARRY A `.default()`, and that is not a style preference.
 * `.partial()` makes a field optional but leaves its default in place, so a default would be
 * applied on every PUT that did not mention the field — and a PUT is how the admin screen
 * publishes a row. An earlier draft of this file gave `stops` a `default([])` and `status` a
 * `default('draft')`; sending `{"status":"published"}` then silently emptied the itinerary's
 * stops, and renaming a published row quietly unpublished it.
 *
 * The defaults live on the table columns instead (`stops` defaults to '[]', `status` to
 * 'draft'), which gets the same result on a create — a new row is a draft with no stops unless
 * it says otherwise — while leaving an absent field genuinely absent on an update. Zod omits
 * absent optional keys from its output, so drizzle never sees the column at all.
 * ------------------------------------------------------------------------- */

/* Ulaanbaatar's own bounding box, deliberately much narrower than placeSchema's country-wide
 * range. A city stop at 45°N is a typo rather than a stop, and catching it here is what keeps
 * the route map from stretching its viewBox around a marker on the far side of the country. */
const UB_LAT = { min: 47.6, max: 48.1 } as const;
const UB_LNG = { min: 106.5, max: 107.4 } as const;

/* One stop on an itinerary or a walking route.
 *
 * Every optional field defaults to `null` rather than staying `undefined`: these objects are
 * stored verbatim in a json column typed as CityStop[], and a missing key and an explicit null
 * are not the same thing once the row is read back.
 */
export const cityStopSchema = z
  .object({
    placeMn: z.string().trim().min(1).max(200),
    placeEn: z.string().trim().min(1).max(200),
    // Itineraries set this; a walking route is walked in one go and leaves it null.
    timeOfDay: z.enum(TIMES_OF_DAY).nullable().default(null),
    noteMn: nullableText(1000),
    noteEn: nullableText(1000),
    lat: z.number().min(UB_LAT.min).max(UB_LAT.max).nullable().default(null),
    lng: z.number().min(UB_LNG.min).max(UB_LNG.max).nullable().default(null),
  })
  /* Half a coordinate cannot be plotted, and silently dropping the half that arrived would
   * lose an edit the admin thought they had made. */
  .refine((v) => (v.lat === null) === (v.lng === null), {
    path: ['lng'],
    message: 'Give both lat and lng, or neither',
  });

/** At most this many stops on one itinerary or route — a guard on the json column's size. */
const MAX_STOPS = 40;

const stops = z.array(cityStopSchema).max(MAX_STOPS).optional();

/* Optional, not defaulted: the column's own default makes a new row a draft, so nothing
 * publishes by accident, and an absent status on a PUT leaves the row as it was. */
const cityStatus = z.enum(CITY_STATUSES).optional();

const sortOrder = z.number().int().min(0).max(100_000).optional();

export const cityItinerarySchema = z.object({
  titleMn: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  days: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  summaryMn: nullishText(1000),
  summaryEn: nullishText(1000),
  stops,
  status: cityStatus,
  sortOrder,
});
export const cityItineraryUpdateSchema = cityItinerarySchema.partial();

export const cityRouteSchema = z.object({
  titleMn: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  summaryMn: nullishText(1000),
  summaryEn: nullishText(1000),
  stops,
  status: cityStatus,
  sortOrder,
});
export const cityRouteUpdateSchema = cityRouteSchema.partial();

export const cityFoodSchema = z.object({
  nameMn: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  categoryMn: nullishText(100),
  categoryEn: nullishText(100),
  knownForMn: nullishText(1000),
  knownForEn: nullishText(1000),
  areaMn: nullishText(300),
  areaEn: nullishText(300),
  // 1–3, or null when nobody has filled it in. Never guessed.
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullish(),
  status: cityStatus,
  sortOrder,
});
export const cityFoodUpdateSchema = cityFoodSchema.partial();

export const cityTipSchema = z.object({
  topic: z.enum(TIP_TOPICS),
  titleMn: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  bodyMn: z.string().trim().min(1).max(4000),
  bodyEn: z.string().trim().min(1).max(4000),
  status: cityStatus,
  sortOrder,
});
export const cityTipUpdateSchema = cityTipSchema.partial();

export const phraseSchema = z.object({
  phraseMn: z.string().trim().min(1).max(200),
  pronunciation: z.string().trim().min(1).max(200),
  meaningEn: z.string().trim().min(1).max(200),
  category: z.enum(PHRASE_CATEGORIES),
  status: cityStatus,
  sortOrder,
});
export const phraseUpdateSchema = phraseSchema.partial();

/** YYYY-MM-DD, and a date that actually exists — "2026-02-31" parses but is not a day. */
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'That date does not exist');

const cityEventFields = z.object({
  titleMn: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  startDate: isoDate,
  // Null for a single-day event, which is why "still running" compares against
  // COALESCE(end_date, start_date) rather than end_date alone.
  endDate: isoDate.nullish(),
  placeMn: nullishText(300),
  placeEn: nullishText(300),
  descriptionMn: nullishText(2000),
  descriptionEn: nullishText(2000),
  link: httpUrl('The link must be an http or https address'),
  status: cityStatus,
  sortOrder,
});

/* An event that ends before it starts is a typo in one of the two fields, and it would sort
 * and filter as though it had already finished. Skipped when either date is absent, which is
 * the normal case on an update that only touches the title. */
const datesInOrder = (v: { startDate?: string; endDate?: string | null }) =>
  !v.startDate || !v.endDate || v.endDate >= v.startDate;

const DATE_ORDER_MESSAGE = { path: ['endDate'], message: 'The end date is before the start date' };

export const cityEventSchema = cityEventFields.refine(datesInOrder, DATE_ORDER_MESSAGE);
export const cityEventUpdateSchema = cityEventFields.partial().refine(datesInOrder, DATE_ORDER_MESSAGE);

/* PATCH …/reorder — the ids of one resource's rows in the order they should appear.
 *
 * The whole visible list is sent, not a moved pair: that way the request describes the state
 * the admin can see rather than a transition, and two admins reordering at once cannot
 * interleave into an order neither of them chose. */
export const reorderSchema = z.object({
  // Capped because the handler rewrites sort_order with an UPDATE … CASE per chunk; see
  // REORDER_CHUNK in lib/crud.ts for why the statement is kept small.
  ids: z.array(z.number().int().positive()).min(1).max(200),
});

/* Exported for the admin editors and the seed, so the three places that need to know what a
 * price level or a day count may be cannot drift apart. */
export const ALLOWED_PRICE_LEVELS = PRICE_LEVELS;
export const ALLOWED_ITINERARY_DAYS = ITINERARY_DAYS;
