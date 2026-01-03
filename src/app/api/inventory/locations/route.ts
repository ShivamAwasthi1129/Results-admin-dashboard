import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockLocation from '@/models/StockLocation';
import { verifyAuth } from '@/lib/auth';

// GET - Fetch all locations
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const isActive = searchParams.get('isActive');

    const query: any = {};
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    if (state) {
      query['address.state'] = new RegExp(state, 'i');
    }
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const locations = await StockLocation.find(query).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: locations,
    });
  } catch (error: any) {
    console.error('Error fetching stock locations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

// POST - Create new location
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, address, coordinates, contactPerson, capacity, isActive } = body;

    if (!name || !address || !coordinates) {
      return NextResponse.json(
        { success: false, error: 'Name, address, and coordinates are required' },
        { status: 400 }
      );
    }

    if (!address.street || !address.city || !address.state || !address.zipCode) {
      return NextResponse.json(
        { success: false, error: 'Complete address is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(coordinates.coordinates) || coordinates.coordinates.length !== 2) {
      return NextResponse.json(
        { success: false, error: 'Valid coordinates [longitude, latitude] are required' },
        { status: 400 }
      );
    }

    const location = await StockLocation.create({
      name,
      address: {
        street: address.street,
        suite: address.suite,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country || 'United States',
      },
      coordinates: {
        type: 'Point',
        coordinates: coordinates.coordinates,
      },
      contactPerson,
      capacity,
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    console.error('Error creating stock location:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create location' },
      { status: 500 }
    );
  }
}

