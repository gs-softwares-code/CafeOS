import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Receipt,
  BarChart3,
  ShieldCheck,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { formatInr } from '@cafeos/shared';
import { api } from '../lib/api.js';

type Tab = 'overview' | 'inventory' | 'procurement' | 'accounting' | 'audit';

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof api.getAccountingSummary>>['summary'] | null>(null);
  const [inventoryData, setInventoryData] = useState<Awaited<ReturnType<typeof api.getInventory>> | null>(null);
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof api.getSuppliers>>['suppliers']>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<Awaited<ReturnType<typeof api.getPurchaseOrders>>['purchaseOrders']>([]);
  const [journals, setJournals] = useState<Awaited<ReturnType<typeof api.getJournals>>['journals']>([]);
  const [auditData, setAuditData] = useState<Awaited<ReturnType<typeof api.getAuditLogs>> | null>(null);

  // Expense form state
  const [expCategory, setExpCategory] = useState<'RENT' | 'UTILITIES' | 'SALARY' | 'SUPPLIES' | 'OTHER'>('SUPPLIES');
  const [expDesc, setExpDesc] = useState('');
  const [expRupees, setExpRupees] = useState('');

  const loadAll = async () => {
    try {
      setError(null);
      const [sumRes, invRes, supRes, poRes, jrnRes, audRes] = await Promise.all([
        api.getAccountingSummary(),
        api.getInventory(),
        api.getSuppliers(),
        api.getPurchaseOrders(),
        api.getJournals(),
        api.getAuditLogs(),
      ]);
      setSummary(sumRes.summary);
      setInventoryData(invRes);
      setSuppliers(supRes.suppliers);
      setPurchaseOrders(poRes.purchaseOrders);
      setJournals(jrnRes.journals);
      setAuditData(audRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in as Owner/Manager to view dashboard');
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleRecordExpense = async (e: FormEvent) => {
    e.preventDefault();
    const paise = Math.round(Number(expRupees) * 100);
    if (!paise || paise <= 0) return;
    await api.createExpense({
      category: expCategory,
      description: expDesc,
      amountPaise: paise,
      paymentMode: 'CASH',
    });
    setExpDesc('');
    setExpRupees('');
    await loadAll();
  };

  const handleWaste = async (ingredientId: string) => {
    await api.adjustStock({ ingredientId, deltaQty: -10, reason: 'WASTE' });
    await loadAll();
  };

  const handleReceivePo = async (id: string) => {
    await api.receivePurchaseOrder(id);
    await loadAll();
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
    { id: 'overview', label: 'Overview & P&L', icon: BarChart3 },
    { id: 'inventory', label: 'Inventory & Ledger', icon: Package },
    { id: 'procurement', label: 'Procurement', icon: Truck },
    { id: 'accounting', label: 'Accounting & Journals', icon: Receipt },
    { id: 'audit', label: 'Audit & Alerts', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <header className="h-16 bg-white border-b border-stone-200 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-stone-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-lg">Enterprise Owner Dashboard</h1>
        </div>
        <Link to="/login" className="text-sm font-semibold text-amber-800 hover:underline">
          Staff Account
        </Link>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm">
            {error} — <Link to="/login" className="underline font-semibold">Sign in</Link> (e.g. `owner@cafeos.in` / `CafeOwner@2026`).
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                tab === t.id
                  ? 'bg-[#3f2316] text-white'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && summary && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <div className="text-xs text-stone-500 uppercase font-semibold">Gross Sales ({summary.orderCount} orders)</div>
              <div className="text-2xl font-bold mt-1">{formatInr(summary.grossSalesPaise)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <div className="text-xs text-stone-500 uppercase font-semibold">Net Revenue (Excl. GST)</div>
              <div className="text-2xl font-bold mt-1">{formatInr(summary.netRevenuePaise)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <div className="text-xs text-stone-500 uppercase font-semibold">GST Liability</div>
              <div className="text-2xl font-bold mt-1">{formatInr(summary.totalTaxPaise)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <div className="text-xs text-stone-500 uppercase font-semibold">Operating Expenses</div>
              <div className="text-2xl font-bold mt-1 text-red-700">{formatInr(summary.totalExpensesPaise)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm sm:col-span-2">
              <div className="text-xs text-emerald-800 uppercase font-semibold">Net Profit</div>
              <div className="text-2xl font-bold mt-1 text-emerald-900">{formatInr(summary.netProfitPaise)}</div>
            </div>
          </div>
        )}

        {tab === 'inventory' && inventoryData && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="p-4 border-b border-stone-200 font-bold">Ingredient Stock</div>
              <div className="divide-y divide-stone-100">
                {inventoryData.items.map((item) => {
                  const qty = Number(item.currentQty ?? 0);
                  const low = qty <= Number(item.lowStockThreshold);
                  return (
                    <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {item.name}
                          {low && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500">
                          Current: {qty} {item.unit} • Alert below {item.lowStockThreshold} {item.unit}
                        </div>
                      </div>
                      <button
                        onClick={() => void handleWaste(item.id)}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold hover:bg-stone-100"
                      >
                        Log Waste (-10 {item.unit})
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'procurement' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
              <h2 className="font-bold">Suppliers</h2>
              {suppliers.map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-stone-500">{s.contactName} • {s.phone}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
              <h2 className="font-bold">Purchase Orders</h2>
              {purchaseOrders.length === 0 ? (
                <p className="text-sm text-stone-400">No purchase orders yet.</p>
              ) : (
                purchaseOrders.map((po) => (
                  <div key={po.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold">{formatInr(po.totalPaise)}</div>
                      <div className="text-xs text-stone-500">{po.status}</div>
                    </div>
                    {po.status !== 'RECEIVED' && (
                      <button
                        onClick={() => void handleReceivePo(po.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Receive Goods
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'accounting' && (
          <div className="grid md:grid-cols-2 gap-6">
            <form onSubmit={(e) => void handleRecordExpense(e)} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
              <h2 className="font-bold">Record Operating Expense (Double-Entry)</h2>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as typeof expCategory)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
              >
                <option value="SUPPLIES">Supplies</option>
                <option value="UTILITIES">Utilities</option>
                <option value="RENT">Rent</option>
                <option value="SALARY">Salary</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                required
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="Description (e.g. Milk & Ice delivery)"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
              />
              <input
                required
                type="number"
                step="0.01"
                value={expRupees}
                onChange={(e) => setExpRupees(e.target.value)}
                placeholder="Amount in ₹"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
              />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-[#3f2316] text-white font-semibold text-sm">
                Post Expense & Journal Entry
              </button>
            </form>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
              <h2 className="font-bold">Recent Journal Entries</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {journals.map((j) => (
                  <div key={j.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm">
                    <div className="font-semibold">{j.description}</div>
                    <div className="text-xs text-stone-500">
                      {j.referenceType} • {new Date(j.postedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'audit' && auditData && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
              <h2 className="font-bold">Security & Audit Trail</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {auditData.auditLogs.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                    <span className="font-bold">{a.action}</span> on <span className="font-mono">{a.entityType}</span> •{' '}
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
              <h2 className="font-bold">System Alerts</h2>
              {auditData.notifications.length === 0 ? (
                <p className="text-sm text-stone-400">No active alerts.</p>
              ) : (
                auditData.notifications.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                    <div className="font-semibold">{n.title}</div>
                    <div className="text-xs text-amber-900">{n.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
