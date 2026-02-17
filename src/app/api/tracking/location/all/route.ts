import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { fetchWithTimeout } from '@/lib/server-api';

// GET - Get all user locations from R3sults backend (DOMAIN_NAME env)
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

    const baseUrl = process.env.DOMAIN_NAME?.replace(/\/$/, '');
    if (!baseUrl) {
      console.error('[tracking/all] DOMAIN_NAME is not set');
      return NextResponse.json(
        { success: false, data: { locations: [], total: 0 }, error: 'Tracking API not configured' },
        { status: 503 }
      );
    }

    const apiUrl = `${baseUrl}/api/tracking/location/all`;
    const externalToken = process.env.R3SULTS_ACCESS_TOKEN;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (externalToken) headers['Authorization'] = `Bearer ${externalToken}`;

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
