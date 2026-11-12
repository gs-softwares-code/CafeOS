import { randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  assertBalancedJournal,
  calculateLineTax,
  createOrderSchema,
  KDS_STATUSES,
  refundOrderSchema,
  type GstScheme,
  type TaxMode,
} from '@cafeos/shared';
import {
  orders,
  orderItems,
  orderEvents,
  payments,
  paymentEvents,
  refunds,
  products,
  taxConfigs,
  recipes,
  inventory,
  stockMovements,
  syncEvents,
  auditLogs,
  journalEntries,
  journalLines,
  notifications,
  eq,
  and,
  desc,
  inArray,
  sql,
  type Database,
} from '@cafeos/db';
import { requireAuth, requirePermission, type AppEnv } from '../middleware/auth.js';

export function createOrderRoutes(db: Database) {
  const app = new Hono<AppEnv>();

  // Public high-entropy order tracking (no PII, no cross-tenant exposure)
  app.get('/track/:trackingToken', async (c) => {
    const trackingToken = c.req.param('trackingToken');
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        kdsStatus: orders.kdsStatus,
        paymentStatus: orders.paymentStatus,
        totalPaise: orders.totalPaise,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.trackingToken, trackingToken))
      .limit(1);

    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    const items = await db
      .select({
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        kdsItemStatus: orderItems.kdsItemStatus,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    return c.json({ order, items });
  });

  // Idempotent order creation with strict tenant isolation & server-authoritative pricing
  app.post(
    '/',
    requireAuth,
    requirePermission('pos:bill'),
    zValidator('json', createOrderSchema),
    async (c) => {
      const session = c.get('session');
      const branchId = session.branchId; // Always enforce tenant from verified session
      const input = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.clientTransactionId, input.clientTransactionId),
            eq(orders.branchId, branchId)
          )
        )
        .limit(1);

      if (existing) {
        return c.json({ order: existing, deduplicated: true }, 200);
      }

      const productIds = input.items.map((i) => i.productId);
      const dbProducts = await db
        .select()
        .from(products)
        .where(and(eq(products.branchId, branchId), inArray(products.id, productIds)));
      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      const [taxCfg] = await db
        .select()
        .from(taxConfigs)
        .where(eq(taxConfigs.branchId, branchId))
        .limit(1);

      const scheme = (taxCfg?.scheme ?? 'REGULAR') as GstScheme;
      const taxMode = (taxCfg?.taxMode ?? 'EXCLUSIVE') as TaxMode;

      let subtotalPaise = 0;
      let discountPaise = 0;
      let cgstTotalPaise = 0;
      let sgstTotalPaise = 0;
      let igstTotalPaise = 0;
      let taxPaise = 0;
      let totalPaise = 0;
      let priceMismatchDetected = false;

      const computedItems = input.items.map((item) => {
        const dbProduct = productMap.get(item.productId);
        // Server-authoritative pricing for live orders; offline orders honour receipt price & flag drift
        let authoritativeUnitPrice = item.unitPricePaise;
        let authoritativeGstBps = item.gstRateBps;
        let authoritativeName = item.productName;

        if (dbProduct) {
          authoritativeName = dbProduct.name;
          authoritativeGstBps = dbProduct.gstRateBps;
          if (!input.isOfflineCreated) {
            authoritativeUnitPrice = dbProduct.pricePaise;
          } else if (dbProduct.pricePaise !== item.unitPricePaise) {
            priceMismatchDetected = true;
          }
        }

        const modifiersTotal = item.modifiers.reduce((sum, m) => sum + m.pricePaise, 0);
        const effectiveUnitPrice = authoritativeUnitPrice + modifiersTotal;
        const breakdown = calculateLineTax(
          {
            unitPricePaise: effectiveUnitPrice,
            quantity: item.quantity,
            gstRateBps: authoritativeGstBps,
            discountPaise: item.discountPaise,
          },
          { scheme, taxMode }
        );

        subtotalPaise += breakdown.subtotalPaise;
        discountPaise += breakdown.discountPaise;
        cgstTotalPaise += breakdown.cgstPaise;
        sgstTotalPaise += breakdown.sgstPaise;
        igstTotalPaise += breakdown.igstPaise;
        taxPaise += breakdown.totalTaxPaise;
        totalPaise += breakdown.lineTotalPaise;

        return {
          item: { ...item, productName: authoritativeName, unitPricePaise: authoritativeUnitPrice },
          breakdown,
        };
      });

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      const trackingToken = randomBytes(16).toString('hex');

      const createdOrder = await db.transaction(async (tx) => {
        const paidTotal = input.payments.reduce((s, p) => s + p.amountPaise, 0);
        const paymentStatus =
          paidTotal >= totalPaise && totalPaise > 0
            ? 'CAPTURED'
            : paidTotal > 0
              ? 'PARTIAL'
              : 'PENDING';

        const [order] = await tx
          .insert(orders)
          .values({
            clientTransactionId: input.clientTransactionId,
            trackingToken,
            orderNumber,
            branchId,
            tableId: input.tableId,
            customerId: input.customerId,
            createdByUserId: session.userId,
            orderType: input.orderType,
            kdsStatus: 'NEW',
            paymentStatus,
            subtotalPaise,
            discountPaise,
            taxPaise,
            totalPaise,
            notes: input.notes,
            isOfflineCreated: input.isOfflineCreated,
            offlineCreatedAt: input.offlineCreatedAt
              ? new Date(input.offlineCreatedAt)
              : null,
          })
          .returning();

        await tx.insert(orderEvents).values({
          orderId: order.id,
          branchId,
          actorUserId: session.userId,
          eventType: 'CREATED',
          toStatus: 'NEW',
        });

        for (const { item, breakdown } of computedItems) {
          await tx.insert(orderItems).values({
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            quantity: item.quantity,
            unitPricePaise: item.unitPricePaise,
            discountPaise: breakdown.discountPaise,
            taxPaise: breakdown.totalTaxPaise,
            lineTotalPaise: breakdown.lineTotalPaise,
            modifiersJson: item.modifiers,
            notes: item.notes,
          });

          const itemRecipes = await tx
            .select()
            .from(recipes)
            .where(eq(recipes.productId, item.productId));

          for (const recipe of itemRecipes) {
            const deductQty = Number(recipe.quantityRequired) * item.quantity;
            const [updatedInv] = await tx
              .update(inventory)
              .set({
                currentQty: sql`${inventory.currentQty} - ${deductQty}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(inventory.branchId, branchId),
                  eq(inventory.ingredientId, recipe.ingredientId)
                )
              )
              .returning();

            await tx.insert(stockMovements).values({
              branchId,
              ingredientId: recipe.ingredientId,
              deltaQty: (-deductQty).toFixed(3),
              reason: 'SALE_DEDUCTION',
              referenceId: order.id,
            });

            if (updatedInv && Number(updatedInv.currentQty) < 0) {
              await tx.insert(notifications).values({
                branchId,
                type: 'DISCREPANCY',
                title: 'Negative Stock Alert',
                message: `Order ${orderNumber} caused negative ingredient stock (${updatedInv.currentQty}).`,
              });
            }
          }
        }

        for (const pay of input.payments) {
          const [payment] = await tx
            .insert(payments)
            .values({
              idempotencyKey: pay.idempotencyKey,
              orderId: order.id,
              branchId,
              method: pay.method,
              status: 'CAPTURED',
              amountPaise: pay.amountPaise,
              reference: pay.reference,
            })
            .onConflictDoNothing({ target: payments.idempotencyKey })
            .returning();

          if (payment) {
            await tx.insert(paymentEvents).values({
              paymentId: payment.id,
              branchId,
              eventType: 'CAPTURED',
              metadata: { method: pay.method, amountPaise: pay.amountPaise },
            });
          }
        }

        // Double-entry accounting journal when payment is captured
        if (paidTotal > 0 && totalPaise > 0) {
          const primaryMethod = input.payments[0]?.method ?? 'CASH';
          const assetAccount = primaryMethod === 'CASH' ? '1000' : '1010';
          const revenuePaise = totalPaise - taxPaise;

          const lines = [
            { accountCode: assetAccount, debitPaise: totalPaise, creditPaise: 0, memo: `Order ${orderNumber}` },
            { accountCode: '4000', debitPaise: 0, creditPaise: revenuePaise, memo: 'Sales Revenue' },
          ];
          if (cgstTotalPaise > 0) {
            lines.push({ accountCode: '2100', debitPaise: 0, creditPaise: cgstTotalPaise, memo: 'CGST' });
          }
          if (sgstTotalPaise > 0) {
            lines.push({ accountCode: '2110', debitPaise: 0, creditPaise: sgstTotalPaise, memo: 'SGST' });
          }
          if (igstTotalPaise > 0) {
            lines.push({ accountCode: '2120', debitPaise: 0, creditPaise: igstTotalPaise, memo: 'IGST' });
          }

          assertBalancedJournal(lines);

          const [entry] = await tx
            .insert(journalEntries)
            .values({
              branchId,
              referenceType: 'ORDER',
              referenceId: order.id,
              description: `POS Sale ${orderNumber}`,
            })
            .returning();

          await tx.insert(journalLines).values(
            lines.map((l) => ({
              journalEntryId: entry.id,
              accountCode: l.accountCode,
              debitPaise: l.debitPaise,
              creditPaise: l.creditPaise,
              memo: l.memo,
            }))
          );
        }

        if (input.isOfflineCreated) {
          await tx.insert(syncEvents).values({
            branchId,
            clientTransactionId: input.clientTransactionId,
            status: priceMismatchDetected ? 'CONFLICT_REVIEW' : 'CONFIRMED',
            payload: { orderNumber: order.orderNumber, priceMismatchDetected },
          });
        }

        await tx.insert(auditLogs).values({
          branchId,
          actorUserId: session.userId,
          action: input.isOfflineCreated ? 'ORDER_SYNCED_OFFLINE' : 'ORDER_CREATED',
          entityType: 'order',
          entityId: order.id,
          metadata: { orderNumber, totalPaise, priceMismatchDetected },
        });

        return order;
      });

      return c.json({ order: createdOrder, deduplicated: false }, 201);
    }
  );

  // Tenant-scoped KDS queue
  app.get('/kds', requireAuth, requirePermission('kds:read'), async (c) => {
    const session = c.get('session');
    const activeOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.branchId, session.branchId))
      .orderBy(desc(orders.createdAt))
      .limit(50);

    return c.json({ orders: activeOrders });
  });

  // Tenant-scoped KDS status transition with order_events log
  app.patch(
    '/:id/kds-status',
    requireAuth,
    requirePermission('kds:update'),
    zValidator('json', z.object({ status: z.enum(KDS_STATUSES) })),
    async (c) => {
      const session = c.get('session');
      const id = c.req.param('id');
      const { status } = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.branchId, session.branchId)))
        .limit(1);

      if (!existing) return c.json({ error: 'Order not found' }, 404);

      const [updated] = await db.transaction(async (tx) => {
        const res = await tx
          .update(orders)
          .set({ kdsStatus: status, updatedAt: new Date() })
          .where(and(eq(orders.id, id), eq(orders.branchId, session.branchId)))
          .returning();

        await tx.insert(orderEvents).values({
          orderId: id,
          branchId: session.branchId,
          actorUserId: session.userId,
          eventType: 'KDS_STATUS',
          fromStatus: existing.kdsStatus,
          toStatus: status,
        });

        return res;
      });

      return c.json({ order: updated });
    }
  );

  // Tenant-scoped refund with reversing double-entry journal
  app.post(
    '/:id/refund',
    requireAuth,
    requirePermission('pos:refund'),
    zValidator('json', refundOrderSchema),
    async (c) => {
      const session = c.get('session');
      const id = c.req.param('id');
      const { amountPaise, reason } = c.req.valid('json');

      const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.branchId, session.branchId)))
        .limit(1);

      if (!order) return c.json({ error: 'Order not found' }, 404);

      const [payment] = await db
        .select()
        .from(payments)
        .where(and(eq(payments.orderId, order.id), eq(payments.branchId, session.branchId)))
        .limit(1);

      if (!payment) return c.json({ error: 'No captured payment found for order' }, 400);
      if (amountPaise > payment.amountPaise) {
        return c.json({ error: 'Refund exceeds captured payment amount' }, 400);
      }

      const refund = await db.transaction(async (tx) => {
        const [ref] = await tx
          .insert(refunds)
          .values({
            paymentId: payment.id,
            orderId: order.id,
            amountPaise,
            reason,
            approvedByUserId: session.userId,
          })
          .returning();

        await tx.insert(paymentEvents).values({
          paymentId: payment.id,
          branchId: session.branchId,
          eventType: 'REFUNDED',
          metadata: { amountPaise, reason },
        });

        await tx
          .update(orders)
          .set({ paymentStatus: 'REFUNDED', updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        const assetAccount = payment.method === 'CASH' ? '1000' : '1010';
        const lines = [
          { accountCode: '4000', debitPaise: amountPaise, creditPaise: 0, memo: `Refund ${order.orderNumber}` },
          { accountCode: assetAccount, debitPaise: 0, creditPaise: amountPaise, memo: reason },
        ];
        assertBalancedJournal(lines);

        const [entry] = await tx
          .insert(journalEntries)
          .values({
            branchId: session.branchId,
            referenceType: 'REFUND',
            referenceId: ref.id,
            description: `Refund for ${order.orderNumber}`,
          })
          .returning();

        await tx.insert(journalLines).values(
          lines.map((l) => ({ journalEntryId: entry.id, ...l }))
        );

        await tx.insert(auditLogs).values({
          branchId: session.branchId,
          actorUserId: session.userId,
          action: 'ORDER_REFUNDED',
          entityType: 'order',
          entityId: order.id,
          metadata: { amountPaise, reason },
        });

        return ref;
      });

      return c.json({ refund }, 201);
    }
  );

  return app;
}
