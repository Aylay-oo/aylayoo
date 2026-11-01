import { z } from 'zod';
import {
  CONTACT_KINDS, GUIDE_STATUSES, GUIDE_TYPES, PLACE_CATEGORIES, TRIP_TYPES,
} from '../db/schema';

const optionalText = (max: number) => z.string().trim().max(max).optional();

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
    /* http(s) only. Zod's .url() accepts anything URL() parses, which includes
     * `javascript:alert(1)` and a `data:` document — and this field is rendered as a link on the
     * guide's public page and in the admin queue. The front end guards it as well, for rows
     * stored before this and for anything inserted by hand. */
    website: z
      .string()
      .trim()
      .url()
      .refine((value) => /^https?:$/.test(new URL(value).protocol), {
        message: 'Website must be an http or https address',
      })
      .optional()
      .or(z.literal('')),
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
