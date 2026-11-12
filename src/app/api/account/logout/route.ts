import { NextResponse } from 'next/server';
import { CUSTOMER_SESSION_COOKIE } from '@/lib/auth/customer-session';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(CUSTOMER_SESSION_COOKIE);
  return res;
}

