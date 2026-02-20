import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { fetchWithTimeout } from '@/lib/server-api';

// GET - Get all user locations
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                  request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
    }

    const trackingApiUrl = 'https://r3sults-backend.vercel.app';
    const userId = '132fa22d26a99a3f27f60993476394e4b3e97ddca82c76e824c4dfe91f36a2ab717cd7d4b890d9b6c61e621767e6e66960f8f688e0d55ec2325a87d736c8b537';
    const apiUrl = `${trackingApiUrl}/api/tracking/location/all`;

    console.log(`[tracking/all] Fetching from: ${apiUrl}`);

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
      console.error(`[tracking/all] API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, data: { users: [], total: 0, totalUsers: 0 }, error: `Failed to fetch locations: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Get all locations error:', error);
    return NextResponse.json(
      { success: false, data: { users: [], total: 0, totalUsers: 0 }, error: 'Tracking service unavailable' },
      { status: 503 }
    );
  }
}
