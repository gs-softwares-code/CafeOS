import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  assertBalancedJournal,
  createSupplierSchema,
  createPurchaseOrderSchema,
} from '@cafeos/shared';
import {
  suppliers,
  purchaseOrders,
  purchaseItems,
  goodsReceipts,
  inventory,
  stockMovements,
  journalEntries,
  journalLines,
  eq,
  and,
  desc,
  sql,
  type Database,
} from '@cafeos/db';
import { requireAuth, requirePermission, type AppEnv } from '../middleware/auth.js';

export function createProcurementRoutes(db: Database) {
  const app = new Hono<AppEnv>();

  app.get('/suppliers', requireAuth, requirePermission('purchase:read'), async (c) => {
    const session = c.get('session');
    const list = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.branchId, session.branchId));
    return c.json({ suppliers: list });
  });

  app.post(
    '/suppliers',
    requireAuth,
    requirePermission('purchase:write'),
    zValidator('json', createSupplierSchema),
    async (c) => {
      const session = c.get('session');
      const body = c.req.valid('json');
      const [created] = await db
        .insert(suppliers)
        .values({ branchId: session.branchId, ...body })
        .returning();
      return c.json({ supplier: created }, 201);
    }
  );

  app.get('/orders', requireAuth, requirePermission('purchase:read'), async (c) => {
    const session = c.get('session');
    const list = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.branchId, session.branchId))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(50);
    return c.json({ purchaseOrders: list });
  });

  app.post(
    '/orders',
    requireAuth,
    requirePermission('purchase:write'),
    zValidator('json', createPurchaseOrderSchema),
    async (c) => {
      const session = c.get('session');
      const branchId = session.branchId;
      const body = c.req.valid('json');

      const totalPaise = body.items.reduce(
        (sum, i) => sum + Math.round(i.quantity * i.unitCostPaise),
        0
      );

      const po = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(purchaseOrders)
          .values({
            branchId,
            supplierId: body.supplierId,
            status: 'ORDERED',
            totalPaise,
            invoiceNumber: body.invoiceNumber,
          })
          .returning();

        for (const item of body.items) {
          await tx.insert(purchaseItems).values({
            purchaseOrderId: created.id,
            ingredientId: item.ingredientId,
            quantity: item.quantity.toFixed(3),
            unitCostPaise: item.unitCostPaise,
            totalCostPaise: Math.round(item.quantity * item.unitCostPaise),
          });
        }

        return created;
      });

      return c.json({ purchaseOrder: po }, 201);
    }
  );

  // Transactional Goods Receipt: updates inventory, stock ledger & double-entry AP journal
  app.post(
    '/orders/:id/receive',
    requireAuth,
    requirePermission('purchase:receive'),
    async (c) => {
      const session = c.get('session');
      const branchId = session.branchId;
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Purchase order ID is required' }, 400);

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.branchId, branchId)))
        .limit(1);

      if (!po) return c.json({ error: 'Purchase order not found' }, 404);
      if (po.status === 'RECEIVED') {
        return c.json({ error: 'Purchase order already received' }, 400);
      }

      const items = await db
        .select()
        .from(purchaseItems)
        .where(eq(purchaseItems.purchaseOrderId, po.id));

      const receipt = await db.transaction(async (tx) => {
        const [gr] = await tx
          .insert(goodsReceipts)
          .values({
            branchId,
            purchaseOrderId: po.id,
            invoiceNumber: po.invoiceNumber,
          })
          .returning();

        await tx
          .update(purchaseOrders)
          .set({ status: 'RECEIVED', receivedAt: new Date() })
          .where(eq(purchaseOrders.id, po.id));

        for (const item of items) {
          const qty = Number(item.quantity);
          await tx
            .update(inventory)
            .set({
              currentQty: sql`${inventory.currentQty} + ${qty}`,
              updatedAt: new Date(),
            })
            .where(
              and(eq(inventory.branchId, branchId), eq(inventory.ingredientId, item.ingredientId))
            );

          await tx.insert(stockMovements).values({
            branchId,
            ingredientId: item.ingredientId,
            deltaQty: qty.toFixed(3),
            reason: 'PURCHASE_RECEIPT',
            referenceId: gr.id,
          });
        }

        if (po.totalPaise > 0) {
          const lines = [
            { accountCode: '5000', debitPaise: po.totalPaise, creditPaise: 0, memo: 'Purchase Receipt' },
            { accountCode: '2000', debitPaise: 0, creditPaise: po.totalPaise, memo: 'Accounts Payable' },
          ];
          assertBalancedJournal(lines);

          const [entry] = await tx
            .insert(journalEntries)
            .values({
              branchId,
              referenceType: 'PURCHASE',
              referenceId: gr.id,
              description: `Goods Receipt for PO ${po.id.slice(0, 8)}`,
            })
            .returning();

          await tx.insert(journalLines).values(
            lines.map((l) => ({ journalEntryId: entry.id, ...l }))
          );
        }

        return gr;
      });

      return c.json({ goodsReceipt: receipt });
    }
  );

  return app;
}
