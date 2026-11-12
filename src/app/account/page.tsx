'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  Coffee,
  Download,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { showPwaNotification } from '@/components/pwa/PwaRegistrar';

interface OrderItemSummary {
  id: string;
  order_number: string;
  status: string;
  total: number;
  dining_option: string;
  created_at: string;
}

interface CustomerMsg {
  id: string;
  subject: string;
  message: string;
  admin_reply: string | null;
  status: string;
  created_at: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AccountPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; fullName: string; cafeId: string } | null>(null);
  const [tab, setTab] = useState<'preferences' | 'orders' | 'contact'>('preferences');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Auth form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Preferences
  const [dietaryPreference, setDietaryPreference] = useState('pure_veg');
  const [milkPreference, setMilkPreference] = useState('regular');
  const [sugarPreference, setSugarPreference] = useState('normal');
  const [favoriteNote, setFavoriteNote] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Orders & Messages
  const [orders, setOrders] = useState<OrderItemSummary[]>([]);
  const [messages, setMessages] = useState<CustomerMsg[]>([]);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const prevStatusesRef = useRef<Record<string, string>>({});

  // PWA permissions & install
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const loadAccount = async () => {
    try {
      const res = await fetch('/api/account/profile');
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setFullName(data.user.fullName);
      setPhone(data.preferences.phone);
      setDietaryPreference(data.preferences.dietaryPreference);
      setMilkPreference(data.preferences.milkPreference);
      setSugarPreference(data.preferences.sugarPreference);
      setFavoriteNote(data.preferences.favoriteNote);
      setNotificationsEnabled(data.preferences.notificationsEnabled);
      setMarketingOptIn(data.preferences.marketingOptIn);

      // Detect order status transitions and trigger PWA notification
      const nextOrders = (data.orders ?? []) as OrderItemSummary[];
      for (const ord of nextOrders) {
        const prev = prevStatusesRef.current[ord.id];
        if (prev && prev !== ord.status) {
          void showPwaNotification(
            `Order ${ord.order_number} is ${ord.status.toUpperCase()}`,
            `Your order at Verma & Sons is now ${ord.status}.`,
            `/order/${ord.id}`
          );
        }
        prevStatusesRef.current[ord.id] = ord.status;
      }
      setOrders(nextOrders);

      const msgRes = await fetch('/api/account/messages');
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(msgData.messages ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    void loadAccount();

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => void loadAccount(), 6000);
    return () => clearInterval(timer);
  }, [user]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const endpoint = mode === 'login' ? '/api/account/login' : '/api/account/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Authentication failed');
      return;
    }
    await loadAccount();
  };

  const handleSavePreferences = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        phone,
        dietaryPreference,
        milkPreference,
        sugarPreference,
        favoriteNote,
        notificationsEnabled,
        marketingOptIn,
      }),
    });
    if (!res.ok) {
      setError('Failed to save preferences');
      return;
    }
    setNotice('Preferences saved! Orders matching your phone number will sync automatically.');
    await loadAccount();
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const res = await fetch('/api/account/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: msgSubject, message: msgBody, phone }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to send message');
      return;
    }
    setMsgSubject('');
    setMsgBody('');
    setNotice('Message sent to café admin.');
    await loadAccount();
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      setError('Notifications are not supported on this browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      setNotificationsEnabled(true);
      await showPwaNotification(
        'CafeOS Alerts Enabled',
        'You will receive live updates when your order is being prepared and ready!'
      );
    }
  };

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const handleLogout = async () => {
    await fetch('/api/account/logout', { method: 'POST' });
    setUser(null);
    setOrders([]);
    setMessages([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] text-stone-600">
        Loading your CafeOS account...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C130E]">
      <header className="border-b border-stone-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/cafe/kurali-chai-bakehouse" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-stone-900">
            <ArrowLeft className="w-4 h-4" />
            Back to Café Menu
          </Link>
          <div className="flex items-center gap-2 font-bold text-[#3f2316]">
            <Coffee className="w-5 h-5 text-amber-700" />
            <span>Customer Account</span>
          </div>
          {user ? (
            <button onClick={() => void handleLogout()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          ) : (
            <span className="w-16" />
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* PWA Install & Mobile Notification Permissions Card */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-700" />
              Mobile PWA & Live Order Notifications
            </div>
            <p className="text-xs text-amber-900">
              Permission status: <span className="font-semibold uppercase">{notifPermission}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {notifPermission !== 'granted' ? (
              <button
                onClick={() => void requestNotifications()}
                className="px-3.5 py-2 rounded-xl bg-[#3f2316] text-white text-xs font-semibold hover:bg-[#563120]"
              >
                Enable Notifications
              </button>
            ) : (
              <button
                onClick={() => void showPwaNotification('CafeOS Test Alert', 'Order notifications are active on this device.')}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
              >
                Test Alert
              </button>
            )}
            {installPrompt && (
              <button
                onClick={() => void handleInstallPwa()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-700 text-white text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> Install App
              </button>
            )}
          </div>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {notice && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {notice}
          </div>
        )}

        {!user ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
            <div className="flex rounded-xl bg-stone-100 p-1 text-sm font-semibold">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-lg transition ${mode === 'login' ? 'bg-white shadow-sm' : 'text-stone-500'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 rounded-lg transition ${mode === 'register' ? 'bg-white shadow-sm' : 'text-stone-500'}`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={(e) => void handleAuth(e)} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Full Name</label>
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rohan Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Phone Number (links your orders)</label>
                    <input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-[#3f2316] text-white font-semibold text-sm hover:bg-[#563120]">
                {mode === 'login' ? 'Sign In to My Account' : 'Create Account'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTab('preferences')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                  tab === 'preferences' ? 'bg-[#3f2316] text-white' : 'bg-white border border-stone-200'
                }`}
              >
                <Settings className="w-4 h-4" /> Preferences
              </button>
              <button
                onClick={() => setTab('orders')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                  tab === 'orders' ? 'bg-[#3f2316] text-white' : 'bg-white border border-stone-200'
                }`}
              >
                <Package className="w-4 h-4" /> My Orders ({orders.length})
              </button>
              <button
                onClick={() => setTab('contact')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                  tab === 'contact' ? 'bg-[#3f2316] text-white' : 'bg-white border border-stone-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Contact Admin ({messages.length})
              </button>
            </div>

            {tab === 'preferences' && (
              <form onSubmit={(e) => void handleSavePreferences(e)} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
                <h2 className="font-bold text-lg">Saved Account & Taste Preferences</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Full Name</label>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Phone Number (used on orders)</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Dietary Preference</label>
                    <select value={dietaryPreference} onChange={(e) => setDietaryPreference(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm">
                      <option value="pure_veg">Pure Veg Only</option>
                      <option value="all">Veg & Non-Veg</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Milk Preference</label>
                    <select value={milkPreference} onChange={(e) => setMilkPreference(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm">
                      <option value="regular">Regular Dairy</option>
                      <option value="oat">Oat Milk</option>
                      <option value="almond">Almond Milk</option>
                      <option value="soy">Soy Milk</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Default Barista Note</label>
                  <input
                    value={favoriteNote}
                    onChange={(e) => setFavoriteNote(e.target.value)}
                    placeholder="e.g. Less sugar, extra hot kulhad chai"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-6 pt-1 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
                    Order status push alerts
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
                    Receive seasonal offers & rewards
                  </label>
                </div>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#3f2316] text-white font-semibold text-sm">
                  Save Preferences
                </button>
              </form>
            )}

            {tab === 'orders' && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
                <h2 className="font-bold text-lg">Your Order History & Live Status</h2>
                {orders.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    No orders found for phone <span className="font-semibold">{phone || '(not set)'}</span>. Save your phone number in Preferences to link your orders.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orders.map((o) => (
                      <Link
                        key={o.id}
                        href={`/order/${o.id}`}
                        className="block p-4 rounded-xl border border-stone-200 hover:border-amber-600 transition flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold">{o.order_number}</div>
                          <div className="text-xs text-stone-500">
                            {o.dining_option} • {new Date(o.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₹{o.total}</div>
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold uppercase">
                            {o.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'contact' && (
              <div className="grid md:grid-cols-2 gap-6">
                <form onSubmit={(e) => void handleSendMessage(e)} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
                  <h2 className="font-bold text-lg">Message Café Admin</h2>
                  <input
                    required
                    value={msgSubject}
                    onChange={(e) => setMsgSubject(e.target.value)}
                    placeholder="Subject (e.g. Order #CF-... / Catering inquiry)"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                  <textarea
                    required
                    rows={4}
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder="Write your message to the café team..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#3f2316] text-white font-semibold text-sm">
                    Send Message
                  </button>
                </form>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
                  <h2 className="font-bold text-lg">Your Conversations</h2>
                  {messages.length === 0 ? (
                    <p className="text-sm text-stone-500">No messages yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {messages.map((m) => (
                        <div key={m.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-bold">{m.subject}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200">{m.status}</span>
                          </div>
                          <p className="text-stone-700 text-xs">{m.message}</p>
                          {m.admin_reply && (
                            <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                              <span className="font-semibold">Admin Reply:</span> {m.admin_reply}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

