import { NextRequest, NextResponse } from 'next/server';
import { getExternalApiBaseUrl } from '@/lib/external-api';

/**
 * Proxy /api/auth/* to backend /api/admin-auth/*
 * Ensures login, logout, me etc. work even when rewrites don't apply (e.g. in some dev setups).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(request, await context.params);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(request, await context.params);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(request, await context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(request, await context.params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToBackend(request, await context.params);
}

async function proxyToBackend(
  request: NextRequest,
  { path }: { path: string[] }
) {
  const base = getExternalApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { success: false, error: 'Auth API not configured (DOMAIN_NAME).' },
      { status: 503 }
    );
  }

  const pathSegment = Array.isArray(path) && path.length > 0 ? path.join('/') : '';
  const backendPath = pathSegment ? `/api/admin-auth/${pathSegment}` : '/api/admin-auth';
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
}
