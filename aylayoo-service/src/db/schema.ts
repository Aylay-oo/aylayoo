import { sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const PLACE_CATEGORIES = ['nature', 'historical', 'city', 'cultural'] as const;
// "driver" are the drivers with their own vehicle the front end lists next to the guides.
export const GUIDE_TYPES = ['company', 'individual', 'driver'] as const;
export const GUIDE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const TRIP_TYPES = ['city', 'countryside'] as const;
// "contact" = someone writing to a guide; "booking" = someone ordering a listed trip.
export const CONTACT_KINDS = ['contact', 'booking'] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
export type GuideType = (typeof GUIDE_TYPES)[number];
export type TripType = (typeof TRIP_TYPES)[number];
export type ContactKind = (typeof CONTACT_KINDS)[number];

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
  experienceYears: integer('experience_years'),
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
