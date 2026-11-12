import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isDevelopmentAdminApiEnabled } from '@/lib/api/admin-access';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  if (!isDevelopmentAdminApiEnabled()) {
    return NextResponse.json(
      { error: 'Staff authentication is not configured for menu changes' },
      { status: 403 }
    );
  }

  try {
    const { itemId } = await context.params;
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid menu item update' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if (input.price !== undefined) {
      const p = Number(input.price);
      if (isNaN(p) || p < 0) {
        return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
      }
      updates.price = p;
    }
    if (input.is_available !== undefined) {
      if (typeof input.is_available !== 'boolean') {
        return NextResponse.json({ error: 'Invalid availability value' }, { status: 400 });
      }
      updates.is_available = input.is_available;
    }
    if (input.name !== undefined) {
      if (typeof input.name !== 'string' || !input.name.trim()) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
      updates.name = input.name.trim();
    }
    if (input.description !== undefined) {
      if (typeof input.description !== 'string') {
        return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
      }
      updates.description = input.description.trim();
    }
    if (input.category_id !== undefined) {
      if (typeof input.category_id !== 'string') {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      updates.category_id = input.category_id;
    }
    if (input.is_veg !== undefined) {
      if (typeof input.is_veg !== 'boolean') {
        return NextResponse.json({ error: 'Invalid vegetarian value' }, { status: 400 });
      }
      updates.is_veg = input.is_veg;
    }
    if (input.image_url !== undefined) {
      if (typeof input.image_url !== 'string') {
        return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
      }
      updates.image_url = input.image_url.trim();
    }

    const updated = await db.updateMenuItem(itemId, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (err: unknown) {
    console.error('Menu update error:', err);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  if (!isDevelopmentAdminApiEnabled()) {
    return NextResponse.json(
      { error: 'Staff authentication is not configured for menu changes' },
      { status: 403 }
    );
  }

  try {
    const { itemId } = await context.params;
    const deleted = await db.deleteMenuItem(itemId);

    if (!deleted) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
