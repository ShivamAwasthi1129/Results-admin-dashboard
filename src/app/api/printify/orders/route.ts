import { NextRequest, NextResponse } from 'next/server';

const PRINTIFY_BASE = 'https://api.printify.com/v1';

function getPrintifyToken(): string | null {
  return process.env.PRINTIFY_API_TOKEN ?? process.env.PRINTIFY_API_KEY ?? null;
}

/**
 * GET /api/printify/orders?shop_id=...&page=1&limit=10&status=...
 */
export async function GET(request: NextRequest) {
  const token = getPrintifyToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Printify token not configured.' },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shop_id') ?? process.env.PRINTIFY_SHOP_ID ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
  const status = searchParams.get('status') ?? '';

  if (!shopId) {
    return NextResponse.json(
      { success: false, error: 'shop_id is required.' },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    const url = `${PRINTIFY_BASE}/shops/${encodeURIComponent(shopId)}/orders.json?${params}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Results-Admin-Dashboard',
      },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data?.message ?? data?.error ?? `Printify API ${res.status}` },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[api/printify/orders] GET', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/printify/orders – create order (forwards to Printify).
 * Body: { shop_id, external_id?, label?, line_items, shipping_method, address_to, send_shipping_notification? }
 * line_items for existing product: [{ product_id, variant_id, quantity }]
 */
export async function POST(request: NextRequest) {
  const token = getPrintifyToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Printify token not configured.' },
      { status: 503 }
    );
  }

  let body: {
    shop_id: string | number;
    external_id?: string;
    label?: string;
    line_items: Array<{ product_id: string; variant_id: number; quantity: number }>;
    shipping_method: number;
    address_to: {
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      country: string;
      region?: string;
      address1: string;
      address2?: string;
      city: string;
      zip: string;
    };
    send_shipping_notification?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const shopId = body.shop_id ?? process.env.PRINTIFY_SHOP_ID;
  if (!shopId || !body.line_items?.length || body.shipping_method == null || !body.address_to) {
    return NextResponse.json(
      { success: false, error: 'shop_id, line_items, shipping_method, and address_to are required.' },
      { status: 400 }
    );
  }

  const payload = {
    external_id: body.external_id ?? `admin-${Date.now()}`,
    label: body.label ?? undefined,
    line_items: body.line_items,
    shipping_method: Number(body.shipping_method),
    send_shipping_notification: body.send_shipping_notification ?? true,
    address_to: body.address_to,
  };

  try {
    const url = `${PRINTIFY_BASE}/shops/${encodeURIComponent(String(shopId))}/orders.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Results-Admin-Dashboard',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data?.message ?? data?.error ?? `Printify API ${res.status}` },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    return NextResponse.json({ success: true, data: { order_id: data.id, external_id: payload.external_id } });
  } catch (err) {
    console.error('[api/printify/orders]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
