import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { assertBalancedJournal, createExpenseSchema } from '@cafeos/shared';
import {
  orders,
  expenses,
  journalEntries,
  journalLines,
  auditLogs,
  notifications,
  eq,
  desc,
  type Database,
} from '@cafeos/db';
import { requireAuth, requirePermission, type AppEnv } from '../middleware/auth.js';

export function createAccountingRoutes(db: Database) {
  const app = new Hono<AppEnv>();

  app.get('/summary', requireAuth, requirePermission('accounting:read'), async (c) => {
    const session = c.get('session');
    const branchId = session.branchId;

    const [allOrders, allExpenses] = await Promise.all([
      db.select().from(orders).where(eq(orders.branchId, branchId)),
      db.select().from(expenses).where(eq(expenses.branchId, branchId)),
    ]);

    const grossSalesPaise = allOrders
      .filter((o) => o.paymentStatus !== 'REFUNDED')
      .reduce((s, o) => s + o.totalPaise, 0);
    const totalTaxPaise = allOrders
      .filter((o) => o.paymentStatus !== 'REFUNDED')
      .reduce((s, o) => s + o.taxPaise, 0);
    const totalExpensesPaise = allExpenses.reduce((s, e) => s + e.amountPaise, 0);
    const netRevenuePaise = grossSalesPaise - totalTaxPaise;
    const netProfitPaise = netRevenuePaise - totalExpensesPaise;

    return c.json({
      summary: {
        orderCount: allOrders.length,
        grossSalesPaise,
        netRevenuePaise,
        totalTaxPaise,
        totalExpensesPaise,
        netProfitPaise,
      },
    });
  });

  app.get('/journals', requireAuth, requirePermission('accounting:read'), async (c) => {
    const session = c.get('session');
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.branchId, session.branchId))
      .orderBy(desc(journalEntries.postedAt))
      .limit(30);

    return c.json({ journals: entries });
  });

  app.post(
    '/expenses',
    requireAuth,
    requirePermission('accounting:write'),
    zValidator('json', createExpenseSchema),
    async (c) => {
      const session = c.get('session');
      const branchId = session.branchId;
      const body = c.req.valid('json');

      const expense = await db.transaction(async (tx) => {
        const [exp] = await tx
          .insert(expenses)
          .values({
            branchId,
            category: body.category,
            description: body.description,
            amountPaise: body.amountPaise,
            paymentMode: body.paymentMode,
            recordedByUserId: session.userId,
          })
          .returning();

        const creditAccount = body.paymentMode === 'CASH' ? '1000' : '1010';
        const lines = [
          { accountCode: '5100', debitPaise: body.amountPaise, creditPaise: 0, memo: body.description },
          { accountCode: creditAccount, debitPaise: 0, creditPaise: body.amountPaise, memo: body.paymentMode },
        ];
        assertBalancedJournal(lines);

        const [entry] = await tx
          .insert(journalEntries)
          .values({
            branchId,
            referenceType: 'EXPENSE',
            referenceId: exp.id,
            description: `${body.category}: ${body.description}`,
          })
          .returning();

        await tx.insert(journalLines).values(
          lines.map((l) => ({ journalEntryId: entry.id, ...l }))
        );

        return exp;
      });

      return c.json({ expense }, 201);
    }
  );

  app.get('/audit-logs', requireAuth, requirePermission('audit:read'), async (c) => {
    const session = c.get('session');
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.branchId, session.branchId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    const alerts = await db
      .select()
      .from(notifications)
      .where(eq(notifications.branchId, session.branchId))
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    return c.json({ auditLogs: logs, notifications: alerts });
  });

  return app;
}

