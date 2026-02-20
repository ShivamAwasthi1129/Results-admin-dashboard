import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, canPerform, getTokenFromRequest } from '@/lib/auth';
import { fetchWithTimeout } from '@/lib/server-api';
import { getExternalAdminUsersUrl } from '@/lib/external-api';

const EXTERNAL_API_TIMEOUT = 15000;

/**
 * GET /api/external/admin/users
 * Proxies to the R3sults backend admin users API.
 * Forwards the client's auth token (same as in localStorage) to the external API.
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

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const apiUrl = getExternalAdminUsersUrl(queryString || undefined);
    if (!apiUrl) {
      console.error('[external/admin/users] DOMAIN_NAME is not set in env. Set DOMAIN_NAME=https://r3sults-backend.vercel.app');
      return NextResponse.json(
        { success: false, error: 'External API not configured. Set DOMAIN_NAME in env.' },
        { status: 503 }
      );
    }
    // Use the same token the client sent (from Authorization header or cookie) - R3sults backend accepts it
    const clientToken = getTokenFromRequest(request) || process.env.R3SULTS_ACCESS_TOKEN;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientToken) headers['Authorization'] = `Bearer ${clientToken}`;

    const response = await fetchWithTimeout(
      apiUrl,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      },
      EXTERNAL_API_TIMEOUT
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[external/admin/users] External API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        {
          success: false,
          data: { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } },
          error: `Failed to fetch users: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error('[external/admin/users] Error:', error);
    return NextResponse.json(
      {
        success: false,
        data: { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } },
        error: 'Failed to fetch users',
      },
      { status: 500 }
    );
  }
}
