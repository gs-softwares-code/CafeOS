import type { Context, Next } from 'hono';

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/**
 * Simple sliding-window rate limiter keyed by client IP + route prefix.
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();
    const bucket = store.get(key);

    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    if (bucket.count >= maxRequests) {
      return c.json({ error: 'Too many requests, please slow down.' }, 429);
    }

    bucket.count += 1;
    await next();
  };
}

