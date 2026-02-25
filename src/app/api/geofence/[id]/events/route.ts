import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { fetchWithTimeout } from '@/lib/server-api';
import { getExternalApiBaseUrl } from '@/lib/external-api';

// GET - Get geofence events (entry/exit logs)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                  request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const trackingApiUrl = getExternalApiBaseUrl() || 'https://r3sults-backend.vercel.app';
    const userId = '132fa22d26a99a3f27f60993476394e4b3e97ddca82c76e824c4dfe91f36a2ab717cd7d4b890d9b6c61e621767e6e66960f8f688e0d55ec2325a87d736c8b537';
    let apiUrl = `${trackingApiUrl}/api/geofence/${id}/events?userId=${userId}`;
    
    if (startDate) apiUrl += `&startDate=${startDate}`;
    if (endDate) apiUrl += `&endDate=${endDate}`;

    console.log(`[geofence/${id}/events] Fetching from: ${apiUrl}`);

    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }, 15000);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[geofence/${id}/events] API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, data: [], error: `Failed to fetch events: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Get geofence events error:', error);
    return NextResponse.json(
      { success: false, data: [], error: 'Tracking service unavailable' },
      { status: 503 }
    );
  }
}
