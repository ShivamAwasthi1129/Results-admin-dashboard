import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, canPerform, getTokenFromRequest } from '@/lib/auth';

const EXTERNAL_BASE =
  (process.env.NEXT_PUBLIC_DOMAIN_NAME || 'https://r3sults-backend.vercel.app').replace(/\/$/, '');
const EXTERNAL_USERS_URL = `${EXTERNAL_BASE}/api/admin/users`;

/**
 * GET - Proxy to external admin users API with pagination and auth.
 * Used by User Management for server-side pagination (Next/Prev page).
 */
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!canPerform(tokenPayload.role, 'viewUsers')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Access token required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    const url = `${EXTERNAL_USERS_URL}?page=${page}&limit=${limit}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      console.error('External admin users API error:', res.status, text);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users from external API' },
        { status: res.status === 401 ? 401 : 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Request timeout' },
        { status: 408 }
      );
    }
    console.error('Admin users proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
