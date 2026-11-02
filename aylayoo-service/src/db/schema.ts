import { sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const PLACE_CATEGORIES = ['nature', 'historical', 'city', 'cultural'] as const;
// "driver" are the drivers with their own vehicle the front end lists next to the guides.
export const GUIDE_TYPES = ['company', 'individual', 'driver'] as const;
export const GUIDE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const TRIP_TYPES = ['city', 'countryside'] as const;
// "contact" = someone writing to a guide; "booking" = someone ordering a listed trip.
export const CONTACT_KINDS = ['contact', 'booking'] as const;
/* How long a guide has worked, as the tourism association records it — a band, not a number.
 * Kept as a band because that is the truth of the data: turning "4-6 жил" into 5 would be
 * inventing a fact about a real person. */
export const EXPERIENCE_RANGES = ['Анхны жил', '1-3 жил', '4-6 жил', '7-9 жил', '10+ жил'] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
export type GuideType = (typeof GUIDE_TYPES)[number];
export type TripType = (typeof TRIP_TYPES)[number];
export type ContactKind = (typeof CONTACT_KINDS)[number];
export type ExperienceRange = (typeof EXPERIENCE_RANGES)[number];

export const aimags = sqliteTable('aimags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  nameMn: text('name_mn').notNull(),
  nameEn: text('name_en').notNull(),
  region: text('region'),
  descriptionMn: text('description_mn'),
  descriptionEn: text('description_en'),
  imageUrl: text('image_url'),
  // ISO 3166-2:MN code, e.g. "MN-041". The front-end map's SVG shapes are keyed by it.
  isoCode: text('iso_code').unique(),
  centerMn: text('center_mn'), // the aimag's capital town, e.g. "Мөрөн"
  centerEn: text('center_en'),
  areaKm2: real('area_km2'), // in thousands of km², matching how the UI prints it
});

export const places = sqliteTable('places', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  aimagId: integer('aimag_id')
    .notNull()
    .references(() => aimags.id, { onDelete: 'cascade' }),
  nameMn: text('name_mn').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionMn: text('description_mn'),
  descriptionEn: text('description_en'),
  category: text('category', { enum: PLACE_CATEGORIES }).notNull(),
  // Nullable: most places are only ever shown in a list or on the SVG map, which is
  // drawn from aimag shapes rather than coordinates. Only fill these in when known.
  lat: real('lat'),
  lng: real('lng'),
  images: text('images', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  isMustSee: integer('is_must_see', { mode: 'boolean' }).notNull().default(false),
  // Which stock photo the front end shows: lake, mountain, desert, temple, cave,
  // falls, forest, steppe, monument, city.
  imageKey: text('image_key'),
  bestMonthsMn: text('best_months_mn'), // e.g. "6–8 сар"; must-see places only
  bestMonthsEn: text('best_months_en'),
  // The must-see carousel's own headline and blurb, which deliberately read wider than
  // the place itself (e.g. "Хонгорын элс & Баянзаг" over the place "Хонгорын элс").
  mustTitleMn: text('must_title_mn'),
  mustTitleEn: text('must_title_en'),
  mustSummaryMn: text('must_summary_mn'),
  mustSummaryEn: text('must_summary_en'),
});

export const guides = sqliteTable('guides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: GUIDE_TYPES }).notNull(),
  name: text('name').notNull(),
  bioMn: text('bio_mn'),
  bioEn: text('bio_en'),
  languages: text('languages', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  tripTypes: text('trip_types', { mode: 'json' }).$type<TripType[]>().notNull().default(sql`'[]'`),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  photoUrl: text('photo_url'),
  website: text('website'),
  status: text('status', { enum: GUIDE_STATUSES }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  /* The guide's own name as the association lists it: "<father's name> <given name>", e.g.
   * "Жаргал Содномпил". `name` holds the display form the design uses, "Ж. Содномпил". */
  fullName: text('full_name'),
  experienceYears: integer('experience_years'),
  /* Either this or experienceYears, depending on where the guide came from: someone who
   * registers themselves gives a number, the association's roster gives a band. The card
   * shows whichever is present. */
  experienceRange: text('experience_range', { enum: EXPERIENCE_RANGES }),
  routeMn: text('route_mn'), // the places they usually travel, e.g. "Хөвсгөл, Архангай"
  routeEn: text('route_en'),
  car: text('car'), // drivers only, e.g. "Land Cruiser 200 / Delica"
  // Nullable on purpose: a guide has no rating until real travellers leave one, and the
  // front end hides the stars entirely while these are null. Never backfill them.
  rating: real('rating'),
  reviewCount: integer('review_count'),
});

// A guide can work in many aimags, an aimag can have many guides.
export const guideAimags = sqliteTable(
  'guide_aimags',
  {
    guideId: integer('guide_id')
      .notNull()
      .references(() => guides.id, { onDelete: 'cascade' }),
    aimagId: integer('aimag_id')
      .notNull()
      .references(() => aimags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.guideId, t.aimagId] })],
);

export const facts = sqliteTable('facts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleMn: text('title_mn').notNull(),
  titleEn: text('title_en').notNull(),
  bodyMn: text('body_mn').notNull(),
  bodyEn: text('body_en').notNull(),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const teamMembers = sqliteTable('team_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  role: text('role').notNull(),
  photoUrl: text('photo_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  // `name` and `role` hold the Mongolian; these carry the English and the school.
  nameEn: text('name_en'),
  roleEn: text('role_en'),
  schoolMn: text('school_mn'),
  schoolEn: text('school_en'),
  descriptionMn: text('description_mn'),
  descriptionEn: text('description_en'),
});

export const contactMessages = sqliteTable('contact_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // Nullable, and so is `phone`: the form asks for a phone number OR an email, and the
  // validator enforces that at least one of the two arrives.
  email: text('email'),
  phone: text('phone'),
  message: text('message').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  // Which guide the message was sent from, when it was opened from a guide's card.
  // No foreign key: a message must outlive the guide listing it came from.
  guideId: integer('guide_id'),
  subject: text('subject'), // e.g. the guide or trip name the dialog was opened with
  kind: text('kind', { enum: CONTACT_KINDS }).notNull().default('contact'),
});

export const admins = sqliteTable('admins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

/* ---------------------------------------------------------------------------
 * Phase 2 — the Ulaanbaatar city section.
 *
 * Six tables the team edits from /admin → "Хот". Everything here is editorial content about
 * the capital rather than a record of a real person or business, with one rule in common:
 * a row is private until somebody publishes it, so the public API only ever serves
 * `status = 'published'`.
 * ------------------------------------------------------------------------- */

// A row is a draft until an admin publishes it. Only "published" reaches the public API.
export const CITY_STATUSES = ['draft', 'published'] as const;

/* When during the day a stop is meant to happen. An itinerary's stops carry one; a walking
 * route's do not, because a route is walked in one go. */
export const TIMES_OF_DAY = ['morning', 'midday', 'afternoon', 'evening'] as const;

// The four topics the practical guide is grouped by, as the brief names them.
export const TIP_TOPICS = ['transport', 'money', 'weather', 'etiquette'] as const;

/* The phrasebook's section headings.
 *
 * An enum rather than a Mongolian/English text pair on the row, unlike city_food.category:
 * these six are UI furniture — the headings the phrasebook groups under — so they belong in
 * the front end's dictionary where they translate like every other label. Storing them per
 * row would let two phrases spell the same heading differently and split the group in two.
 * A restaurant's category is the opposite case: there the team should be free to type
 * whatever a place actually is, so that one is text in both languages. */
export const PHRASE_CATEGORIES = [
  'greetings', 'basics', 'food', 'directions', 'numbers', 'emergency',
] as const;

/** 1 = cheap, 2 = mid-range, 3 = expensive. Null when nobody has filled it in. */
export const PRICE_LEVELS = [1, 2, 3] as const;

/** How many days an itinerary covers. */
export const ITINERARY_DAYS = [1, 2, 3] as const;

export type CityStatus = (typeof CITY_STATUSES)[number];
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];
export type TipTopic = (typeof TIP_TOPICS)[number];
export type PhraseCategory = (typeof PHRASE_CATEGORIES)[number];
export type PriceLevel = (typeof PRICE_LEVELS)[number];
export type ItineraryDays = (typeof ITINERARY_DAYS)[number];

/* One stop on an itinerary or a walking route.
 *
 * Stored as a JSON array on the parent row rather than in a child table, the same way
 * `places.images` and `guides.languages` already are. The order *is* the data here — a route
 * is its sequence of stops — and a JSON array keeps that in one column, so reordering is a
 * single UPDATE instead of one per stop. It also means the whole route arrives in the request
 * that fetched the route, with no join and no second query.
 *
 * `lat`/`lng` are optional for the same reason they are on `places`: the front end's map falls
 * back to the ordered list when a stop has no coordinates, and guessing one would put a marker
 * somewhere the stop is not. */
export type CityStop = {
  placeMn: string;
  placeEn: string;
  /** Itineraries set this; walking routes leave it null. */
  timeOfDay: TimeOfDay | null;
  noteMn: string | null;
  noteEn: string | null;
  lat: number | null;
  lng: number | null;
};

/** A 1-, 2- or 3-day plan for the city, as an ordered list of stops. */
export const cityItineraries = sqliteTable('city_itineraries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleMn: text('title_mn').notNull(),
  titleEn: text('title_en').notNull(),
  days: integer('days').notNull(),
  summaryMn: text('summary_mn'),
  summaryEn: text('summary_en'),
  stops: text('stops', { mode: 'json' }).$type<CityStop[]>().notNull().default(sql`'[]'`),
  status: text('status', { enum: CITY_STATUSES }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/* A themed walking route — "Буддын Улаанбаатар", "Социализмын үеийн Улаанбаатар".
 *
 * `summary` is not in the original brief but the route's own page needs it: a <meta
 * description> and an Open Graph card want a sentence, and a title is not one. */
export const cityRoutes = sqliteTable('city_routes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleMn: text('title_mn').notNull(),
  titleEn: text('title_en').notNull(),
  summaryMn: text('summary_mn'),
  summaryEn: text('summary_en'),
  stops: text('stops', { mode: 'json' }).$type<CityStop[]>().notNull().default(sql`'[]'`),
  status: text('status', { enum: CITY_STATUSES }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/* Where to eat.
 *
 * Ships empty on purpose: a restaurant, its prices and its opening hours are facts about a
 * real business, and inventing them would put wrong information about somebody else's
 * livelihood on the site. The team fills this in from /admin. */
export const cityFood = sqliteTable('city_food', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nameMn: text('name_mn').notNull(),
  nameEn: text('name_en').notNull(),
  categoryMn: text('category_mn'),
  categoryEn: text('category_en'),
  knownForMn: text('known_for_mn'),
  knownForEn: text('known_for_en'),
  areaMn: text('area_mn'), // the district or street address
  areaEn: text('area_en'),
  priceLevel: integer('price_level'), // 1–3, or null when unknown
  status: text('status', { enum: CITY_STATUSES }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/** The practical guide: getting around, money, what to wear, how to behave. */
export const cityTips = sqliteTable('city_tips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  topic: text('topic', { enum: TIP_TOPICS }).notNull(),
  titleMn: text('title_mn').notNull(),
  titleEn: text('title_en').notNull(),
  bodyMn: text('body_mn').notNull(),
  bodyEn: text('body_en').notNull(),
  status: text('status', { enum: CITY_STATUSES }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/* The phrasebook.
 *
 * Three columns rather than an MN/EN pair, because the split is the content: `phraseMn` is
 * what to say, `pronunciation` is how to say it in Latin letters, `meaningEn` is what it
 * means. A `status` so the first set can be reviewed before it goes public — the brief did
 * not list one, but it also asked for the starting phrases as drafts. */
export const phrases = sqliteTable('phrases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phraseMn: text('phrase_mn').notNull(),
  pronunciation: text('pronunciation').notNull(),
  meaningEn: text('meaning_en').notNull(),
  category: text('category', { enum: PHRASE_CATEGORIES }).notNull(),
  status: text('status', { enum: CITY_STATUSES }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
});

/* What is on in the city.
 *
 * Dates are TEXT in YYYY-MM-DD, not unix timestamps: an event runs for whole local days, and
 * a timestamp would invite a timezone to shift "this week" by one. `endDate` is null for a
 * single-day event, so a query for what is still running compares against
 * COALESCE(end_date, start_date).
 *
 * Also ships empty — an event nobody told us about is not a fact. */
export const cityEvents = sqliteTable('city_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleMn: text('title_mn').notNull(),
  titleEn: text('title_en').notNull(),
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date'), // null = a single day
  placeMn: text('place_mn'),
  placeEn: text('place_en'),
  descriptionMn: text('description_mn'),
  descriptionEn: text('description_en'),
  /* http(s) only, enforced by the same Zod rule as guides.website — this is rendered as a
   * link, and `javascript:` parses as a URL. */
  link: text('link'),
  status: text('status', { enum: CITY_STATUSES }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
