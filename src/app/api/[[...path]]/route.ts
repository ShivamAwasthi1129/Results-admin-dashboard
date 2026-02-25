import { NextRequest, NextResponse } from 'next/server';
import { getExternalApiBaseUrl } from '@/lib/external-api';
import { getBackendPathForSegments } from '@/lib/api-proxy';

/**
 * Catch-all proxy for all backend APIs that don't have a dedicated route handler.
 * Proxies /api/volunteers/*, /api/ops-users/*, /api/shelters/*, etc. to the backend.
 * Ensures every API works in dev and production (same as /api/auth proxy).
 */
async function proxyToBackend(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const backendPath = getBackendPathForSegments(pathSegments);
  if (!backendPath) {
    return NextResponse.json(
      { success: false, error: 'Not Found' },
      { status: 404 }
    );
  }

  const base = getExternalApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { success: false, error: 'API not configured (DOMAIN_NAME).' },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const backendUrl = `${base}${backendPath}${query ? `?${query}` : ''}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'host') return;
    headers.set(key, value);
  });

  let body: BodyInit | undefined;
  try {
    body = await request.text();
  } catch {
    // no body
  }

  try {
    const res = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: body || undefined,
    });

    const data = await res.text();
    const contentType = res.headers.get('content-type') || 'application/json';

    return new NextResponse(data, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (err) {
    console.error('[api-proxy] Fetch error:', err);
    return NextResponse.json(
      { success: false, error: 'Backend request failed.' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const segments = path ?? [];
  return proxyToBackend(request, segments);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const segments = path ?? [];
  return proxyToBackend(request, segments);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const segments = path ?? [];
  return proxyToBackend(request, segments);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const segments = path ?? [];
  return proxyToBackend(request, segments);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const segments = path ?? [];
  return proxyToBackend(request, segments);
}
