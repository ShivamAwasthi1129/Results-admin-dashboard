// Proxy route: POST /api/results-cms/upload
// Forwards multipart/form-data to DOMAIN_NAME/api/admin/home-page-content/upload
// Returns CDN URL for the uploaded media file.

import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.DOMAIN_NAME ?? process.env.NEXT_PUBLIC_DOMAIN_NAME ?? '';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization');

    // Read the incoming FormData from the client
    const formData = await req.formData();

    // Build headers — do NOT set Content-Type; fetch sets it with the correct boundary
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (auth) headers['Authorization'] = auth;

    const upstream = await fetch(`${BACKEND}/api/admin/home-page-content/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error('[results-cms proxy upload POST]', err);
    return NextResponse.json({ success: false, message: 'Proxy error' }, { status: 502 });
  }
}
