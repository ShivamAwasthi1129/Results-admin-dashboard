import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Shelter from '@/models/Shelter';

/** Earth radius in miles for haversine */
const EARTH_RADIUS_MI = 3959;

function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MI * c;
}

function getValue(val: unknown, defaultValue: unknown = ''): unknown {
  return val !== null && val !== undefined ? val : defaultValue;
}

function formatLastUpdated(updatedAt: string | Date): string {
  const date = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Updated just now';
  if (diffMins < 60) return `Updated ${diffMins} min ago`;
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/**
 * GET /api/resource-locator/resources
 * Public API for Resource Locator mobile screen.
 * Query: search, category, lat, lng, page, limit
 * No authentication required.
 * Currently supports category "shelter" (from Shelter model); other categories return empty (extensible).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const category = (searchParams.get('category') || 'shelter').toLowerCase();
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const userLat = latParam ? parseFloat(latParam) : null;
    const userLng = lngParam ? parseFloat(lngParam) : null;

    // Only "shelter" is backed by DB for now; others can be added later
    if (category !== 'shelter' && category !== '') {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page: 1, limit, total: 0, pages: 0 },
      });
    }

    await connectDB();

    const query: Record<string, unknown> = { status: 'active' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { addressLine1: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [shelters, total] = await Promise.all([
      Shelter.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Shelter.countDocuments(query),
    ]);

    const items = (shelters as any[]).map((s) => {
      const addressLine1 = getValue(s.addressLine1) || getValue((s as any).address) || '';
      const lat = Number(s.coordinates?.lat) || 0;
      const lng = Number(s.coordinates?.lng) || 0;
      let distanceMiles: number | null = null;
      if (userLat != null && userLng != null && (lat !== 0 || lng !== 0)) {
        distanceMiles = Math.round(haversineMiles(userLat, userLng, lat, lng) * 10) / 10;
      }

      const facilities = Array.isArray(s.facilities) ? s.facilities : [];
      const servicesOffered = facilities.length
        ? facilities
        : (s.description ? ['Emergency shelter & support'] : ['Support services']);

      return {
        id: s._id.toString(),
        category: 'shelter',
        name: getValue(s.name, ''),
        serviceDescription: getValue(s.description, '') || 'Emergency shelter & food support.',
        lastUpdated: formatLastUpdated(s.updatedAt || s.createdAt || new Date()),
        updatedAt: (s.updatedAt || s.createdAt)?.toISOString?.() || new Date().toISOString(),
        distanceMiles,
        servicesOffered,
        hasLiveChat: false,
        hasSOS: false,
        isBookmarked: false,
        coordinates: { lat, lng },
        addressLine1: addressLine1 || '',
        city: getValue(s.city, ''),
        state: getValue(s.state, ''),
        zipCode: getValue(s.zipCode, ''),
        contactPhone: getValue(s.contactPhone, ''),
        contactEmail: getValue(s.contactEmail, ''),
        operatingHours: getValue(s.operatingHours, ''),
        status: getValue(s.status, 'active'),
      };
    });

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Resource locator list error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
