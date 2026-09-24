import { createMiddleware } from 'hono/factory';
import { sign, verify } from 'hono/jwt';
import type { AppEnv } from '../types';

const EIGHT_HOURS = 60 * 60 * 8;

export const createToken = (adminId: number, secret: string) =>
  sign({ sub: adminId, exp: Math.floor(Date.now() / 1000) + EIGHT_HOURS }, secret, 'HS256');

// Protects admin routes. Expects header:  Authorization: Bearer <token>
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    c.set('adminId', Number(payload.sub));
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
  await next();
});
