import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { adminRoutes } from './routes/admin';
import { aimagRoutes } from './routes/aimags';
import { cityRoutesApi } from './routes/city';
import { contactRoutes } from './routes/contact';
import { contentRoutes } from './routes/content';
import { guideRoutes } from './routes/guides';
import { placeRoutes } from './routes/places';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.use('*', logger());

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
app.route('/api/city', cityRoutesApi); // the Ulaanbaatar section: itineraries, routes, food, tips, phrases, events
app.route('/api/contact', contactRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api', contentRoutes); // /api/facts, /api/team, /api/images/*

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Something went wrong' }, 500);
});

export default app;
