import { z } from 'zod';
import { GUIDE_STATUSES, GUIDE_TYPES, PLACE_CATEGORIES, TRIP_TYPES } from '../db/schema';

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const guideRegisterSchema = z.object({
  type: z.enum(GUIDE_TYPES),
  name: z.string().trim().min(2).max(120),
  bioMn: optionalText(2000),
  bioEn: optionalText(2000),
  languages: z.array(z.string().trim().min(2).max(5)).min(1).max(10), // e.g. ["mn","en","ru"]
  tripTypes: z.array(z.enum(TRIP_TYPES)).min(1),
  aimagIds: z.array(z.number().int().positive()).min(1).max(22),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email(),
  website: z.string().trim().url().optional().or(z.literal('')),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  message: z.string().trim().min(5).max(3000),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const guideStatusSchema = z.object({ status: z.enum(GUIDE_STATUSES) });

export const placeSchema = z.object({
  aimagId: z.number().int().positive(),
  nameMn: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  descriptionMn: optionalText(5000),
  descriptionEn: optionalText(5000),
  category: z.enum(PLACE_CATEGORIES),
  lat: z.number().min(41).max(53), // Mongolia's latitude range
  lng: z.number().min(87).max(120), // Mongolia's longitude range
  images: z.array(z.string()).max(20).optional(),
  isMustSee: z.boolean().optional(),
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
});
