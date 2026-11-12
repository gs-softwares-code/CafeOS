import { NextResponse } from 'next/server';
import { db, getRuntimeEnvironment } from '@/lib/db';

export async function POST(req: Request) {
  const environment = getRuntimeEnvironment();
  if (environment.ENVIRONMENT !== 'development') {
    return NextResponse.json(
      { error: 'Demo data reset is disabled outside a development environment' },
      { status: 403 }
    );
  }

  const expectedKey = environment.ADMIN_RESET_SECRET;
  if (!expectedKey || req.headers.get('x-admin-reset-key') !== expectedKey) {
    return NextResponse.json(
      { error: 'A valid administrative reset key is required' },
      { status: 401 }
    );
  }

  try {
    await db.resetDemoData();
    return NextResponse.json({
      success: true,
      message: 'Demo dataset has been successfully reset to initial seed state.'
    });
  } catch (err: unknown) {
    console.error('Demo reset error:', err);
    return NextResponse.json({ error: 'Failed to reset demo data' }, { status: 500 });
  }
}
