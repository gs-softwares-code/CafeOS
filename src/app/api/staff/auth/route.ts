import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvironment } from '@/lib/db';
import { D1DatabaseBinding } from '@/lib/db/d1';
import { hashPassword, verifyPassword } from '@/lib/auth/customer-session';
import {
  STAFF_SESSION_COOKIE,
  createStaffSessionToken,
  getStaffSession,
  StaffRole,
} from '@/lib/auth/staff-session';

async function ensureDefaultStaffAccounts(d1: D1DatabaseBinding) {
  const countRes = await d1
    .prepare("SELECT COUNT(*) AS c FROM users WHERE role IN ('owner', 'manager', 'staff', 'reception')")
    .first<{ c: number }>();

  if (countRes && countRes.c > 0) return;

  const ownerHash = await hashPassword('Owner@CafeOS2026');
  const receptionHash = await hashPassword('Reception@CafeOS2026');

  await d1
    .prepare(
      `INSERT INTO users (id, cafe_id, email, password_hash, full_name, role, created_at, updated_at)
       VALUES (?, 'cafe-kurali-01', ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind('usr-owner-01', 'owner@cafeos.in', ownerHash, 'Asha Verma (Owner)', 'owner')
    .run();

  await d1
    .prepare(
      `INSERT INTO users (id, cafe_id, email, password_hash, full_name, role, created_at, updated_at)
       VALUES (?, 'cafe-kurali-01', ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind('usr-reception-01', 'reception@cafeos.in', receptionHash, 'Front Desk / Cashier', 'reception')
    .run();
}

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ staff: session });
}

export async function POST(req: NextRequest) {
  try {
    const d1 = getRuntimeEnvironment().DB;
    if (!d1) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    await ensureDefaultStaffAccounts(d1);

    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await d1
      .prepare(
        `SELECT id, cafe_id, email, password_hash, full_name, role
         FROM users
         WHERE email = ? AND role IN ('owner', 'manager', 'staff', 'reception')
         LIMIT 1`
      )
      .bind(email)
      .first<{
        id: string;
        cafe_id: string | null;
        email: string;
        password_hash: string;
        full_name: string;
        role: string;
      }>();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid staff credentials' }, { status: 401 });
    }

    // Map 'staff' role or 'reception' to 'reception' for front desk routing
    const role: StaffRole =
      user.role === 'owner' ? 'owner' : 'reception';
    const cafeId = user.cafe_id ?? 'cafe-kurali-01';

    const token = await createStaffSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      cafeId,
      role,
    });

    const res = NextResponse.json({
      staff: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        cafeId,
        role,
      },
    });

    res.cookies.set(STAFF_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (err) {
    console.error('Staff login error:', err);
    return NextResponse.json({ error: 'Staff authentication failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(STAFF_SESSION_COOKIE);
  return res;
}
