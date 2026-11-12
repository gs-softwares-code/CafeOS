import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff, RefreshCw, Plus, Minus, Trash2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { calculateLineTax, formatInr, type CreateOrderInput } from '@cafeos/shared';
import { offlineDb, queueOfflineOrder, flushOfflineQueue, type CachedProduct } from '../lib/offlineDb.js';
import { api } from '../lib/api.js';

interface CartItem {
  product: CachedProduct;
  quantity: number;
}

const DEFAULT_BRANCH_ID = '00000000-0000-0000-0000-000000000001';

export function PosPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [products, setProducts] = useState<CachedProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refreshPendingCount = async () => {
    const count = await offlineDb.offlineOrders
      .where('syncStatus')
      .anyOf(['LOCAL_PENDING', 'SYNCING'])
      .count();
    setPendingCount(count);
  };

  const syncNow = async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const res = await flushOfflineQueue((payload) => api.createOrder(payload));
      await refreshPendingCount();
      if (res.synced > 0) {
        setToast(`Synced ${res.synced} offline order(s) to server.`);
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      void syncNow();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    void (async () => {
      try {
        const live = await api.getMenu(DEFAULT_BRANCH_ID);
        if (live.products.length > 0) {
          await offlineDb.categories.bulkPut(live.categories);
          await offlineDb.products.bulkPut(live.products);
          setProducts(live.products);
        }
      } catch {
        const cached = await offlineDb.products.toArray();
        if (cached.length > 0) {
          setProducts(cached);
        } else {
          const starter: CachedProduct[] = [
            { id: '11111111-1111-1111-1111-111111111101', categoryId: null, name: 'Cappuccino', description: 'Double espresso with velvety steamed microfoam', imageUrl: '/images/menu/cappuccino.jpg', pricePaise: 22000, gstRateBps: 500, isVeg: true, isAvailable: true },
            { id: '11111111-1111-1111-1111-111111111102', categoryId: null, name: 'Single-Origin Pour Over', description: 'Hand-brewed Chikmagalur Arabica V60', imageUrl: '/images/menu/pour-over.jpg', pricePaise: 22000, gstRateBps: 500, isVeg: true, isAvailable: true },
            { id: '11111111-1111-1111-1111-111111111103', categoryId: null, name: 'French Butter Croissant', description: 'Flaky laminated pastry baked fresh', imageUrl: '/images/menu/croissant.jpg', pricePaise: 21000, gstRateBps: 500, isVeg: true, isAvailable: true },
            { id: '11111111-1111-1111-1111-111111111104', categoryId: null, name: 'Peri Peri Paneer Sourdough', description: 'Grilled cottage cheese & herb mayo', imageUrl: '/images/menu/paneer-sandwich.jpg', pricePaise: 33000, gstRateBps: 500, isVeg: true, isAvailable: true },
          ];
          await offlineDb.products.bulkPut(starter);
          setProducts(starter);
        }
      }
      await refreshPendingCount();
    })();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const addToCart = (product: CachedProduct) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const totals = cart.reduce(
    (acc, item) => {
      const tax = calculateLineTax(
        {
          unitPricePaise: item.product.pricePaise,
          quantity: item.quantity,
          gstRateBps: item.product.gstRateBps,
        },
        { scheme: 'REGULAR', taxMode: 'EXCLUSIVE' }
      );
      return {
        subtotal: acc.subtotal + tax.subtotalPaise,
        tax: acc.tax + tax.totalTaxPaise,
        total: acc.total + tax.lineTotalPaise,
      };
    },
    { subtotal: 0, tax: 0, total: 0 }
  );

  const checkout = async (method: 'CASH' | 'UPI') => {
    if (cart.length === 0) return;

    const payload: CreateOrderInput = {
      clientTransactionId: crypto.randomUUID(),
      branchId: DEFAULT_BRANCH_ID,
      orderType: 'DINE_IN',
      isOfflineCreated: !isOnline,
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        unitPricePaise: c.product.pricePaise,
        discountPaise: 0,
        gstRateBps: c.product.gstRateBps,
        modifiers: [],
      })),
      payments: [
        {
          idempotencyKey: crypto.randomUUID(),
          method,
          amountPaise: totals.total,
        },
      ],
    };

    if (!isOnline) {
      const rec = await queueOfflineOrder(payload);
      await refreshPendingCount();
      setCart([]);
      setToast(`Saved offline (${rec.localToken}). Will auto-sync when online.`);
      return;
    }

    try {
      const res = await api.createOrder(payload);
      setCart([]);
      setToast(`Order ${res.order.orderNumber} confirmed!`);
    } catch {
      const rec = await queueOfflineOrder(payload);
      await refreshPendingCount();
      setCart([]);
      setToast(`Server unreachable — queued safely as ${rec.localToken}.`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      <header className="h-16 bg-[#3f2316] text-white px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-lg">POS Terminal</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isOnline ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline Mode'}
            {pendingCount > 0 ? ` • ${pendingCount} Pending` : ''}
          </span>
          {pendingCount > 0 && isOnline && (
            <button
              onClick={() => void syncNow()}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync Now
            </button>
          )}
        </div>
      </header>

      {toast && (
        <div className="bg-emerald-700 text-white px-4 py-2.5 text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {toast}
          </span>
          <button onClick={() => setToast(null)} className="underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 grid md:grid-cols-3 gap-4 p-4 max-w-7xl w-full mx-auto">
        <section className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="rounded-2xl bg-white border border-stone-200 text-left hover:border-amber-600 active:scale-[0.98] transition shadow-sm overflow-hidden flex flex-col justify-between"
            >
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-28 object-cover bg-stone-100"
                  loading="lazy"
                />
              )}
              <div className="p-3.5 flex-1 flex flex-col justify-between w-full">
                <div>
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${
                      p.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                  />
                  <span className="font-bold text-stone-900 text-sm">{p.name}</span>
                  {p.description && (
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <div className="font-semibold text-amber-800 mt-2.5 text-sm">{formatInr(p.pricePaise)}</div>
              </div>
            </button>
          ))}
        </section>

        <aside className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h2 className="font-bold text-lg">Current Bill</h2>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-red-600 flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-stone-400 py-12 text-center">Tap items to add to bill</p>
            ) : (
              <ul className="divide-y divide-stone-100 my-2">
                {cart.map((c) => (
                  <li key={c.product.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{c.product.name}</div>
                      <div className="text-xs text-stone-500">{formatInr(c.product.pricePaise)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(c.product.id, -1)}
                        className="w-8 h-8 rounded-lg border border-stone-300 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-semibold text-sm">{c.quantity}</span>
                      <button
                        onClick={() => updateQty(c.product.id, 1)}
                        className="w-8 h-8 rounded-lg border border-stone-300 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-stone-200 pt-4 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{formatInr(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>GST (5%)</span>
                <span>{formatInr(totals.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-1">
                <span>Total</span>
                <span>{formatInr(totals.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={cart.length === 0}
                onClick={() => void checkout('CASH')}
                className="py-3.5 rounded-xl bg-emerald-700 text-white font-semibold disabled:opacity-40 hover:bg-emerald-600"
              >
                Pay Cash
              </button>
              <button
                disabled={cart.length === 0}
                onClick={() => void checkout('UPI')}
                className="py-3.5 rounded-xl bg-[#3f2316] text-white font-semibold disabled:opacity-40 hover:bg-[#563120]"
              >
                Pay UPI
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

