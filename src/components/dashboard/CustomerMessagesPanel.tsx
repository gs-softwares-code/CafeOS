'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

interface AdminMsg {
  id: string;
  customer_name: string;
  customer_phone: string;
  subject: string;
  message: string;
  admin_reply: string | null;
  status: string;
  created_at: string;
}

export function CustomerMessagesPanel({ cafeId }: { cafeId: string }) {
  const [messages, setMessages] = useState<AdminMsg[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const res = await fetch(`/api/account/messages?scope=admin&cafe_id=${encodeURIComponent(cafeId)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch {
      // Ignore transient polling errors
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [cafeId]);

  const sendReply = async (id: string) => {
    const reply = replies[id]?.trim();
    if (!reply) return;
    await fetch('/api/account/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reply }),
    });
    setReplies((prev) => ({ ...prev, [id]: '' }));
    await load();
  };

  return (
    <section className="bg-white rounded-2xl border border-[#EFE7D5] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-[#1C130E] flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#D9531E]" />
          Customer Messages &amp; Inquiries ({messages.length})
        </h3>
      </div>

      {messages.length === 0 ? (
        <p className="text-xs text-stone-500">No customer messages yet.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#EFE7D5] space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-stone-900">
                  {m.subject}{' '}
                  <span className="font-normal text-xs text-stone-500">
                    — {m.customer_name} ({m.customer_phone || 'no phone'})
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold uppercase">
                  {m.status}
                </span>
              </div>
              <p className="text-xs text-stone-700">{m.message}</p>
              {m.admin_reply ? (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  <span className="font-semibold">Your Reply:</span> {m.admin_reply}
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <input
                    value={replies[m.id] ?? ''}
                    onChange={(e) => setReplies((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="Write a reply to the customer..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                  />
                  <button
                    onClick={() => void sendReply(m.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#3f2316] text-white text-xs font-semibold"
                  >
                    <Send className="w-3 h-3" /> Reply
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

