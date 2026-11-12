import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { OrderStatus } from '@/lib/types';
import { isDevelopmentAdminApiEnabled } from '@/lib/api/admin-access';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const order = await db.getOrderById(orderId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { customer_phone: _customerPhone, cafe_id: _cafeId, ...publicOrder } = order;
    return NextResponse.json({ order: publicOrder });
  } catch (err: unknown) {
    console.error('Order lookup error:', err);
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  if (!isDevelopmentAdminApiEnabled()) {
    return NextResponse.json(
      { error: 'Staff authentication is not configured for order updates' },
      { status: 403 }
    );
  }

  try {
    const { orderId } = await context.params;
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid order update' }, { status: 400 });
    }
    const status = (body as Record<string, unknown>).status;

    const validStatuses: OrderStatus[] = ['received', 'preparing', 'ready', 'completed', 'cancelled'];
    if (typeof status !== 'string' || !validStatuses.includes(status as OrderStatus)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    const updated = await db.updateOrderStatus(orderId, status as OrderStatus);
    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err: unknown) {
    console.error('Order update error:', err);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
