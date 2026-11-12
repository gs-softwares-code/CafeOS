'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Coffee, ShieldCheck, ArrowLeft, Lock } from 'lucide-react';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Authentication failed');
        return;
      }

      const role = data.staff?.role;
      if (role === 'reception') {
        router.push('/reception');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (role: 'owner' | 'reception') => {
    if (role === 'owner') {
      setEmail('owner@cafeos.in');
      setPassword('Owner@CafeOS2026');
    } else {
      setEmail('reception@cafeos.in');
      setPassword('Reception@CafeOS2026');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between text-[#1C130E] p-4">
      <header className="max-w-md w-full mx-auto pt-4 flex items-center justify-between">
        <Link
          href="/cafe/kurali-chai-bakehouse"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Storefront
        </Link>
        <div className="flex items-center gap-1.5 font-bold text-sm text-[#3f2316]">
          <Coffee className="w-4 h-4 text-amber-700" />
          <span>CafeOS Portal</span>
        </div>
      </header>

      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <div className="inline-flex p-3 rounded-2xl bg-amber-100 text-amber-900 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Staff &amp; Admin Sign In</h1>
            <p className="text-xs text-stone-600">
              Access role-protected dashboard for Owner or Reception / POS
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Staff Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. owner@cafeos.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#3f2316] hover:bg-[#563120] text-white font-semibold text-sm transition shadow-sm disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>

          {/* Quick Demo Credentials Helpers */}
          <div className="pt-4 border-t border-stone-100 space-y-2">
            <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider text-center">
              Quick Test Logins
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickDemo('owner')}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-left transition"
              >
                <div className="font-bold text-amber-900">Owner Account</div>
                <div className="text-[10px] text-stone-600">Full business &amp; menu controls</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('reception')}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition"
              >
                <div className="font-bold text-emerald-900">Reception / POS</div>
                <div className="text-[10px] text-stone-600">Counter orders &amp; kitchen queue</div>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-stone-600 pb-4">
        Protected by role-based session tokens &amp; tenant isolation
      </footer>
    </div>
  );
}

