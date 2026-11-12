import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Cafe table
export const cafes = sqliteTable('cafes', {
  id: text('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull().default(''),
  description: text('description').notNull().default(''),
  address: text('address').notNull(),
  city: text('city').notNull().default('Kurali'),
  state: text('state').notNull().default('Punjab'),
  postal_code: text('postal_code').default('140103'),
  phone: text('phone').notNull(),
  currency: text('currency').notNull().default('INR'),
  currency_symbol: text('currency_symbol').notNull().default('₹'),
  logo_url: text('logo_url').notNull().default(''),
  banner_url: text('banner_url').notNull().default(''),
  opening_time: text('opening_time').default('08:30 AM'),
  closing_time: text('closing_time').default('11:00 PM'),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

// Category table
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  cafe_id: text('cafe_id').notNull().references(() => cafes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

// Menu item table
export const menu_items = sqliteTable('menu_items', {
  id: text('id').primaryKey(),
  cafe_id: text('cafe_id').notNull().references(() => cafes.id, { onDelete: 'cascade' }),
  category_id: text('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // stored as paise/cents
  image_url: text('image_url'),
  is_available: integer('is_available').notNull().default(1),
  is_veg: integer('is_veg').notNull().default(1),
  is_featured: integer('is_featured').notNull().default(0),
  preparation_time_minutes: integer('preparation_time_minutes').notNull().default(10),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

// Order table
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  cafe_id: text('cafe_id').notNull().references(() => cafes.id, { onDelete: 'cascade' }),
  order_number: text('order_number').notNull(),
  customer_name: text('customer_name').notNull(),
  customer_phone: text('customer_phone').notNull(),
  special_instructions: text('special_instructions'),
  status: text('status').notNull().default('received'),
  subtotal: integer('subtotal').notNull().default(0),
  tax: integer('tax').notNull().default(0),
  total: integer('total').notNull().default(0),
  payment_status: text('payment_status').notNull().default('pending'),
  dining_option: text('dining_option').notNull().default('dine_in'),
  table_number: text('table_number'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

// Order item table
export const order_items = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menu_item_id: text('menu_item_id').references(() => menu_items.id, { onDelete: 'set null' }),
  item_name: text('item_name').notNull(),
  item_price: integer('item_price').notNull(),
  quantity: integer('quantity').notNull(),
  subtotal: integer('subtotal').notNull().default(0),
  notes: text('notes'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

// Memberships table (for staff authentication)
export const memberships = sqliteTable('memberships', {
  id: text('id').primaryKey(),
  cafe_id: text('cafe_id').notNull().references(() => cafes.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull(),
  role: text('role').notNull().default('staff'),
  created_at: text('created_at').notNull(),
});

// Sessions table (for Better Auth)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  cafe_id: text('cafe_id').notNull().references(() => cafes.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expires_at: text('expires_at').notNull(),
  created_at: text('created_at').notNull(),
});