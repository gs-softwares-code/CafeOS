import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Coffee, Clock, CheckCircle2 } from 'lucide-react';
import { formatInr } from '@cafeos/shared';
import { api } from '../lib/api.js';

export function TrackOrderPage() {
  const { trackingToken } = useParams<{ trackingToken: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.trackOrder>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingToken) return;
    const load = async () => {
      try {
        const res = await api.trackOrder(trackingToken);
        setData(res);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to track order');
      }
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [trackingToken]);

  return (
    <div className="min-h-screen bg-[#faf7f2] p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-[#3f2316]">
            <Coffee className="w-5 h-5 text-amber-700" />
            <span>Order Status</span>
          </div>
          <Link to="/" className="text-xs text-amber-800 hover:underline">
            Back to Café
          </Link>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-stone-500">Order Number</div>
                <div className="text-xl font-bold">{data.order.orderNumber}</div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
                {data.order.kdsStatus === 'READY' || data.order.kdsStatus === 'SERVED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                {data.order.kdsStatus}
              </span>
            </div>

            <div className="border-t border-stone-100 pt-3 space-y-2">
              {data.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>
                    {item.quantity} × {item.productName}
                  </span>
                  <span className="text-xs text-stone-500">{item.kdsItemStatus}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-200 pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatInr(data.order.totalPaise)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

