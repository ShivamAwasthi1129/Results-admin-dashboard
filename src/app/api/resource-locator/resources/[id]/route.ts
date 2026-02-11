import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Shelter from '@/models/Shelter';
import mongoose from 'mongoose';

function getValue(val: unknown, defaultValue: unknown = ''): unknown {
  return val !== null && val !== undefined ? val : defaultValue;
}

/**
 * GET /api/resource-locator/resources/[id]
 * Public API for Resource Locator - single resource detail.
 * Query: category (optional, default shelter)
 * No authentication required.
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

    await connectDB();

    let shelterId: mongoose.Types.ObjectId;
    try {
      shelterId = new mongoose.Types.ObjectId(id);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid resource ID' },
        { status: 400 }
      );
    }

    const shelter = await Shelter.findById(shelterId).lean();
    if (!shelter) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }

    const s = shelter as any;
    const addressLine1 = getValue(s.addressLine1) || getValue(s.address) || '';
    const coordinates = s.coordinates && typeof s.coordinates === 'object'
      ? { lat: Number(s.coordinates.lat) || 0, lng: Number(s.coordinates.lng) || 0 }
      : { lat: 0, lng: 0 };
    const facilities = Array.isArray(s.facilities) ? s.facilities : [];

    const data = {
      id: s._id.toString(),
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
