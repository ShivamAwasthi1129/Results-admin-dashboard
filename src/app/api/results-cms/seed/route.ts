// Proxy route: POST /api/results-cms/seed
// Forwards to DOMAIN_NAME/api/admin/home-page-content/seed
// ⚠️ This resets all content to defaults — use with caution.

import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.DOMAIN_NAME ?? process.env.NEXT_PUBLIC_DOMAIN_NAME ?? '';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization');
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (auth) headers['Authorization'] = auth;

    const upstream = await fetch(`${BACKEND}/api/admin/home-page-content/seed`, {
      method: 'POST',
      headers,
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error('[results-cms proxy seed POST]', err);
    return NextResponse.json({ success: false, message: 'Proxy error' }, { status: 502 });
  }
}
