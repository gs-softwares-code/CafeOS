import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { categories, products, variants, modifiers, eq, asc, type Database } from '@cafeos/db';
import { requireAuth, requirePermission, type AppEnv } from '../middleware/auth.js';

const createProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  pricePaise: z.number().int().nonnegative(),
  gstRateBps: z.number().int().nonnegative().default(500),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export function createMenuRoutes(db: Database) {
  const app = new Hono<AppEnv>();

  // Public + POS menu snapshot endpoint
  app.get('/', async (c) => {
    const branchId = c.req.query('branchId');
    if (!branchId) {
      return c.json({ error: 'branchId query parameter is required' }, 400);
    }

    const [cats, prods, mods] = await Promise.all([
      db.select().from(categories).where(eq(categories.branchId, branchId)).orderBy(asc(categories.sortOrder)),
      db.select().from(products).where(eq(products.branchId, branchId)),
      db.select().from(modifiers).where(eq(modifiers.branchId, branchId)),
    ]);

    return c.json({
      categories: cats,
      products: prods,
      modifiers: mods,
      syncedAt: new Date().toISOString(),
    });
  });

  app.post(
    '/products',
    requireAuth,
    requirePermission('menu:write'),
    zValidator('json', createProductSchema),
    async (c) => {
      const session = c.get('session');
      const body = c.req.valid('json');
      const [created] = await db
        .insert(products)
        .values({
          branchId: session.branchId,
          ...body,
        })
        .returning();

      return c.json({ product: created }, 201);
    }
  );

  app.patch(
    '/products/:id/availability',
    requireAuth,
    requirePermission('menu:write'),
    zValidator('json', z.object({ isAvailable: z.boolean() })),
    async (c) => {
      const id = c.req.param('id');
      const { isAvailable } = c.req.valid('json');
      const [updated] = await db
        .update(products)
        .set({ isAvailable, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      if (!updated) return c.json({ error: 'Product not found' }, 404);
      return c.json({ product: updated });
    }
  );

  return app;
}

