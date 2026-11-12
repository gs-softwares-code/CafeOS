import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  createIngredientSchema,
  createRecipeSchema,
  adjustStockSchema,
} from '@cafeos/shared';
import {
  ingredients,
  inventory,
  recipes,
  stockMovements,
  products,
  eq,
  and,
  desc,
  sql,
  type Database,
} from '@cafeos/db';
import { requireAuth, requirePermission, type AppEnv } from '../middleware/auth.js';

export function createInventoryRoutes(db: Database) {
  const app = new Hono<AppEnv>();

  app.get('/', requireAuth, requirePermission('inventory:read'), async (c) => {
    const session = c.get('session');
    const branchId = session.branchId;

    const rows = await db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        unit: ingredients.unit,
        lowStockThreshold: ingredients.lowStockThreshold,
        avgCostPerUnitPaise: ingredients.avgCostPerUnitPaise,
        currentQty: inventory.currentQty,
        updatedAt: inventory.updatedAt,
      })
      .from(ingredients)
      .leftJoin(
        inventory,
        and(eq(inventory.ingredientId, ingredients.id), eq(inventory.branchId, branchId))
      )
      .where(eq(ingredients.branchId, branchId));

    const recentMovements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.branchId, branchId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(30);

    return c.json({ items: rows, movements: recentMovements });
  });

  app.post(
    '/ingredients',
    requireAuth,
    requirePermission('inventory:write'),
    zValidator('json', createIngredientSchema),
    async (c) => {
      const session = c.get('session');
      const branchId = session.branchId;
      const body = c.req.valid('json');

      const created = await db.transaction(async (tx) => {
        const [ing] = await tx
          .insert(ingredients)
          .values({
            branchId,
            name: body.name,
            unit: body.unit,
            lowStockThreshold: body.lowStockThreshold.toFixed(3),
            avgCostPerUnitPaise: body.avgCostPerUnitPaise,
          })
          .returning();

        await tx.insert(inventory).values({
          branchId,
          ingredientId: ing.id,
          currentQty: body.initialQty.toFixed(3),
        });

        if (body.initialQty > 0) {
          await tx.insert(stockMovements).values({
            branchId,
            ingredientId: ing.id,
            deltaQty: body.initialQty.toFixed(3),
            reason: 'ADJUSTMENT',
          });
        }

        return ing;
      });

      return c.json({ ingredient: created }, 201);
    }
  );

  app.post(
    '/recipes',
    requireAuth,
    requirePermission('inventory:write'),
    zValidator('json', createRecipeSchema),
    async (c) => {
      const session = c.get('session');
      const body = c.req.valid('json');

      const [prod] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, body.productId), eq(products.branchId, session.branchId)))
        .limit(1);

      if (!prod) return c.json({ error: 'Product not found in branch' }, 404);

      const [recipe] = await db
        .insert(recipes)
        .values({
          productId: body.productId,
          ingredientId: body.ingredientId,
          quantityRequired: body.quantityRequired.toFixed(3),
        })
        .returning();

      return c.json({ recipe }, 201);
    }
  );

  app.post(
    '/adjust',
    requireAuth,
    requirePermission('inventory:write'),
    zValidator('json', adjustStockSchema),
    async (c) => {
      const session = c.get('session');
      const branchId = session.branchId;
      const body = c.req.valid('json');

      const updated = await db.transaction(async (tx) => {
        const [inv] = await tx
          .update(inventory)
          .set({
            currentQty: sql`${inventory.currentQty} + ${body.deltaQty}`,
            updatedAt: new Date(),
          })
          .where(
            and(eq(inventory.branchId, branchId), eq(inventory.ingredientId, body.ingredientId))
          )
          .returning();

        if (!inv) return null;

        await tx.insert(stockMovements).values({
          branchId,
          ingredientId: body.ingredientId,
          deltaQty: body.deltaQty.toFixed(3),
          reason: body.reason,
        });

        return inv;
      });

      if (!updated) return c.json({ error: 'Inventory item not found' }, 404);
      return c.json({ inventory: updated });
    }
  );

  return app;
}

