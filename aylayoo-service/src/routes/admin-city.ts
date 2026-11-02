/* Admin CRUD for the six city resources.
 *
 * Mounted inside routes/admin.ts *after* its `use('*', requireAdmin)`, so every route below is
 * already behind a bearer token — there is no auth code here, and none should be added.
 *
 * Each resource is one line: a path, its table and its two schemas. Everything else is in
 * lib/crud.ts, which explains why that factory exists.
 */

import { Hono } from 'hono';
import {
  cityEvents, cityFood, cityItineraries, cityRoutes, cityTips, phrases,
} from '../db/schema';
import { registerCityCrud, type CrudResource } from '../lib/crud';
import {
  cityEventSchema, cityEventUpdateSchema, cityFoodSchema, cityFoodUpdateSchema,
  cityItinerarySchema, cityItineraryUpdateSchema, cityRouteSchema, cityRouteUpdateSchema,
  cityTipSchema, cityTipUpdateSchema, phraseSchema, phraseUpdateSchema,
} from '../lib/validators';
import type { AppEnv } from '../types';

export const adminCityRoutes = new Hono<AppEnv>();

/* The paths match the public ones under /api/city, so the two sides cannot drift: an editor and
 * a visitor are looking at the same resource under the same name. */
const RESOURCES: readonly CrudResource[] = [
  {
    path: 'itineraries',
    table: cityItineraries,
    label: 'Itinerary',
    create: cityItinerarySchema,
    update: cityItineraryUpdateSchema,
  },
  {
    path: 'routes',
    table: cityRoutes,
    label: 'Route',
    create: cityRouteSchema,
    update: cityRouteUpdateSchema,
  },
  {
    path: 'food',
    table: cityFood,
    label: 'Place to eat',
    create: cityFoodSchema,
    update: cityFoodUpdateSchema,
  },
  {
    path: 'tips',
    table: cityTips,
    label: 'Tip',
    create: cityTipSchema,
    update: cityTipUpdateSchema,
  },
  {
    path: 'phrases',
    table: phrases,
    label: 'Phrase',
    create: phraseSchema,
    update: phraseUpdateSchema,
  },
  {
    path: 'events',
    table: cityEvents,
    label: 'Event',
    create: cityEventSchema,
    update: cityEventUpdateSchema,
  },
];

for (const resource of RESOURCES) registerCityCrud(adminCityRoutes, resource);
