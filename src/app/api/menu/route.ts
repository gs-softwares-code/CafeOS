import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isDevelopmentAdminApiEnabled } from '@/lib/api/admin-access';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let cafeId = searchParams.get('cafe_id');
    const cafeSlug = searchParams.get('cafe_slug');

    if (!cafeId && cafeSlug) {
      const cafe = await db.getCafeBySlug(cafeSlug);
      if (!cafe) {
        return NextResponse.json({ error: 'Café not found' }, { status: 404 });
      }
      cafeId = cafe.id;
    }

    if (!cafeId) {
      return NextResponse.json(
        { error: 'cafe_id or cafe_slug query parameter is required' },
        { status: 400 }
      );
    }

    const items = await db.getMenuItems(cafeId);
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isDevelopmentAdminApiEnabled()) {
    return NextResponse.json(
      { error: 'Staff authentication is not configured for menu changes' },
      { status: 403 }
    );
  }

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid menu item' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;

    if (
      typeof input.cafe_id !== 'string' ||
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.price === undefined
    ) {
      return NextResponse.json({ error: 'cafe_id, name, and price are required' }, { status: 400 });
    }

    const price = Number(input.price);
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
    }

    const newItem = await db.createMenuItem({
      cafe_id: input.cafe_id,
      category_id: typeof input.category_id === 'string' ? input.category_id : '',
      name: input.name.trim(),
      description: typeof input.description === 'string' ? input.description.trim() : '',
      price,
      image_url: typeof input.image_url === 'string' && input.image_url.trim()
        ? input.image_url.trim()
        : 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=80',
      is_available: input.is_available !== false,
      is_veg: input.is_veg !== false,
      is_featured: Boolean(input.is_featured),
      preparation_time_minutes: Number(input.preparation_time_minutes) || 10,
    });

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
