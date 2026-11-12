import type { CreateOrderInput, LoginInput, PinLoginInput } from '@cafeos/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; timestamp: string }>('/api/health'),
  login: (data: LoginInput) =>
    request<{ user: { id: string; branchId: string; name: string; role: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify(data) }
    ),
  pinLogin: (data: PinLoginInput) =>
    request<{ user: { id: string; branchId: string; name: string; role: string } }>(
      '/api/auth/pin-login',
      { method: 'POST', body: JSON.stringify(data) }
    ),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () =>
    request<{ user: { userId: string; branchId: string; name: string; role: string } }>(
      '/api/auth/me'
    ),
  getMenu: (branchId: string) =>
    request<{
      categories: Array<{ id: string; name: string; sortOrder: number }>;
      products: Array<{
        id: string;
        categoryId: string | null;
        name: string;
        description: string | null;
        imageUrl: string | null;
        pricePaise: number;
        gstRateBps: number;
        isVeg: boolean;
        isAvailable: boolean;
        isFeatured: boolean;
      }>;
    }>(`/api/menu?branchId=${encodeURIComponent(branchId)}`),
  createOrder: (payload: CreateOrderInput) =>
    request<{ order: { id: string; orderNumber: string; trackingToken: string }; deduplicated: boolean }>(
      '/api/orders',
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  trackOrder: (trackingToken: string) =>
    request<{
      order: {
        orderNumber: string;
        orderType: string;
        kdsStatus: string;
        paymentStatus: string;
        totalPaise: number;
        createdAt: string;
      };
      items: Array<{ productName: string; quantity: number; kdsItemStatus: string }>;
    }>(`/api/orders/track/${encodeURIComponent(trackingToken)}`),
  getKdsOrders: () =>
    request<{
      orders: Array<{
        id: string;
        orderNumber: string;
        orderType: string;
        kdsStatus: string;
        totalPaise: number;
        createdAt: string;
      }>;
    }>('/api/orders/kds'),
  updateKdsStatus: (id: string, status: string) =>
    request<{ order: unknown }>(`/api/orders/${id}/kds-status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getInventory: () =>
    request<{
      items: Array<{
        id: string;
        name: string;
        unit: string;
        lowStockThreshold: string;
        currentQty: string | null;
      }>;
      movements: Array<{
        id: string;
        ingredientId: string;
        deltaQty: string;
        reason: string;
        createdAt: string;
      }>;
    }>('/api/inventory'),
  adjustStock: (data: { ingredientId: string; deltaQty: number; reason: 'WASTE' | 'ADJUSTMENT' }) =>
    request('/api/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),
  getSuppliers: () =>
    request<{ suppliers: Array<{ id: string; name: string; contactName: string | null; phone: string | null }> }>(
      '/api/procurement/suppliers'
    ),
  getPurchaseOrders: () =>
    request<{
      purchaseOrders: Array<{
        id: string;
        supplierId: string;
        status: string;
        totalPaise: number;
        createdAt: string;
      }>;
    }>('/api/procurement/orders'),
  receivePurchaseOrder: (id: string) =>
    request(`/api/procurement/orders/${id}/receive`, { method: 'POST' }),
  getAccountingSummary: () =>
    request<{
      summary: {
        orderCount: number;
        grossSalesPaise: number;
        netRevenuePaise: number;
        totalTaxPaise: number;
        totalExpensesPaise: number;
        netProfitPaise: number;
      };
    }>('/api/accounting/summary'),
  getJournals: () =>
    request<{
      journals: Array<{
        id: string;
        referenceType: string;
        description: string;
        postedAt: string;
      }>;
    }>('/api/accounting/journals'),
  createExpense: (data: {
    category: 'RENT' | 'UTILITIES' | 'SALARY' | 'SUPPLIES' | 'OTHER';
    description: string;
    amountPaise: number;
    paymentMode: 'CASH' | 'BANK' | 'UPI';
  }) => request('/api/accounting/expenses', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: () =>
    request<{
      auditLogs: Array<{ id: string; action: string; entityType: string; createdAt: string }>;
      notifications: Array<{ id: string; type: string; title: string; message: string; createdAt: string }>;
    }>('/api/accounting/audit-logs'),
};

