import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { loginSchema, pinLoginSchema, type Role } from '@cafeos/shared';
import { users, eq, and, type Database } from '@cafeos/db';
import { verifySecret, signSessionToken } from '../lib/crypto.js';
import { getSessionSecret, requireAuth, type AppEnv } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export function createAuthRoutes(db: Database) {
  const app = new Hono<AppEnv>();

  app.post(
    '/login',
    rateLimit(15, 60_000),
    zValidator('json', loginSchema),
    async (c) => {
      const { email, password } = c.req.valid('json');
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!user || !user.isActive || !(await verifySecret(password, user.passwordHash))) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }

      const token = signSessionToken(
        {
          userId: user.id,
          branchId: user.branchId,
          role: user.role as Role,
          name: user.name,
        },
        getSessionSecret()
      );

      setCookie(c, 'cafeos_session', token, {
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 12,
      });

      return c.json({
        user: {
          id: user.id,
          branchId: user.branchId,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }
  );

  app.post(
    '/pin-login',
    rateLimit(20, 60_000),
    zValidator('json', pinLoginSchema),
    async (c) => {
      const { branchId, pin } = c.req.valid('json');
      const branchUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.branchId, branchId), eq(users.isActive, true)));

      let matchedUser: (typeof branchUsers)[number] | undefined;
      for (const candidate of branchUsers) {
        if (candidate.pinHash && (await verifySecret(pin, candidate.pinHash))) {
          matchedUser = candidate;
          break;
        }
      }

      if (!matchedUser) {
        return c.json({ error: 'Invalid staff PIN' }, 401);
      }

      const token = signSessionToken(
        {
          userId: matchedUser.id,
          branchId: matchedUser.branchId,
          role: matchedUser.role as Role,
          name: matchedUser.name,
        },
        getSessionSecret(),
        60 * 60 * 8
      );

      setCookie(c, 'cafeos_session', token, {
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 8,
      });

      return c.json({
        user: {
          id: matchedUser.id,
          branchId: matchedUser.branchId,
          name: matchedUser.name,
          role: matchedUser.role,
        },
      });
    }
  );

  app.post('/logout', (c) => {
    deleteCookie(c, 'cafeos_session', { path: '/' });
    return c.json({ ok: true });
  });

  app.get('/me', requireAuth, (c) => {
    return c.json({ user: c.get('session') });
  });

  return app;
}

