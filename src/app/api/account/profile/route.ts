import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvironment } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth/customer-session';

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const d1 = getRuntimeEnvironment().DB;
  if (!d1) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const user = await d1
    .prepare('SELECT id, email, full_name, cafe_id FROM users WHERE id = ? LIMIT 1')
    .bind(session.userId)
    .first<{ id: string; email: string; full_name: string; cafe_id: string | null }>();

  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const prefs = await d1
    .prepare('SELECT * FROM customer_preferences WHERE user_id = ? LIMIT 1')
    .bind(session.userId)
    .first<{
      phone: string;
      dietary_preference: string;
      milk_preference: string;
      sugar_preference: string;
      favorite_note: string;
      notifications_enabled: number;
      marketing_opt_in: number;
    }>();

  let orders: Array<{
    id: string;
    order_number: string;
    status: string;
    total: number;
    dining_option: string;
    created_at: string;
  }> = [];

  if (prefs?.phone) {
    const cleanPhone = prefs.phone.trim();
    const res = await d1
      .prepare(
        `SELECT id, order_number, status, total, dining_option, created_at
         FROM orders
         WHERE cafe_id = ? AND customer_phone = ?
         ORDER BY created_at DESC
         LIMIT 25`
      )
      .bind(session.cafeId, cleanPhone)
      .all<{
        id: string;
        order_number: string;
        status: string;
        total: number;
        dining_option: string;
        created_at: string;
      }>();
    orders = (res.results ?? []).map((o) => ({
      ...o,
      total: Math.round(o.total) / 100,
    }));
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      cafeId: user.cafe_id ?? session.cafeId,
    },
    preferences: {
      phone: prefs?.phone ?? '',
      dietaryPreference: prefs?.dietary_preference ?? 'pure_veg',
      milkPreference: prefs?.milk_preference ?? 'regular',
      sugarPreference: prefs?.sugar_preference ?? 'normal',
      favoriteNote: prefs?.favorite_note ?? '',
      notificationsEnabled: Boolean(prefs?.notifications_enabled),
      marketingOptIn: Boolean(prefs?.marketing_opt_in),
    },
    orders,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const d1 = getRuntimeEnvironment().DB;
  if (!d1) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = (await req.json()) as {
    fullName?: string;
    phone?: string;
    dietaryPreference?: string;
    milkPreference?: string;
    sugarPreference?: string;
    favoriteNote?: string;
    notificationsEnabled?: boolean;
    marketingOptIn?: boolean;
  };

  if (body.fullName?.trim()) {
    await d1
      .prepare("UPDATE users SET full_name = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(body.fullName.trim(), session.userId)
      .run();
  }

  await d1
    .prepare(
      `INSERT INTO customer_preferences (
        user_id, phone, dietary_preference, milk_preference, sugar_preference,
        favorite_note, notifications_enabled, marketing_opt_in, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        phone = excluded.phone,
        dietary_preference = excluded.dietary_preference,
        milk_preference = excluded.milk_preference,
        sugar_preference = excluded.sugar_preference,
        favorite_note = excluded.favorite_note,
        notifications_enabled = excluded.notifications_enabled,
        marketing_opt_in = excluded.marketing_opt_in,
        updated_at = datetime('now')`
    )
    .bind(
      session.userId,
      body.phone?.trim() ?? '',
      body.dietaryPreference ?? 'pure_veg',
      body.milkPreference ?? 'regular',
      body.sugarPreference ?? 'normal',
      body.favoriteNote?.trim() ?? '',
      body.notificationsEnabled ? 1 : 0,
      body.marketingOptIn ? 1 : 0
    )
    .run();

  return NextResponse.json({ ok: true });
}

