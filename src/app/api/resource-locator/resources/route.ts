import { NextRequest, NextResponse } from 'next/server';
import { getExternalApiBaseUrl } from '@/lib/external-api';

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

function matchesSearch(s: Record<string, unknown>, search: string): boolean {
  if (!search) return true;
  const lower = search.toLowerCase();
  const fields = [s.name, s.description, s.city, s.state, s.addressLine1].filter(Boolean);
  return fields.some((f) => String(f).toLowerCase().includes(lower));
}

/**
 * GET /api/resource-locator/resources
 * Public API for Resource Locator mobile screen.
 * Fetches shelters from backend (DOMAIN_NAME) and returns in resource-locator format.
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

    if (category !== 'shelter' && category !== '') {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page: 1, limit, total: 0, pages: 0 },
      });
    }

    const base = getExternalApiBaseUrl();
    if (!base) {
      return NextResponse.json(
        { success: false, error: 'Resource locator not configured (DOMAIN_NAME).' },
        { status: 503 }
      );
    }

    const token = process.env.R3SULTS_ACCESS_TOKEN;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${base}/api/admin/shelters`, { method: 'GET', headers });
    if (!res.ok) {
      console.error('[resource-locator] Backend shelters API error:', res.status);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch shelters.' },
        { status: 502 }
      );
    }
    const json = await res.json();
    const rawList = Array.isArray(json?.data) ? json.data : [];
    const shelters = rawList
      .filter((s: Record<string, unknown>) => (s.status === 'active' || !s.status) && matchesSearch(s, search))
      .sort((a: { updatedAt?: string; createdAt?: string }, b: { updatedAt?: string; createdAt?: string }) => {
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tB - tA;
      });

    const total = shelters.length;
    const skip = (page - 1) * limit;
    const pageShelters = shelters.slice(skip, skip + limit);

    const items = pageShelters.map((s: Record<string, unknown>) => {
      const coords = s.coordinates as { lat?: number; lng?: number } | null | undefined;
      const addressLine1 = getValue(s.addressLine1) || getValue(s.address) || '';
      const lat = coords && typeof coords.lat === 'number' ? coords.lat : Number(coords?.lat) || 0;
      const lng = coords && typeof coords.lng === 'number' ? coords.lng : Number(coords?.lng) || 0;
      let distanceMiles: number | null = null;
      if (userLat != null && userLng != null && (lat !== 0 || lng !== 0)) {
        distanceMiles = Math.round(haversineMiles(userLat, userLng, lat, lng) * 10) / 10;
      }

      const facilities = Array.isArray(s.facilities) ? s.facilities : [];
      const servicesOffered = facilities.length
        ? facilities
        : (s.description ? ['Emergency shelter & support'] : ['Support services']);

      return {
        id: String(s.id ?? ''),
        category: 'shelter',
        name: getValue(s.name, ''),
        serviceDescription: getValue(s.description, '') || 'Emergency shelter & food support.',
        lastUpdated: formatLastUpdated((() => { const d = s.updatedAt ?? s.createdAt; return d ? new Date(d as string | number | Date) : new Date(); })()),
        updatedAt: (() => { const d = s.updatedAt ?? s.createdAt; return d ? new Date(d as string | number | Date).toISOString() : new Date().toISOString(); })(),
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
