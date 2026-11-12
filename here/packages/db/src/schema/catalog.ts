import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { branches } from './identity.js';

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    pricePaise: integer('price_paise').notNull(),
    gstRateBps: integer('gst_rate_bps').notNull().default(500),
    hsnSacCode: text('hsn_sac_code').default('996331'),
    isVeg: boolean('is_veg').notNull().default(true),
    isAvailable: boolean('is_available').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    availableSchedule: jsonb('available_schedule').$type<{
      startTime?: string;
      endTime?: string;
    }>(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('products_branch_cat_idx').on(table.branchId, table.categoryId)]
);

export const variants = pgTable('variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g. Regular, Large
  priceDeltaPaise: integer('price_delta_paise').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
});

export const modifiers = pgTable('modifiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g. Oat Milk, Extra Shot
  pricePaise: integer('price_paise').notNull().default(0),
  isAvailable: boolean('is_available').notNull().default(true),
});

export const ingredients = pgTable('ingredients', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  unit: text('unit').notNull(), // g, ml, pcs, kg, L
  lowStockThreshold: numeric('low_stock_threshold', { precision: 12, scale: 3 })
    .notNull()
    .default('0'),
  avgCostPerUnitPaise: integer('avg_cost_per_unit_paise').notNull().default(0),
});

export const recipes = pgTable('recipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => variants.id, {
    onDelete: 'cascade',
  }),
  ingredientId: uuid('ingredient_id')
    .notNull()
    .references(() => ingredients.id, { onDelete: 'cascade' }),
  quantityRequired: numeric('quantity_required', {
    precision: 12,
    scale: 3,
  }).notNull(),
});

export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    currentQty: numeric('current_qty', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    expiryDate: timestamp('expiry_date', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('inventory_branch_ingredient_idx').on(table.branchId, table.ingredientId),
  ]
);

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id')
    .notNull()
    .references(() => ingredients.id, { onDelete: 'cascade' }),
  deltaQty: numeric('delta_qty', { precision: 12, scale: 3 }).notNull(),
  reason: text('reason').notNull(), // SALE_DEDUCTION | PURCHASE_RECEIPT | WASTE | ADJUSTMENT
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  gstin: text('gstin'),
  balancePaise: integer('balance_paise').notNull().default(0),
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('DRAFT'), // DRAFT | ORDERED | RECEIVED | CANCELLED
  totalPaise: integer('total_paise').notNull().default(0),
  invoiceNumber: text('invoice_number'),
  receivedAt: timestamp('received_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseItems = pgTable('purchase_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  purchaseOrderId: uuid('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id')
    .notNull()
    .references(() => ingredients.id, { onDelete: 'restrict' }),
  quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  unitCostPaise: integer('unit_cost_paise').notNull(),
  totalCostPaise: integer('total_cost_paise').notNull(),
});

export const goodsReceipts = pgTable('goods_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  purchaseOrderId: uuid('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  invoiceNumber: text('invoice_number'),
  notes: text('notes'),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
});

