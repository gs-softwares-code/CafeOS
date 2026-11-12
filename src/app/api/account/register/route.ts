import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvironment } from '@/lib/db';
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionToken,
  hashPassword,
} from '@/lib/auth/customer-session';

export async function POST(req: NextRequest) {
  try {
    const d1 = getRuntimeEnvironment().DB;
    if (!d1) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = (await req.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
      phone?: string;
      cafeId?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    const fullName = body.fullName?.trim();
    const phone = body.phone?.trim() ?? '';
    const cafeId = body.cafeId?.trim() || 'cafe-kurali-01';

    if (!email || !email.includes('@') || password.length < 6 || !fullName) {
      return NextResponse.json(
        { error: 'Valid full name, email, and password (min 6 chars) are required' },
        { status: 400 }
      );
    }

    const existing = await d1
      .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
      .bind(email)
      .first<{ id: string }>();

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const userId = `cust-${crypto.randomUUID()}`;
    const passwordHash = await hashPassword(password);

    await d1
      .prepare(
        `INSERT INTO users (id, cafe_id, email, password_hash, full_name, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'customer', datetime('now'), datetime('now'))`
      )
      .bind(userId, cafeId, email, passwordHash, fullName)
      .run();

    await d1
      .prepare(
        `INSERT INTO customer_preferences (user_id, phone, updated_at)
         VALUES (?, ?, datetime('now'))`
      )
      .bind(userId, phone)
      .run();

    const token = await createCustomerSessionToken({
      userId,
      email,
      fullName,
      cafeId,
    });

    const res = NextResponse.json(
      { user: { id: userId, email, fullName, cafeId } },
      { status: 201 }
    );
    res.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
    });
    return res;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}

