import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getTokenFromRequest } from '@/lib/auth';
import { fetchWithTimeout } from '@/lib/server-api';
import { getExternalTrackingUrl } from '@/lib/external-api';

// GET - Get all user locations from R3sults backend (DOMAIN_NAME env)
// Forwards the client's auth token to the external API (same token as in localStorage).
// Response shape: { success, data: { locations: [...], total } }
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
    }

    const apiUrl = getExternalTrackingUrl('/api/tracking/location/all');
    if (!apiUrl) {
      console.error('[tracking/all] DOMAIN_NAME is not set in env. Set DOMAIN_NAME=https://r3sults-backend.vercel.app');
      return NextResponse.json(
        { success: false, data: { locations: [], total: 0 }, error: 'Tracking API not configured. Set DOMAIN_NAME in env.' },
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
      15000
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[tracking/all] API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, data: { locations: [], total: 0 }, error: `Failed to fetch locations: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('Get all locations error:', error);
    return NextResponse.json(
      { success: false, data: { locations: [], total: 0 }, error: 'Tracking service unavailable' },
      { status: 503 }
    );
  }
}
