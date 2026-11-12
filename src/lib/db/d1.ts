import type {
  Cafe,
  Category,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  OrderSubmissionPayload,
} from '../types';
import { SEED_CAFES, SEED_CATEGORIES, SEED_INITIAL_ORDERS, SEED_MENU_ITEMS } from './seedData';

type D1Value = string | number | null | ArrayBuffer | ArrayBufferView;

export interface D1Result<T> {
  results?: T[];
  success: boolean;
  error?: string;
}

export interface D1RunResult {
  success: boolean;
  meta: { changes: number };
  error?: string;
}

export interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<D1RunResult>;
}

export interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result<unknown>[]>;
}

interface CafeRow extends Omit<Cafe, 'is_active'> {
  is_active: number;
}

interface CategoryRow extends Category {}

interface MenuItemRow extends Omit<MenuItem, 'is_available' | 'is_veg' | 'is_featured'> {
  is_available: number;
  is_veg: number;
  is_featured: number;
}

interface OrderRow extends Omit<Order, 'items'> {}

interface OrderItemRow extends Omit<OrderItem, 'menu_item_id'> {
  menu_item_id: string | null;
}

export class OrderValidationError extends Error {}

function assertSuccess(result: { success: boolean; error?: string }): void {
  if (!result.success) {
    throw new Error(result.error || 'Cloudflare D1 query failed');
  }
}

function toCafe(row: CafeRow): Cafe {
  return { ...row, is_active: Boolean(row.is_active) };
}

function toMenuItem(row: MenuItemRow): MenuItem {
  return {
    ...row,
    price: amountFromCents(row.price),
    is_available: Boolean(row.is_available),
    is_veg: Boolean(row.is_veg),
    is_featured: Boolean(row.is_featured),
  };
}

function toOrder(row: OrderRow): Order {
  return {
    ...row,
    subtotal: amountFromCents(row.subtotal),
    tax: amountFromCents(row.tax),
    total: amountFromCents(row.total),
  };
}

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    ...row,
    menu_item_id: row.menu_item_id ?? '',
    item_price: amountFromCents(row.item_price),
    subtotal: amountFromCents(row.subtotal),
  };
}

function cents(amount: number): number {
  return Math.round(amount * 100);
}

function amountFromCents(amount: number): number {
  return amount / 100;
}

export class D1Repository {
  private readonly db: D1DatabaseBinding;

  constructor(db: D1DatabaseBinding) {
    this.db = db;
  }

  async getCafes(): Promise<Cafe[]> {
    const result = await this.db
      .prepare('SELECT * FROM cafes WHERE is_active = 1 ORDER BY name')
      .all<CafeRow>();
    assertSuccess(result);
    return (result.results ?? []).map(toCafe);
  }

  async getCafeBySlug(slug: string): Promise<Cafe | null> {
    const result = await this.db
      .prepare('SELECT * FROM cafes WHERE slug = ? AND is_active = 1')
      .bind(slug)
      .first<CafeRow>();
    return result ? toCafe(result) : null;
  }

  async getCafeById(id: string): Promise<Cafe | null> {
    const result = await this.db
      .prepare('SELECT * FROM cafes WHERE id = ?')
      .bind(id)
      .first<CafeRow>();
    return result ? toCafe(result) : null;
  }

  async getCategories(cafeId: string): Promise<Category[]> {
    const result = await this.db
      .prepare('SELECT * FROM categories WHERE cafe_id = ? ORDER BY sort_order, name')
      .bind(cafeId)
      .all<CategoryRow>();
    assertSuccess(result);
    return result.results ?? [];
  }

  async getMenuItems(cafeId: string): Promise<MenuItem[]> {
    const result = await this.db
      .prepare('SELECT * FROM menu_items WHERE cafe_id = ? ORDER BY name')
      .bind(cafeId)
      .all<MenuItemRow>();
    assertSuccess(result);
    return (result.results ?? []).map(toMenuItem);
  }

  async getMenuItem(id: string): Promise<MenuItem | null> {
    const result = await this.db
      .prepare('SELECT * FROM menu_items WHERE id = ?')
      .bind(id)
      .first<MenuItemRow>();
    return result ? toMenuItem(result) : null;
  }

  async createMenuItem(
    item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MenuItem> {
    if (
      !Number.isSafeInteger(cents(item.price)) ||
      item.price < 0 ||
      !item.name.trim()
    ) {
      throw new Error('Menu item name and a non-negative price are required');
    }
    const category = await this.db
      .prepare('SELECT id FROM categories WHERE id = ? AND cafe_id = ?')
      .bind(item.category_id, item.cafe_id)
      .first<{ id: string }>();
    if (!category) throw new Error('Category does not belong to this café');

    const now = new Date().toISOString();
    const created = {
      ...item,
      id: crypto.randomUUID(),
      price: amountFromCents(cents(item.price)),
      created_at: now,
      updated_at: now,
    };
    const result = await this.db
      .prepare(
        `INSERT INTO menu_items
          (id, cafe_id, category_id, name, description, price, image_url, is_available, is_veg,
           is_featured, preparation_time_minutes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        created.id, created.cafe_id, created.category_id, created.name, created.description,
        cents(created.price), created.image_url, Number(created.is_available), Number(created.is_veg),
        Number(created.is_featured ?? false), created.preparation_time_minutes ?? 10, now, now
      )
      .run();
    assertSuccess(result);
    return created;
  }

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    const current = await this.getMenuItem(id);
    if (!current) return null;

    const next = { ...current, ...updates };
    if (!Number.isSafeInteger(cents(next.price)) || next.price < 0 || !next.name.trim()) {
      throw new Error('Menu item name and a non-negative price are required');
    }

    if (updates.category_id) {
      const category = await this.db
        .prepare('SELECT id FROM categories WHERE id = ? AND cafe_id = ?')
        .bind(updates.category_id, current.cafe_id)
        .first<{ id: string }>();
      if (!category) throw new Error('Category does not belong to this café');
    }

    const result = await this.db
      .prepare(
        `UPDATE menu_items
         SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?,
             is_available = ?, is_veg = ?, is_featured = ?, preparation_time_minutes = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        next.category_id || null, next.name.trim(), next.description, cents(next.price), next.image_url,
        Number(next.is_available), Number(next.is_veg), Number(next.is_featured ?? false),
        next.preparation_time_minutes ?? 10, new Date().toISOString(), id
      )
      .run();
    assertSuccess(result);
    return result.meta.changes ? this.getMenuItem(id) : null;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM menu_items WHERE id = ?').bind(id).run();
    assertSuccess(result);
    return result.meta.changes > 0;
  }

  async createOrder(payload: OrderSubmissionPayload): Promise<Order> {
    if (
      !payload.customer_name.trim() ||
      payload.customer_name.length > 128 ||
      !payload.customer_phone.trim() ||
      payload.customer_phone.length > 20 ||
      payload.customer_phone.replace(/\D/g, '').length < 8 ||
      payload.customer_phone.replace(/\D/g, '').length > 15
    ) {
      throw new OrderValidationError('Customer name or phone is invalid');
    }
    if (!payload.items.length || payload.items.length > 50) {
      throw new OrderValidationError('Order must contain between 1 and 50 items');
    }
    if ((payload.special_instructions?.length ?? 0) > 1000 || (payload.table_number?.length ?? 0) > 32) {
      throw new OrderValidationError('Order instructions or table number are too long');
    }

    const cafe = await this.db
      .prepare('SELECT id FROM cafes WHERE id = ? AND is_active = 1')
      .bind(payload.cafe_id)
      .first<{ id: string }>();
    if (!cafe) {
      throw new OrderValidationError('Café is unavailable');
    }

    const itemIds = payload.items.map((item) => item.menu_item_id);
    if (itemIds.some((id) => typeof id !== 'string' || id.length === 0)) {
      throw new OrderValidationError('Invalid menu item');
    }

    const uniqueIds = [...new Set(itemIds)];
    const placeholders = uniqueIds.map(() => '?').join(', ');
    const itemsResult = await this.db
      .prepare(
        `SELECT * FROM menu_items WHERE cafe_id = ? AND id IN (${placeholders})`
      )
      .bind(payload.cafe_id, ...uniqueIds)
      .all<MenuItemRow>();
    assertSuccess(itemsResult);

    const catalog = new Map((itemsResult.results ?? []).map((item) => [item.id, toMenuItem(item)]));
    const validatedItems: OrderItem[] = payload.items.map((requested) => {
      const item = catalog.get(requested.menu_item_id);
      if (!item) {
        throw new OrderValidationError('One or more menu items do not belong to this café');
      }
      if (!item.is_available) {
        throw new OrderValidationError(`${item.name} is currently unavailable`);
      }
      if (!Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > 99) {
        throw new OrderValidationError(`Invalid quantity for ${item.name}`);
      }
      if ((requested.notes?.length ?? 0) > 255) {
        throw new OrderValidationError(`Notes are too long for ${item.name}`);
      }

      const unitPriceCents = cents(item.price);
      const subtotalCents = unitPriceCents * requested.quantity;
      if (!Number.isSafeInteger(subtotalCents)) {
        throw new OrderValidationError(`Invalid price for ${item.name}`);
      }
      return {
        id: crypto.randomUUID(),
        order_id: '',
        menu_item_id: item.id,
        item_name: item.name,
        item_price: amountFromCents(unitPriceCents),
        quantity: requested.quantity,
        subtotal: amountFromCents(subtotalCents),
        notes: requested.notes?.trim() || undefined,
      };
    });

    const totalCents = validatedItems.reduce((sum, item) => sum + cents(item.subtotal), 0);
    if (!Number.isSafeInteger(totalCents)) {
      throw new OrderValidationError('Order total is invalid');
    }

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    const orderNumber = `CF-${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const total = amountFromCents(totalCents);
    const order: Order = {
      id: orderId,
      cafe_id: payload.cafe_id,
      order_number: orderNumber,
      customer_name: payload.customer_name.trim(),
      customer_phone: payload.customer_phone.trim(),
      special_instructions: payload.special_instructions?.trim() || undefined,
      status: 'received',
      subtotal: total,
      tax: 0,
      total,
      payment_status: 'pending',
      dining_option: payload.dining_option ?? 'dine_in',
      table_number: payload.table_number?.trim() || undefined,
      created_at: now,
      updated_at: now,
      items: validatedItems.map((item) => ({ ...item, order_id: orderId })),
    };

    const statements = [
      this.db
        .prepare(
          `INSERT INTO orders
            (id, cafe_id, order_number, customer_name, customer_phone, special_instructions,
             status, subtotal, tax, total, payment_status, dining_option, table_number, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          order.id,
          order.cafe_id,
          order.order_number,
          order.customer_name,
          order.customer_phone,
          order.special_instructions ?? null,
          order.status,
          totalCents,
          0,
          totalCents,
          order.payment_status,
          order.dining_option,
          order.table_number ?? null,
          now,
          now
        ),
      ...order.items!.map((item) =>
        this.db
          .prepare(
            `INSERT INTO order_items
              (id, order_id, menu_item_id, item_name, item_price, quantity, subtotal, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            item.id,
            order.id,
            item.menu_item_id,
            item.item_name,
            cents(item.item_price),
            item.quantity,
            cents(item.subtotal),
            item.notes ?? null,
            now,
            now
          )
      ),
    ];

    const results = await this.db.batch(statements);
    for (const result of results) assertSuccess(result);
    return order;
  }

  async getOrders(cafeId: string): Promise<Order[]> {
    const result = await this.db
      .prepare('SELECT * FROM orders WHERE cafe_id = ? ORDER BY created_at DESC')
      .bind(cafeId)
      .all<OrderRow>();
    assertSuccess(result);
    return Promise.all((result.results ?? []).map((order) => this.attachOrderItems(toOrder(order))));
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    const result = await this.db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .bind(orderId)
      .first<OrderRow>();
    return result ? this.attachOrderItems(toOrder(result)) : null;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
    const result = await this.db
      .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, new Date().toISOString(), orderId)
      .run();
    assertSuccess(result);
    return result.meta.changes ? this.getOrderById(orderId) : null;
  }

  async resetDemoData(): Promise<void> {
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [
      this.db.prepare('DELETE FROM order_items'),
      this.db.prepare('DELETE FROM orders'),
      this.db.prepare('DELETE FROM menu_items'),
      this.db.prepare('DELETE FROM categories'),
      this.db.prepare('DELETE FROM cafes'),
      ...SEED_CAFES.map((cafe) =>
        this.db
          .prepare(
            `INSERT INTO cafes
              (id, slug, name, tagline, description, address, city, state, postal_code, phone,
               currency, currency_symbol, logo_url, banner_url, opening_time, closing_time,
               is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            cafe.id, cafe.slug, cafe.name, cafe.tagline, cafe.description, cafe.address,
            cafe.city, cafe.state, cafe.postal_code, cafe.phone, cafe.currency, cafe.currency_symbol,
            cafe.logo_url, cafe.banner_url, cafe.opening_time, cafe.closing_time,
            Number(cafe.is_active), cafe.created_at, now
          )
      ),
      ...SEED_CATEGORIES.map((category) =>
        this.db
          .prepare(
            `INSERT INTO categories (id, cafe_id, name, description, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            category.id, category.cafe_id, category.name, category.description ?? null,
            category.sort_order, category.created_at, now
          )
      ),
      ...SEED_MENU_ITEMS.map((item) =>
        this.db
          .prepare(
            `INSERT INTO menu_items
              (id, cafe_id, category_id, name, description, price, image_url, is_available, is_veg,
               is_featured, preparation_time_minutes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            item.id, item.cafe_id, item.category_id, item.name, item.description, cents(item.price),
            item.image_url, Number(item.is_available), Number(item.is_veg), Number(item.is_featured ?? false),
            item.preparation_time_minutes ?? 10, item.created_at, now
          )
      ),
      ...SEED_INITIAL_ORDERS.map((order) =>
        this.db
          .prepare(
            `INSERT INTO orders
              (id, cafe_id, order_number, customer_name, customer_phone, special_instructions, status,
               subtotal, tax, total, payment_status, dining_option, table_number, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            order.id, order.cafe_id, order.order_number, order.customer_name, order.customer_phone,
            order.special_instructions ?? null, order.status, cents(order.subtotal), cents(order.tax), cents(order.total),
            order.payment_status, order.dining_option, order.table_number ?? null, order.created_at, order.updated_at
          )
      ),
      ...SEED_INITIAL_ORDERS.flatMap((order) =>
        (order.items ?? []).map((item) =>
          this.db
            .prepare(
              `INSERT INTO order_items
                (id, order_id, menu_item_id, item_name, item_price, quantity, subtotal, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              item.id, order.id, item.menu_item_id, item.item_name, cents(item.item_price), item.quantity,
              cents(item.subtotal), item.notes ?? null, order.created_at, order.updated_at
            )
        )
      ),
    ];

    const results = await this.db.batch(statements);
    for (const result of results) assertSuccess(result);
  }

  private async attachOrderItems(order: OrderRow): Promise<Order> {
    const result = await this.db
      .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at, id')
      .bind(order.id)
      .all<OrderItemRow>();
    assertSuccess(result);
    return { ...order, items: (result.results ?? []).map(toOrderItem) };
  }
}
