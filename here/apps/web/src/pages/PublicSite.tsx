import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, Clock, MapPin, ShoppingBag, Monitor, ChefHat, LayoutDashboard } from 'lucide-react';
import { formatInr } from '@cafeos/shared';
import { api } from '../lib/api.js';

const DEFAULT_BRANCH_ID = '00000000-0000-0000-0000-000000000001';

export function PublicSite() {
  const [menu, setMenu] = useState<Awaited<ReturnType<typeof api.getMenu>> | null>(null);

  useEffect(() => {
    void api.getMenu(DEFAULT_BRANCH_ID).then(setMenu).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f2] text-stone-900">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-xl text-[#3f2316]">
            <Coffee className="w-6 h-6 text-amber-700" />
            <span>CafeOS Roastery</span>
          </div>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link to="/order" className="px-3 py-2 rounded-lg bg-[#3f2316] text-white hover:bg-[#563120]">
              Order Online
            </Link>
            <Link to="/pos" className="px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100">
              POS
            </Link>
            <Link to="/kds" className="px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100">
              KDS
            </Link>
            <Link to="/admin" className="px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold tracking-wide uppercase">
              Specialty Coffee & Fresh Bakes
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900 leading-tight">
              Crafted fresh every morning. Ordered in seconds.
            </h1>
            <p className="text-stone-600 text-lg leading-relaxed">
              Scan at your table or order ahead for pickup. Powered by one unified café operating system connecting our kitchen, counter, and menu in real time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/order"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#3f2316] text-white font-semibold hover:bg-[#563120] transition"
              >
                <ShoppingBag className="w-5 h-5" />
                Browse Menu & Order
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-stone-300 bg-white font-semibold hover:bg-stone-100 transition"
              >
                Staff Login
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link to="/pos" className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition space-y-2">
              <Monitor className="w-8 h-8 text-amber-700" />
              <h3 className="font-bold text-lg">Offline-First POS</h3>
              <p className="text-sm text-stone-600">Fast counter billing with IndexedDB queue & zero lost orders.</p>
            </Link>
            <Link to="/kds" className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition space-y-2">
              <ChefHat className="w-8 h-8 text-amber-700" />
              <h3 className="font-bold text-lg">Kitchen Display</h3>
              <p className="text-sm text-stone-600">Live preparation queue with timers & item status tracking.</p>
            </Link>
            <Link to="/admin" className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition space-y-2">
              <LayoutDashboard className="w-8 h-8 text-amber-700" />
              <h3 className="font-bold text-lg">Owner Dashboard</h3>
              <p className="text-sm text-stone-600">Recipe inventory, GST accounting, staff, CRM & analytics.</p>
            </Link>
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <Clock className="w-8 h-8 text-amber-800" />
              <h3 className="font-bold text-lg">Open Daily</h3>
              <p className="text-sm text-amber-900">7:30 AM – 10:30 PM</p>
              <p className="text-xs text-amber-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Indiranagar, Bengaluru
              </p>
            </div>
          </div>
        </section>

        {menu && menu.products.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-20 space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-stone-900">Our Café Menu</h2>
                <p className="text-stone-600 text-sm mt-1">Single-origin roasts, slow cold brews, laminated pastries & sourdough grills</p>
              </div>
              <Link to="/order" className="text-sm font-semibold text-amber-800 hover:underline">
                Order Now →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {menu.products.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-44 object-cover bg-stone-100"
                      loading="lazy"
                    />
                  )}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                        <h3 className="font-bold text-stone-900">{item.name}</h3>
                      </div>
                      {item.description && (
                        <p className="text-xs text-stone-500 mt-1">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                      <span className="font-bold text-amber-900">{formatInr(item.pricePaise)}</span>
                      <Link
                        to="/order"
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200"
                      >
                        Add
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
