// Proxy route: GET /api/results-cms/meta
// Uses the PUBLIC endpoint DOMAIN_NAME/api/home-page-content to derive metadata.
// The admin /meta endpoint fails when the DB row isn't seeded; the public endpoint
// always has data (it's the canonical source the frontend uses).

import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.DOMAIN_NAME ?? process.env.NEXT_PUBLIC_DOMAIN_NAME ?? '';

export async function GET(_req: NextRequest) {
  try {
    // Hit the PUBLIC endpoint — no auth required, always has data.
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

    // Public endpoint returns the raw JSON (no wrapper).
    const content = await upstream.json();
    const sections = Object.keys(content);

    return NextResponse.json({
      success: true,
      data: {
        exists: sections.length > 0,
        id: null,
        sections,
        version: null,         // not available from public endpoint
        updatedBy: null,
        createdAt: null,
        updatedAt: null,
      },
    });
  } catch (err) {
    console.error('[results-cms proxy meta GET]', err);
    return NextResponse.json({ success: false, message: 'Proxy error' }, { status: 502 });
  }
}
