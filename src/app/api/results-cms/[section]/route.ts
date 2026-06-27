// Proxy route: /api/results-cms/[section]
// GET  → public endpoint DOMAIN_NAME/api/home-page-content  (data always available)
// PATCH → admin endpoint DOMAIN_NAME/api/admin/home-page-content/:section (writes)
// PUT  → admin endpoint DOMAIN_NAME/api/admin/home-page-content/:section (full replace)

import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.DOMAIN_NAME ?? process.env.NEXT_PUBLIC_DOMAIN_NAME ?? '';

function buildUpstreamUrl(section: string): string {
  return `${BACKEND}/api/admin/home-page-content/${section}`;
}

function forwardHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const auth = req.headers.get('Authorization');
  if (auth) headers['Authorization'] = auth;
  return headers;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  try {
    // Use the PUBLIC endpoint — it always has data, no auth required.
    const upstream = await fetch(`${BACKEND}/api/home-page-content`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, message: `Upstream error: ${upstream.status}` },
        { status: upstream.status }
      );
    }

    // Public endpoint returns the raw JSON object (all sections), no wrapper.
    const allSections = await upstream.json();
    const sectionData = allSections[section];

    if (!sectionData) {
      return NextResponse.json(
        { success: false, message: `Section "${section}" not found in response.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        section,
        content: sectionData,
        version: null,
        updatedAt: null,
      },
    });
  } catch (err) {
    console.error('[results-cms proxy GET]', err);
    return NextResponse.json({ success: false, message: 'Proxy error' }, { status: 502 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  try {
    const body = await req.json();
    const upstream = await fetch(buildUpstreamUrl(section), {
      method: 'PATCH',
      headers: forwardHeaders(req),
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error('[results-cms proxy PATCH]', err);
    return NextResponse.json({ success: false, message: 'Proxy error' }, { status: 502 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params;
  try {
    const body = await req.json();
    const upstream = await fetch(buildUpstreamUrl(section), {
      method: 'PUT',
      headers: forwardHeaders(req),
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error('[results-cms proxy PUT]', err);
    return NextResponse.json({ success: false, message: 'Proxy error' }, { status: 502 });
  }
}
