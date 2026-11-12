import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { hasPermission, type Permission } from '@cafeos/shared';
import { verifySessionToken, type SessionPayload } from '../lib/crypto.js';

export type AppEnv = {
  Variables: {
    session: SessionPayload;
  };
};

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set to at least 32 characters in production');
    }
    return 'dev-only-insecure-session-secret-change-in-prod-123456';
  }
  return secret;
}

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const cookieToken = getCookie(c, 'cafeos_session');
  const authHeader = c.req.header('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const session = verifySessionToken(token, getSessionSecret());
  if (!session) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  c.set('session', session);
  await next();
}

export function requirePermission(permission: Permission) {
  return async (c: Context<AppEnv>, next: Next) => {
    const session = c.get('session');
    if (!session) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    if (!hasPermission(session.role, permission)) {
      return c.json({ error: `Forbidden: missing ${permission}` }, 403);
    }
    await next();
  };
}

