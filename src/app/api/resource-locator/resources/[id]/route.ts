import { NextRequest, NextResponse } from 'next/server';
import { getExternalApiBaseUrl } from '@/lib/external-api';

function getValue(val: unknown, defaultValue: unknown = ''): unknown {
  return val !== null && val !== undefined ? val : defaultValue;
}

/**
 * GET /api/resource-locator/resources/[id]
 * Public API for Resource Locator - single resource detail.
 * Fetches from backend (DOMAIN_NAME) by id.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Resource ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || 'shelter').toLowerCase();

    if (category !== 'shelter') {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
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

    const res = await fetch(`${base}/api/admin/shelters?id=${encodeURIComponent(id)}`, { method: 'GET', headers });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }
    const json = await res.json();
    const shelter = json?.data;
    if (!shelter || (Array.isArray(shelter) && shelter.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }

    const s = Array.isArray(shelter) ? shelter[0] : shelter;
    const addressLine1 = getValue(s.addressLine1) || getValue(s.address) || '';
    const coordinates = s.coordinates && typeof s.coordinates === 'object'
      ? { lat: Number(s.coordinates.lat) || 0, lng: Number(s.coordinates.lng) || 0 }
      : { lat: 0, lng: 0 };
    const facilities = Array.isArray(s.facilities) ? s.facilities : [];

    const data = {
      id: s.id.toString(),
      category: 'shelter',
      name: getValue(s.name, ''),
      serviceDescription: getValue(s.description, '') || 'Emergency shelter & food support.',
      updatedAt: (s.updatedAt || s.createdAt)?.toISOString?.() || new Date().toISOString(),
      servicesOffered: facilities.length ? facilities : ['Emergency shelter & support'],
      hasLiveChat: false,
      hasSOS: false,
      isBookmarked: false,
      coordinates,
      addressLine1: addressLine1 || '',
      addressLine2: getValue(s.addressLine2, ''),
      city: getValue(s.city, ''),
      state: getValue(s.state, ''),
      zipCode: getValue(s.zipCode, ''),
      country: getValue(s.country, 'United States'),
      contactPerson: getValue(s.contactPerson, ''),
      contactPhone: getValue(s.contactPhone, ''),
      contactEmail: getValue(s.contactEmail, ''),
      website: getValue(s.website, ''),
      operatingHours: getValue(s.operatingHours, ''),
      description: getValue(s.description, ''),
      notes: getValue(s.notes, ''),
      facilities,
      capacity: getValue(s.capacity, 0),
      currentOccupancy: getValue(s.currentOccupancy, 0),
      status: getValue(s.status, 'active'),
      type: getValue(s.type, 'temporary'),
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Resource locator detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
