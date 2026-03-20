import { NextRequest, NextResponse } from 'next/server';

const PRINTIFY_BASE = 'https://api.printify.com/v1';

function getPrintifyToken(): string | null {
  return process.env.PRINTIFY_API_TOKEN ?? process.env.PRINTIFY_API_KEY ?? null;
}

/** GET /api/printify/products/[productId] – get single product (full details, all images) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const token = getPrintifyToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Printify token not configured.' },
      { status: 503 }
    );
  }

  const { productId } = await params;
  const shopId = request.nextUrl.searchParams.get('shop_id') ?? process.env.PRINTIFY_SHOP_ID ?? '';

  if (!shopId || !productId) {
    return NextResponse.json(
      { success: false, error: 'shop_id and productId are required.' },
      { status: 400 }
    );
  }

  try {
    const url = `${PRINTIFY_BASE}/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}.json`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Results-Admin-Dashboard',
        'Content-Type': 'application/json; charset=utf-8',
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

    return NextResponse.json({ success: true, data: data });
  } catch (err) {
    console.error('[api/printify/products/[productId]]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

/** PUT /api/printify/products/[productId] – update product (title, description). Requires products.write scope. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const token = getPrintifyToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Printify token not configured.' },
      { status: 503 }
    );
  }

  const { productId } = await params;
  const shopId = request.nextUrl.searchParams.get('shop_id') ?? process.env.PRINTIFY_SHOP_ID ?? '';

  if (!shopId || !productId) {
    return NextResponse.json(
      { success: false, error: 'shop_id and productId are required.' },
      { status: 400 }
    );
  }

  let body: { title?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  if (!body || (body.title === undefined && body.description === undefined)) {
    return NextResponse.json(
      { success: false, error: 'Provide at least title or description.' },
      { status: 400 }
    );
  }

  try {
    const url = `${PRINTIFY_BASE}/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}.json`;
    // Printify expects a full product payload on PUT; merge into current product so title/description updates work reliably.
    const getRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Results-Admin-Dashboard',
        'Content-Type': 'application/json; charset=utf-8',
      },
      cache: 'no-store',
    });
    const current = await getRes.json().catch(() => null);
    if (!getRes.ok || !current || typeof current !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error:
            (current as { message?: string })?.message ??
            (current as { error?: string })?.error ??
            `Could not load product for update (${getRes.status})`,
        },
        { status: getRes.status >= 500 ? 502 : getRes.status || 502 }
      );
    }
    const merged = {
      ...(current as Record<string, unknown>),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    };
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Results-Admin-Dashboard',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(merged),
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
    console.error('[api/printify/products/[productId]] PUT', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}
