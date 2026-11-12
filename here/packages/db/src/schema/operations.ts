import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { branches, users } from './identity.js';
import { products, variants } from './catalog.js';

export const cafeTables = pgTable('cafe_tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  label: text('label').notNull(), // e.g., T1, Patio-2
  capacity: integer('capacity').notNull().default(4),
  qrToken: text('qr_token').notNull().unique(),
  status: text('status').notNull().default('AVAILABLE'), // AVAILABLE | OCCUPIED | RESERVED
});

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  preferences: text('preferences'),
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const loyaltyAccounts = pgTable('loyalty_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' })
    .unique(),
  pointsBalance: integer('points_balance').notNull().default(0),
  tier: text('tier').notNull().default('BRONZE'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientTransactionId: uuid('client_transaction_id').notNull().unique(),
    trackingToken: text('tracking_token').notNull().unique(),
    orderNumber: text('order_number').notNull(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => cafeTables.id, {
      onDelete: 'set null',
    }),
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    orderType: text('order_type').notNull(), // DINE_IN | TAKEAWAY | DELIVERY | QR_DINE_IN
    kdsStatus: text('kds_status').notNull().default('NEW'),
    paymentStatus: text('payment_status').notNull().default('PENDING'),
    isHeld: boolean('is_held').notNull().default(false),
    subtotalPaise: integer('subtotal_paise').notNull(),
    discountPaise: integer('discount_paise').notNull().default(0),
    taxPaise: integer('tax_paise').notNull().default(0),
    totalPaise: integer('total_paise').notNull(),
    notes: text('notes'),
    isOfflineCreated: boolean('is_offline_created').notNull().default(false),
    offlineCreatedAt: timestamp('offline_created_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('orders_branch_created_idx').on(table.branchId, table.createdAt),
    index('orders_kds_status_idx').on(table.branchId, table.kdsStatus),
  ]
);

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  variantId: uuid('variant_id').references(() => variants.id, {
    onDelete: 'set null',
  }),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPricePaise: integer('unit_price_paise').notNull(),
  discountPaise: integer('discount_paise').notNull().default(0),
  taxPaise: integer('tax_paise').notNull().default(0),
  lineTotalPaise: integer('line_total_paise').notNull(),
  modifiersJson: jsonb('modifiers_json').$type<
    Array<{ modifierId: string; name: string; pricePaise: number }>
  >(),
  kdsItemStatus: text('kds_item_status').notNull().default('NEW'),
  notes: text('notes'),
});

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    idempotencyKey: uuid('idempotency_key').notNull(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    method: text('method').notNull(), // CASH | UPI | CARD | RAZORPAY_ONLINE | WALLET
    status: text('status').notNull().default('CAPTURED'),
    amountPaise: integer('amount_paise').notNull(),
    gatewayOrderId: text('gateway_order_id'),
    gatewayPaymentId: text('gateway_payment_id'),
    reference: text('reference'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('payments_idempotency_idx').on(table.idempotencyKey)]
);

export const refunds = pgTable('refunds', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  amountPaise: integer('amount_paise').notNull(),
  reason: text('reason').notNull(),
  approvedByUserId: uuid('approved_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' })
    .unique(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  cgstPaise: integer('cgst_paise').notNull().default(0),
  sgstPaise: integer('sgst_paise').notNull().default(0),
  igstPaise: integer('igst_paise').notNull().default(0),
  totalPaise: integer('total_paise').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
});

export const taxConfigs = pgTable('tax_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' })
    .unique(),
  scheme: text('scheme').notNull().default('REGULAR'), // UNREGISTERED | COMPOSITION | REGULAR
  taxMode: text('tax_mode').notNull().default('EXCLUSIVE'), // EXCLUSIVE | INCLUSIVE
  defaultGstRateBps: integer('default_gst_rate_bps').notNull().default(500),
  gstin: text('gstin'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const expenses = pgTable('expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  category: text('category').notNull(), // RENT | UTILITIES | SALARY | SUPPLIES | OTHER
  description: text('description').notNull(),
  amountPaise: integer('amount_paise').notNull(),
  paymentMode: text('payment_mode').notNull().default('CASH'),
  incurredAt: timestamp('incurred_at', { withTimezone: true }).defaultNow().notNull(),
  recordedByUserId: uuid('recorded_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
});

export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  customerId: uuid('customer_id').references(() => customers.id, {
    onDelete: 'set null',
  }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('audit_logs_branch_idx').on(table.branchId, table.createdAt)]
);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // LOW_STOCK | DISCREPANCY | ORDER_READY | BACKUP
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const syncEvents = pgTable('sync_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  clientTransactionId: uuid('client_transaction_id').notNull().unique(),
  status: text('status').notNull(), // CONFIRMED | CONFLICT_REVIEW
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orderEvents = pgTable('order_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  actorUserId: uuid('actor_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  eventType: text('event_type').notNull(), // CREATED | KDS_STATUS | HELD | RESUMED | REFUNDED
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const paymentEvents = pgTable('payment_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // CAPTURED | WEBHOOK_VERIFIED | REFUNDED
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    code: text('code').notNull(), // e.g. 1000, 1010, 4000
    name: text('name').notNull(),
    type: text('type').notNull(), // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  },
  (table) => [uniqueIndex('accounts_branch_code_idx').on(table.branchId, table.code)]
);

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  referenceType: text('reference_type').notNull(), // ORDER | EXPENSE | PURCHASE | REFUND
  referenceId: uuid('reference_id').notNull(),
  description: text('description').notNull(),
  postedAt: timestamp('posted_at', { withTimezone: true }).defaultNow().notNull(),
});

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  journalEntryId: uuid('journal_entry_id')
    .notNull()
    .references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountCode: text('account_code').notNull(),
  debitPaise: integer('debit_paise').notNull().default(0),
  creditPaise: integer('credit_paise').notNull().default(0),
  memo: text('memo'),
});

