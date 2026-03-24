import { NextResponse } from 'next/server';

const PRINTIFY_BASE = 'https://api.printify.com/v1';

function getPrintifyToken(): string | null {
  return process.env.PRINTIFY_API_TOKEN ?? process.env.PRINTIFY_API_KEY ?? null;
}

/** GET /api/printify/shops – list shops (server-side only, no CORS) */
export async function GET() {
  const token = getPrintifyToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Printify token not configured. Set PRINTIFY_API_TOKEN or PRINTIFY_API_KEY.' },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${PRINTIFY_BASE}/shops.json`, {
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
        { success: false, error: data?.message || data?.error || `Printify API ${res.status}` },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const shops = Array.isArray(data) ? data : data?.data ?? [];
    return NextResponse.json({ success: true, data: { shops } });
  } catch (err) {
    console.error('[api/printify/shops]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Printify shops' },
      { status: 500 }
    );
  }
}
