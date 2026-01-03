import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockEntry from '@/models/StockEntry';
import { verifyAuth } from '@/lib/auth';

// GET - Fetch all stock entries
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    const warehouseId = searchParams.get('warehouseId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const tag = searchParams.get('tag');

    const query: any = {};
    if (sku) query['item.sku'] = new RegExp(sku, 'i');
    if (warehouseId) query['location.warehouseId'] = warehouseId;
    if (category) query['item.category'] = new RegExp(category, 'i');
    if (status) query.status = status;
    if (tag) query.tags = tag;

    const stockEntries = await StockEntry.find(query).sort({ lastUpdated: -1 });

    return NextResponse.json({
      success: true,
      data: stockEntries,
    });
  } catch (error: any) {
    console.error('Error fetching stock entries:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stock entries' },
      { status: 500 }
    );
  }
}

// POST - Create new stock entry
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      item,
      location,
      inventory,
      batches,
      tags,
    } = body;

    if (!item || !location || !inventory) {
      return NextResponse.json(
        { success: false, error: 'Item, location, and inventory are required' },
        { status: 400 }
      );
    }

    if (!item.name || !item.category || !item.sku) {
      return NextResponse.json(
        { success: false, error: 'Item name, category, and SKU are required' },
        { status: 400 }
      );
    }

    if (!location.warehouseId || !location.name || !location.address) {
      return NextResponse.json(
        { success: false, error: 'Warehouse ID, name, and address are required' },
        { status: 400 }
      );
    }

    if (inventory.currentQuantity === undefined || !inventory.unit || inventory.threshold === undefined) {
      return NextResponse.json(
        { success: false, error: 'Current quantity, unit, and threshold are required' },
        { status: 400 }
      );
    }

    // Check if stock entry already exists for this SKU and warehouse
    const existing = await StockEntry.findOne({
      'item.sku': item.sku,
      'location.warehouseId': location.warehouseId,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Stock entry already exists for this SKU and warehouse' },
        { status: 400 }
      );
    }

    const stockEntry = await StockEntry.create({
      item: {
        name: item.name,
        category: item.category,
        sku: item.sku,
        description: item.description,
      },
      location: {
        warehouseId: location.warehouseId,
        name: location.name,
        address: location.address,
        coordinates: {
          latitude: location.coordinates?.latitude || 0,
          longitude: location.coordinates?.longitude || 0,
        },
        manager: {
          name: location.manager?.name || '',
          contact: location.manager?.contact || '',
          email: location.manager?.email || '',
        },
      },
      inventory: {
        currentQuantity: Number(inventory.currentQuantity) || 0,
        unit: inventory.unit,
        threshold: Number(inventory.threshold) || 0,
        reservedQuantity: Number(inventory.reservedQuantity) || 0,
        availableQuantity: (Number(inventory.currentQuantity) || 0) - (Number(inventory.reservedQuantity) || 0),
      },
      batches: batches || [],
      actions: [],
      auditLog: [{
        userId: user.userId,
        change: `Stock entry created with ${inventory.currentQuantity} ${inventory.unit}`,
        timestamp: new Date(),
      }],
      tags: tags || [],
      lastUpdated: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: stockEntry,
    });
  } catch (error: any) {
    console.error('Error creating stock entry:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Stock entry already exists for this SKU and warehouse' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create stock entry' },
      { status: 500 }
    );
  }
}
