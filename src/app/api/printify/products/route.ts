import { NextRequest, NextResponse } from 'next/server';

const PRINTIFY_BASE = 'https://api.printify.com/v1';

function getPrintifyToken(): string | null {
  return process.env.PRINTIFY_API_TOKEN ?? process.env.PRINTIFY_API_KEY ?? null;
}

/** GET /api/printify/products – list products for a shop (server-side only) */
export async function GET(request: NextRequest) {
  const token = getPrintifyToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Printify token not configured. Set PRINTIFY_API_TOKEN or PRINTIFY_API_KEY.' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  let shopId = searchParams.get('shop_id') ?? process.env.PRINTIFY_SHOP_ID ?? '';

  if (!shopId) {
    return NextResponse.json(
      { success: false, error: 'Shop ID required. Set PRINTIFY_SHOP_ID or pass shop_id query.' },
      { status: 400 }
    );
  }

  try {
    const url = `${PRINTIFY_BASE}/shops/${encodeURIComponent(shopId)}/products.json?page=${page}&limit=${limit}`;
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

    const products = data?.data ?? (Array.isArray(data) ? data : []);
    const total = typeof data?.total === 'number' ? data.total : products.length;

    return NextResponse.json({
      success: true,
      data: {
        products,
        total,
        page,
        limit,
      },
    });
  } catch (err) {
    console.error('[api/printify/products]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Printify products' },
      { status: 500 }
    );
  }
}
