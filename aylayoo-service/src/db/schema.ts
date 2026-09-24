import { sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const PLACE_CATEGORIES = ['nature', 'historical', 'city', 'cultural'] as const;
export const GUIDE_TYPES = ['company', 'individual'] as const;
export const GUIDE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const TRIP_TYPES = ['city', 'countryside'] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
export type TripType = (typeof TRIP_TYPES)[number];

export const aimags = sqliteTable('aimags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  nameMn: text('name_mn').notNull(),
  nameEn: text('name_en').notNull(),
  region: text('region'),
  descriptionMn: text('description_mn'),
  descriptionEn: text('description_en'),
  imageUrl: text('image_url'),
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
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  images: text('images', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  isMustSee: integer('is_must_see', { mode: 'boolean' }).notNull().default(false),
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
});

export const contactMessages = sqliteTable('contact_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const admins = sqliteTable('admins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});
