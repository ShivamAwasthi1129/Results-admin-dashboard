import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getTokenFromRequest } from '@/lib/auth';
import { fetchWithTimeout } from '@/lib/server-api';
import { getExternalTrackingUrl } from '@/lib/external-api';

/**
 * GET /api/tracking/location/history/[userId]
 * Proxies to R3sults backend: GET /api/tracking/location/history/{userId}
 * Forwards the client's auth token. Query: page, limit (optional).
 * Response: { success, data: { history: [...], pagination: { page, limit, total, pages } } }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
    }

    const { userId } = await params;
    if (!userId) {
      return NextResponse.json(
        { success: false, data: { history: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }, error: 'userId required' },
        { status: 400 }
      );
    }

    const apiUrl = getExternalTrackingUrl(`/api/tracking/location/history/${userId}`);
    if (!apiUrl) {
      console.error('[tracking/history] DOMAIN_NAME is not set in env.');
      return NextResponse.json(
        { success: false, data: { history: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }, error: 'Tracking API not configured.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '100';
    const urlWithQuery = `${apiUrl}?page=${page}&limit=${limit}`;

    const clientToken = getTokenFromRequest(request) || process.env.R3SULTS_ACCESS_TOKEN;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientToken) headers['Authorization'] = `Bearer ${clientToken}`;

    const response = await fetchWithTimeout(
      urlWithQuery,
      { method: 'GET', headers, cache: 'no-store' },
      15000
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[tracking/history/${userId}] API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, data: { history: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }, error: `Failed to fetch history: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error('Get user location history error:', error);
    return NextResponse.json(
      { success: false, data: { history: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }, error: 'Tracking service unavailable' },
      { status: 503 }
    );
  }
}
