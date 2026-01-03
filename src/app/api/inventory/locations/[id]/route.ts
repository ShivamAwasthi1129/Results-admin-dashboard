import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockLocation from '@/models/StockLocation';
import { verifyAuth } from '@/lib/auth';

// GET - Fetch single location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const location = await StockLocation.findById(id);
    if (!location) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    console.error('Error fetching stock location:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

// PUT - Update location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const updateData: any = {};

    if (body.name) updateData.name = body.name;
    if (body.address) updateData.address = body.address;
    if (body.coordinates) updateData.coordinates = body.coordinates;
    if (body.contactPerson !== undefined) updateData.contactPerson = body.contactPerson;
    if (body.capacity !== undefined) updateData.capacity = body.capacity;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const location = await StockLocation.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!location) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    console.error('Error updating stock location:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update location' },
      { status: 500 }
    );
  }
}

// DELETE - Delete location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const location = await StockLocation.findByIdAndDelete(id);
    if (!location) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting stock location:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete location' },
      { status: 500 }
    );
  }
}

