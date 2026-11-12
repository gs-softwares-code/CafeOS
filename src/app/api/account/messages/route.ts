import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvironment } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth/customer-session';
import { isDevelopmentAdminApiEnabled } from '@/lib/api/admin-access';

export async function GET(req: NextRequest) {
  const d1 = getRuntimeEnvironment().DB;
  if (!d1) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const scope = req.nextUrl.searchParams.get('scope');
  const cafeId = req.nextUrl.searchParams.get('cafe_id') || 'cafe-kurali-01';

  if (scope === 'admin') {
    if (!isDevelopmentAdminApiEnabled()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const res = await d1
      .prepare(
        `SELECT * FROM customer_messages WHERE cafe_id = ? ORDER BY created_at DESC LIMIT 50`
      )
      .bind(cafeId)
      .all();
    return NextResponse.json({ messages: res.results ?? [] });
  }

  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const res = await d1
    .prepare(
      `SELECT * FROM customer_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`
    )
    .bind(session.userId)
    .all();

  return NextResponse.json({ messages: res.results ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to message the café admin' }, { status: 401 });
  }

  const d1 = getRuntimeEnvironment().DB;
  if (!d1) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = (await req.json()) as {
    subject?: string;
    message?: string;
    phone?: string;
  };

  const subject = body.subject?.trim();
  const message = body.message?.trim();
  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
  }

  const prefs = await d1
    .prepare('SELECT phone FROM customer_preferences WHERE user_id = ? LIMIT 1')
    .bind(session.userId)
    .first<{ phone: string }>();

  const id = `msg-${crypto.randomUUID()}`;
  await d1
    .prepare(
      `INSERT INTO customer_messages (id, cafe_id, user_id, customer_name, customer_phone, subject, message, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))`
    )
    .bind(
      id,
      session.cafeId,
      session.userId,
      session.fullName,
      body.phone?.trim() || prefs?.phone || '',
      subject,
      message
    )
    .run();

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!isDevelopmentAdminApiEnabled()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const d1 = getRuntimeEnvironment().DB;
  if (!d1) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = (await req.json()) as { id?: string; reply?: string };
  if (!body.id || !body.reply?.trim()) {
    return NextResponse.json({ error: 'Message ID and reply are required' }, { status: 400 });
  }

  await d1
    .prepare(
      `UPDATE customer_messages
       SET admin_reply = ?, status = 'replied', replied_at = datetime('now')
       WHERE id = ?`
    )
    .bind(body.reply.trim(), body.id)
    .run();

  return NextResponse.json({ ok: true });
}

