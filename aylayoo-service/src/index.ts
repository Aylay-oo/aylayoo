import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getDb } from './db/client';
import { errorSummary, logLine } from './lib/logging';
import { runRetention } from './lib/retention';
import { adminRoutes } from './routes/admin';
import { aimagRoutes } from './routes/aimags';
import { cityRoutesApi } from './routes/city';
import { contactRoutes } from './routes/contact';
import { contentRoutes } from './routes/content';
import { guideRoutes } from './routes/guides';
import { placeRoutes } from './routes/places';
import { tourRoutes } from './routes/tours';
import { tripRoutes } from './routes/trips';
import type { AppEnv, Env } from './types';

/* Exported by name as well as inside the default handler below, because the specs drive it
 * directly with `app.request(path, init, env)` and the default export is no longer the app. */
export const app = new Hono<AppEnv>();

/* The custom print function matters: hono's default writes the path *with* its query string.
 * See lib/logging.ts for what these logs may and may not contain. */
app.use('*', logger(logLine));

/* An Origin header is compared byte for byte by the browser, so the only forgiving thing we
 * can do is normalise what the config and the request agree to mean: drop surrounding space,
 * lower the case (a scheme and host are case-insensitive, and browsers already send them
 * lowercased) and drop a trailing slash, which an Origin never carries but an entry copied
 * out of the address bar always does. Everything beyond that stays an exact match — no
 * suffix or wildcard matching, because `endsWith('aylayoo.com')` would also hand the API to
 * `evil-aylayoo.com`. A new front-end domain means a new entry in wrangler.jsonc. */
const normaliseOrigin = (value: string) => value.trim().toLowerCase().replace(/\/$/, '');

// Only let our own front ends call the API from a browser.
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      // Missing entirely would otherwise throw here and turn every API call into a 500, which
      // reads as "the server is broken" rather than "the Worker is misconfigured".
      const configured = c.env.ALLOWED_ORIGINS;
      if (!configured) {
        console.error('ALLOWED_ORIGINS is not set — refusing every cross-origin request');
        return null;
      }

      const allowed = configured.split(',').map(normaliseOrigin).filter(Boolean);
      // Echo back the origin exactly as the browser sent it; it has to match what the browser
      // compares against, not our normalised form.
      return allowed.includes(normaliseOrigin(origin)) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/', (c) => c.json({ name: 'aylayoo-service', status: 'ok' }));

app.route('/api/aimags', aimagRoutes);
app.route('/api/places', placeRoutes);
app.route('/api/guides', guideRoutes);
app.route('/api/city/tours', tourRoutes); // guide-led tours (Phase 3)
app.route('/api/city', cityRoutesApi); // the Ulaanbaatar section: itineraries, routes, food, tips, phrases, events
app.route('/api/trips', tripRoutes); // traveller trip requests (Phase 3)
app.route('/api/contact', contactRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api', contentRoutes); // /api/facts, /api/team, /api/images/*

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  /* The summary, never the error object. A D1 error carries the failing statement and its
   * bound parameters, so logging `err` here could write a guide's phone number and email
   * address into a retained log the moment a registration insert failed. */
  console.error(errorSummary(err));
  return c.json({ error: 'Something went wrong' }, 500);
});

/* The default export is a handler object rather than the Hono app, because this Worker now has
 * a second entry point: the daily Cron Trigger declared in wrangler.jsonc.
 *
 * `scheduled` logs counts and nothing else. The rows it touches are the ones holding travellers'
 * phone numbers and email addresses, so naming them here would write the data into a retained
 * log at the moment we promised to delete it — see lib/logging.ts and lib/retention.ts.
 *
 * A throw inside `scheduled` is caught and logged rather than left to propagate: an unhandled
 * rejection is reported by Cloudflare as a failed invocation with no detail of our own, and the
 * passes are idempotent, so the right response to a failure is a recorded error and another
 * attempt tomorrow. If the cron stops running altogether, the manual procedure in README.md is
 * the backstop and S. Bolorsaikhan owns it.
 */
export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledController, env: Env, _ctx: ExecutionContext) {
    try {
      const { contactsCleared, requestsDeleted } = await runRetention(getDb(env.DB));
      console.log(
        `retention cron=${event.cron} contacts_cleared=${contactsCleared} requests_deleted=${requestsDeleted}`,
      );
    } catch (err) {
      console.error(`retention failed: ${errorSummary(err)}`);
    }
  },
};
