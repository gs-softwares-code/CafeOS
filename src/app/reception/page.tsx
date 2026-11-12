'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Coffee,
  Plus,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Clock,
  Printer,
  ShoppingBag,
} from 'lucide-react';
import { MenuItem, Order, OrderStatus } from '@/lib/types';

export default function ReceptionPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<{ fullName: string; role: string; cafeId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Array<{ item: MenuItem; qty: number }>>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('T1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/staff/auth');
      if (!res.ok) {
        router.push('/staff-login');
        return;
      }
      const data = await res.json();
      setStaff(data.staff);
    } catch {
      router.push('/staff-login');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [ordRes, menuRes] = await Promise.all([
        fetch('/api/orders?cafe_id=cafe-kurali-01'),
        fetch('/api/menu?cafe_id=cafe-kurali-01'),
      ]);
      if (ordRes.ok) {
        const o = await ordRes.json();
        setOrders(o.orders ?? []);
      }
      if (menuRes.ok) {
        const m = await menuRes.json();
        setMenuItems(m.items ?? []);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    void checkAuth();
    void loadData();
    const timer = setInterval(() => void loadData(), 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/staff/auth', { method: 'DELETE' });
    router.push('/staff-login');
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);

  const handleCreateCounterBill = async () => {
    if (cart.length === 0 || !customerName.trim() || !customerPhone.trim()) {
      alert('Please enter customer name, phone, and at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        cafe_id: 'cafe-kurali-01',
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        dining_option: 'dine_in',
        table_number: tableNumber,
        items: cart.map((c) => ({
          menu_item_id: c.item.id,
          quantity: c.qty,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? 'Failed to place order');
        return;
      }

      const data = await res.json();
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setToast(`Order ${data.order?.order_number} billed successfully!`);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] text-stone-600">
        Verifying staff credentials...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C130E] flex flex-col">
      <header className="h-16 bg-[#1C130E] text-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Coffee className="w-5 h-5 text-amber-400" />
          <div>
            <h1 className="font-bold text-sm sm:text-base leading-tight">Reception &amp; POS Counter</h1>
            <div className="text-[11px] text-amber-200">
              Verma &amp; Sons — {staff?.fullName} ({staff?.role})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {staff?.role === 'owner' && (
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition"
            >
              Owner Dashboard →
            </Link>
          )}
          <button
            onClick={() => void loadData()}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-900 text-white text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {toast && (
        <div className="bg-emerald-700 text-white px-4 py-2 text-xs flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 grid lg:grid-cols-3 gap-6">
        {/* Left: Fast Billing Catalog (2 cols) */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">Quick Counter Catalog</h2>
            <span className="text-xs text-stone-600">{menuItems.length} available items</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="p-3 bg-white rounded-xl border border-stone-200 hover:border-amber-500 text-left transition shadow-xs flex flex-col justify-between min-h-[96px] active:scale-98"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    />
                    <div className="font-bold text-xs line-clamp-1">{item.name}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
                  <span className="font-extrabold text-sm text-[#1C130E]">₹{item.price}</span>
                  <span className="p-1 rounded-md bg-amber-50 text-amber-800">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Active Orders List below */}
          <div className="pt-6 border-t border-stone-200 space-y-3">
            <h2 className="font-bold text-base flex items-center justify-between">
              <span>Today's Incoming &amp; Counter Orders ({orders.length})</span>
            </h2>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="p-3.5 bg-white rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-sm">
                      {o.order_number}{' '}
                      <span className="font-normal text-stone-600">
                        — {o.customer_name} ({o.customer_phone})
                      </span>
                    </div>
                    <div className="text-stone-600">
                      {o.dining_option} • Table {o.table_number || 'N/A'} • {new Date(o.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">₹{o.total}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold uppercase text-[10px]">
                      {o.status}
                    </span>
                    {o.status !== 'completed' && o.status !== 'cancelled' && (
                      <button
                        onClick={() => void handleUpdateStatus(o.id, 'completed')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-[11px]"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right: POS Checkout Form */}
        <aside className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-sm h-fit sticky top-20">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h2 className="font-bold text-base">New Counter Bill</h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-rose-700 hover:underline">
                Clear
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">Customer Name</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Gurpreet Singh"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Phone</label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Table</label>
                <input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="T1"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Cart items */}
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
              Selected Items ({cart.reduce((s, c) => s + c.qty, 0)})
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-600">
                Tap items from the catalog on the left to add
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map((c) => (
                  <div key={c.item.id} className="flex items-center justify-between text-xs py-1">
                    <div className="truncate pr-2">
                      <div className="font-semibold truncate">{c.item.name}</div>
                      <div className="text-stone-600">₹{c.item.price} each</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateCartQty(c.item.id, -1)}
                        className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold">{c.qty}</span>
                      <button
                        onClick={() => updateCartQty(c.item.id, 1)}
                        className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-xs text-stone-600">Total Amount</span>
              <span className="text-2xl font-extrabold text-[#1C130E]">₹{cartTotal}</span>
            </div>

            <button
              onClick={() => void handleCreateCounterBill()}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-3 rounded-xl bg-[#1C130E] hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
            >
              {isSubmitting ? 'Billed...' : 'Generate & Print Bill'}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
