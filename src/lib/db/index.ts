import { getCloudflareContext } from '@opennextjs/cloudflare';
import type {
  Cafe,
  Category,
  MenuItem,
  Order,
  OrderStatus,
  OrderSubmissionPayload,
} from '../types';
import { D1DatabaseBinding, D1Repository } from './d1';
import { SEED_CAFES, SEED_CATEGORIES, SEED_INITIAL_ORDERS, SEED_MENU_ITEMS } from './seedData';

declare global {
  interface CloudflareEnv {
    DB?: D1DatabaseBinding;
    ENVIRONMENT?: string;
    ADMIN_RESET_SECRET?: string;
  }
}

export function getRuntimeEnvironment(): CloudflareEnv {
  return getCloudflareContext().env;
}

function getD1Repository(): D1Repository | null {
  const binding = getCloudflareContext().env.DB;
  return binding ? new D1Repository(binding) : null;
}

export const db = {
  async getCafes(): Promise<Cafe[]> {
    const d1 = getD1Repository();
    if (d1) return d1.getCafes();
    return SEED_CAFES.filter((cafe) => cafe.is_active);
  },

  async getCafeBySlug(slug: string): Promise<Cafe | null> {
    const d1 = getD1Repository();
    if (d1) return d1.getCafeBySlug(slug);
    return SEED_CAFES.find((cafe) => cafe.slug === slug && cafe.is_active) ?? null;
  },

  async getCafeById(id: string): Promise<Cafe | null> {
    const d1 = getD1Repository();
    if (d1) return d1.getCafeById(id);
    return SEED_CAFES.find((cafe) => cafe.id === id) ?? null;
  },

  async getCategories(cafeId: string): Promise<Category[]> {
    const d1 = getD1Repository();
    if (d1) return d1.getCategories(cafeId);
    return SEED_CATEGORIES
      .filter((category) => category.cafe_id === cafeId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  async getMenuItems(cafeId: string): Promise<MenuItem[]> {
    const d1 = getD1Repository();
    if (d1) return d1.getMenuItems(cafeId);
    return SEED_MENU_ITEMS.filter((item) => item.cafe_id === cafeId);
  },

  async getMenuItem(id: string): Promise<MenuItem | null> {
    const d1 = getD1Repository();
    if (d1) return d1.getMenuItem(id);
    return SEED_MENU_ITEMS.find((item) => item.id === id) ?? null;
  },

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    const d1 = getD1Repository();
    if (d1) return d1.updateMenuItem(id, updates);
    throw new Error('Menu item updates require the configured D1 database');
  },

  async createMenuItem(
    item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MenuItem> {
    const d1 = getD1Repository();
    if (d1) return d1.createMenuItem(item);
    throw new Error('Menu item creation requires the configured D1 database');
  },

  async deleteMenuItem(id: string): Promise<boolean> {
    const d1 = getD1Repository();
    if (d1) return d1.deleteMenuItem(id);
    throw new Error('Menu item deletion requires the configured D1 database');
  },

  async createOrder(payload: OrderSubmissionPayload): Promise<Order> {
    const d1 = getD1Repository();
    if (!d1) throw new Error('Order creation requires the configured D1 database');
    return d1.createOrder(payload);
  },

  async getOrders(cafeId: string): Promise<Order[]> {
    const d1 = getD1Repository();
    if (d1) return d1.getOrders(cafeId);
    return SEED_INITIAL_ORDERS.filter((order) => order.cafe_id === cafeId);
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const d1 = getD1Repository();
    if (d1) return d1.getOrderById(orderId);
    return SEED_INITIAL_ORDERS.find((order) => order.id === orderId) ?? null;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
    const d1 = getD1Repository();
    if (d1) return d1.updateOrderStatus(orderId, status);
    throw new Error('Order updates require the configured D1 database');
  },

  async resetDemoData(): Promise<void> {
    const d1 = getD1Repository();
    if (!d1) throw new Error('Demo reset requires the configured D1 database');
    await d1.resetDemoData();
  },
};
