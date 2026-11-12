import Dexie, { type Table } from 'dexie';
import type { CreateOrderInput } from '@cafeos/shared';

export interface CachedCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CachedProduct {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePaise: number;
  gstRateBps: number;
  isVeg: boolean;
  isAvailable: boolean;
}

export type SyncStatus = 'LOCAL_PENDING' | 'SYNCING' | 'SERVER_CONFIRMED' | 'CONFLICT_REVIEW';

export interface OfflineOrderRecord {
  clientTransactionId: string;
  localToken: string;
  payload: CreateOrderInput;
  syncStatus: SyncStatus;
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

class CafeOfflineDatabase extends Dexie {
  categories!: Table<CachedCategory, string>;
  products!: Table<CachedProduct, string>;
  offlineOrders!: Table<OfflineOrderRecord, string>;

  constructor() {
    super('cafeos_offline_db');
    this.version(1).stores({
      categories: 'id, sortOrder',
      products: 'id, categoryId, isAvailable',
      offlineOrders: 'clientTransactionId, syncStatus, createdAt',
    });
  }
}

export const offlineDb = new CafeOfflineDatabase();

/**
 * Queues an order locally in IndexedDB so POS billing never blocks on network loss.
 */
export async function queueOfflineOrder(payload: CreateOrderInput): Promise<OfflineOrderRecord> {
  const record: OfflineOrderRecord = {
    clientTransactionId: payload.clientTransactionId,
    localToken: `OFF-${Date.now().toString().slice(-4)}`,
    payload: {
      ...payload,
      isOfflineCreated: true,
      offlineCreatedAt: new Date().toISOString(),
    },
    syncStatus: 'LOCAL_PENDING',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };
  await offlineDb.offlineOrders.put(record);
  return record;
}

/**
 * Attempts to flush all LOCAL_PENDING / SYNCING orders to the backend idempotently.
 */
export async function flushOfflineQueue(
  postOrder: (payload: CreateOrderInput) => Promise<unknown>
): Promise<{ synced: number; failed: number }> {
  const pending = await offlineDb.offlineOrders
    .where('syncStatus')
    .anyOf(['LOCAL_PENDING', 'SYNCING'])
    .toArray();

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await offlineDb.offlineOrders.update(item.clientTransactionId, {
        syncStatus: 'SYNCING',
      });
      await postOrder(item.payload);
      await offlineDb.offlineOrders.update(item.clientTransactionId, {
        syncStatus: 'SERVER_CONFIRMED',
        lastError: undefined,
      });
      synced += 1;
    } catch (err) {
      failed += 1;
      await offlineDb.offlineOrders.update(item.clientTransactionId, {
        syncStatus: 'LOCAL_PENDING',
        retryCount: item.retryCount + 1,
        lastError: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  }

  return { synced, failed };
}

