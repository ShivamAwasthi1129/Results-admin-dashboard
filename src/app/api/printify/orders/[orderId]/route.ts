import { NextRequest, NextResponse } from 'next/server';

const PRINTIFY_BASE = 'https://api.printify.com/v1';

function getPrintifyToken(): string | null {
  return process.env.PRINTIFY_API_TOKEN ?? process.env.PRINTIFY_API_KEY ?? null;
}

/**
 * GET /api/printify/orders/[orderId]?shop_id=...
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const token = getPrintifyToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Printify token not configured.' },
      { status: 503 }
    );
  }
  const { orderId } = await params;
  const shopId = request.nextUrl.searchParams.get('shop_id') ?? process.env.PRINTIFY_SHOP_ID ?? '';

  if (!shopId || !orderId) {
    return NextResponse.json(
      { success: false, error: 'shop_id and orderId are required.' },
      { status: 400 }
    );
  }

  try {
    const url = `${PRINTIFY_BASE}/shops/${encodeURIComponent(shopId)}/orders/${encodeURIComponent(orderId)}.json`;
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
    console.error('[api/printify/orders/[orderId]]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
