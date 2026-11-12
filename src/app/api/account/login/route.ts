import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvironment } from '@/lib/db';
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionToken,
  verifyPassword,
} from '@/lib/auth/customer-session';

export async function POST(req: NextRequest) {
  try {
    const d1 = getRuntimeEnvironment().DB;
    if (!d1) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await d1
      .prepare('SELECT id, cafe_id, email, password_hash, full_name FROM users WHERE email = ? LIMIT 1')
      .bind(email)
      .first<{
        id: string;
        cafe_id: string | null;
        email: string;
        password_hash: string;
        full_name: string;
      }>();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const cafeId = user.cafe_id ?? 'cafe-kurali-01';
    const token = await createCustomerSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      cafeId,
    });

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.full_name, cafeId },
    });
    res.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
    });
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
  }
}

