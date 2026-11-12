import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChefHat, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';

interface KdsOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  kdsStatus: string;
  totalPaise: number;
  createdAt: string;
}

const NEXT_STATUS: Record<string, string> = {
  NEW: 'ACCEPTED',
  ACCEPTED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
};

export function KdsPage() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.getKdsOrders();
      setOrders(res.orders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load KDS queue');
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, []);

  const advance = async (order: KdsOrder) => {
    const next = NEXT_STATUS[order.kdsStatus];
    if (!next) return;
    await api.updateKdsStatus(order.id, next);
    await load();
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <header className="h-16 border-b border-stone-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-stone-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <ChefHat className="w-6 h-6 text-amber-400" />
          <h1 className="font-bold text-lg">Kitchen Display System (KDS)</h1>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-xs font-semibold hover:bg-stone-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-amber-950/60 border border-amber-700 text-amber-200 text-sm">
            {error} — <Link to="/login" className="underline font-semibold">Sign in as Kitchen/Staff</Link> to view live orders.
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((o) => {
            const next = NEXT_STATUS[o.kdsStatus];
            return (
              <div key={o.id} className="p-4 rounded-2xl bg-stone-800 border border-stone-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">{o.orderNumber}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300">
                    {o.kdsStatus}
                  </span>
                </div>
                <div className="text-xs text-stone-400">
                  {o.orderType} • {new Date(o.createdAt).toLocaleTimeString()}
                </div>
                {next && (
                  <button
                    onClick={() => void advance(o)}
                    className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-500"
                  >
                    Mark {next}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

