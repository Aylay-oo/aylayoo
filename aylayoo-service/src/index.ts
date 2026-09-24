import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { adminRoutes } from './routes/admin';
import { aimagRoutes } from './routes/aimags';
import { contactRoutes } from './routes/contact';
import { contentRoutes } from './routes/content';
import { guideRoutes } from './routes/guides';
import { placeRoutes } from './routes/places';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.use('*', logger());

// Only let our own front ends call the API from a browser.
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      const allowed = (c.env.ALLOWED_ORIGINS as string).split(',').map((s) => s.trim());
      return allowed.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/', (c) => c.json({ name: 'aylayoo-service', status: 'ok' }));

app.route('/api/aimags', aimagRoutes);
app.route('/api/places', placeRoutes);
app.route('/api/guides', guideRoutes);
app.route('/api/contact', contactRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api', contentRoutes); // /api/facts, /api/team, /api/images/*

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Something went wrong' }, 500);
});

export default app;
