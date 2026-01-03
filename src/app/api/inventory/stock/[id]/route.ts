import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockEntry from '@/models/StockEntry';
import { verifyAuth } from '@/lib/auth';

// GET - Fetch single stock entry
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
    const stockEntry = await StockEntry.findById(id);
    
    if (!stockEntry) {
      return NextResponse.json({ success: false, error: 'Stock entry not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: stockEntry,
    });
  } catch (error: any) {
    console.error('Error fetching stock entry:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stock entry' },
      { status: 500 }
    );
  }
}

// PUT - Update stock entry
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
    
    const stockEntry = await StockEntry.findById(id);
    if (!stockEntry) {
      return NextResponse.json({ success: false, error: 'Stock entry not found' }, { status: 404 });
    }

    const oldQuantity = stockEntry.inventory.currentQuantity;
    const oldReserved = stockEntry.inventory.reservedQuantity;

    // Update fields
    if (body.item) {
      if (body.item.name) stockEntry.item.name = body.item.name;
      if (body.item.category) stockEntry.item.category = body.item.category;
      if (body.item.sku) stockEntry.item.sku = body.item.sku;
      if (body.item.description !== undefined) stockEntry.item.description = body.item.description;
    }

    if (body.location) {
      if (body.location.warehouseId) stockEntry.location.warehouseId = body.location.warehouseId;
      if (body.location.name) stockEntry.location.name = body.location.name;
      if (body.location.address) stockEntry.location.address = body.location.address;
      if (body.location.coordinates) {
        if (body.location.coordinates.latitude !== undefined) {
          stockEntry.location.coordinates.latitude = body.location.coordinates.latitude;
        }
        if (body.location.coordinates.longitude !== undefined) {
          stockEntry.location.coordinates.longitude = body.location.coordinates.longitude;
        }
      }
      if (body.location.manager) {
        if (body.location.manager.name) stockEntry.location.manager.name = body.location.manager.name;
        if (body.location.manager.contact) stockEntry.location.manager.contact = body.location.manager.contact;
        if (body.location.manager.email) stockEntry.location.manager.email = body.location.manager.email;
      }
    }

    if (body.inventory) {
      if (body.inventory.currentQuantity !== undefined) {
        stockEntry.inventory.currentQuantity = Number(body.inventory.currentQuantity) || 0;
      }
      if (body.inventory.unit) stockEntry.inventory.unit = body.inventory.unit;
      if (body.inventory.threshold !== undefined) stockEntry.inventory.threshold = Number(body.inventory.threshold) || 0;
      if (body.inventory.reservedQuantity !== undefined) {
        stockEntry.inventory.reservedQuantity = Number(body.inventory.reservedQuantity) || 0;
      }
    }

    // Always update batches if provided (even if empty array to allow clearing)
    if (body.batches !== undefined) {
      stockEntry.batches = Array.isArray(body.batches) ? body.batches : [];
    }

    if (body.tags) {
      stockEntry.tags = body.tags;
    }

    // Add audit log entry
    const changes: string[] = [];
    const newQuantity = body.inventory?.currentQuantity !== undefined ? Number(body.inventory.currentQuantity) || 0 : oldQuantity;
    const newReserved = body.inventory?.reservedQuantity !== undefined ? Number(body.inventory.reservedQuantity) || 0 : oldReserved;
    
    if (body.inventory?.currentQuantity !== undefined && newQuantity !== Number(oldQuantity)) {
      const diff = newQuantity - Number(oldQuantity);
      changes.push(`Quantity ${diff >= 0 ? 'increased' : 'decreased'} by ${Math.abs(diff)} ${stockEntry.inventory.unit}`);
    }
    if (body.inventory?.reservedQuantity !== undefined && newReserved !== Number(oldReserved)) {
      const diff = newReserved - Number(oldReserved);
      changes.push(`Reserved quantity ${diff >= 0 ? 'increased' : 'decreased'} by ${Math.abs(diff)}`);
    }

    if (changes.length > 0) {
      stockEntry.auditLog.push({
        userId: user.userId,
        change: changes.join(', '),
        timestamp: new Date(),
      });
    }

    await stockEntry.save();

    return NextResponse.json({
      success: true,
      data: stockEntry,
    });
  } catch (error: any) {
    console.error('Error updating stock entry:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update stock entry' },
      { status: 500 }
    );
  }
}

// DELETE - Delete stock entry
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
    const stockEntry = await StockEntry.findByIdAndDelete(id);
    
    if (!stockEntry) {
      return NextResponse.json({ success: false, error: 'Stock entry not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Stock entry deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting stock entry:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete stock entry' },
      { status: 500 }
    );
  }
}
