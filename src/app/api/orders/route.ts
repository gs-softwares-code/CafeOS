import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { OrderSubmissionItem, OrderSubmissionPayload } from '@/lib/types';
import { OrderValidationError } from '@/lib/db/d1';
import { isDevelopmentAdminApiEnabled } from '@/lib/api/admin-access';

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
    }

    const input = body as Record<string, unknown>;

    if (typeof input.cafe_id !== 'string' || !input.cafe_id.trim()) {
      return NextResponse.json({ error: 'Missing required field: cafe_id' }, { status: 400 });
    }
    if (typeof input.customer_name !== 'string' || !input.customer_name.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (typeof input.customer_phone !== 'string' || !input.customer_phone.trim()) {
      return NextResponse.json({ error: 'Customer phone number is required' }, { status: 400 });
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      return NextResponse.json({ error: 'At least one item must be ordered' }, { status: 400 });
    }

    const items: OrderSubmissionItem[] = [];
    for (const item of input.items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return NextResponse.json({ error: 'Invalid order item' }, { status: 400 });
      }
      const requested = item as Record<string, unknown>;
      if (typeof requested.menu_item_id !== 'string' || typeof requested.quantity !== 'number') {
        return NextResponse.json({ error: 'Invalid order item' }, { status: 400 });
      }
      if (requested.notes !== undefined && typeof requested.notes !== 'string') {
        return NextResponse.json({ error: 'Invalid order item' }, { status: 400 });
      }
      items.push({
        menu_item_id: requested.menu_item_id,
        quantity: requested.quantity,
        notes: requested.notes as string | undefined,
      });
    }

    if (
      input.dining_option !== undefined &&
      input.dining_option !== 'dine_in' &&
      input.dining_option !== 'takeaway'
    ) {
      return NextResponse.json({ error: 'Invalid dining option' }, { status: 400 });
    }

    const optionalString = (value: unknown, field: string): string | undefined => {
      if (value === undefined) return undefined;
      if (typeof value !== 'string') throw new OrderValidationError(`Invalid ${field}`);
      return value;
    };

    const payload: OrderSubmissionPayload = {
      cafe_id: input.cafe_id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      special_instructions: optionalString(input.special_instructions, 'special instructions'),
      dining_option: input.dining_option as OrderSubmissionPayload['dining_option'],
      table_number: optionalString(input.table_number, 'table number'),
      items,
    };
    const order = await db.createOrder(payload);
    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Order creation error:', err);
    return NextResponse.json(
      { error: 'Failed to process order' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!isDevelopmentAdminApiEnabled()) {
    return NextResponse.json(
      { error: 'Staff authentication is not configured for order listing' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const cafeId = searchParams.get('cafe_id');

    if (!cafeId) {
      return NextResponse.json({ error: 'cafe_id query parameter is required' }, { status: 400 });
    }

    // Tenant isolation: returns only orders belonging to cafeId
    const orders = await db.getOrders(cafeId);
    return NextResponse.json({ orders });
  } catch (err: unknown) {
    console.error('Order listing error:', err);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}
