import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import InventoryItem from '@/models/InventoryItem';
import { verifyAuth } from '@/lib/auth';

// GET - Fetch all items or search
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const query: any = {};
    if (search) {
      query.$text = { $search: search };
    }
    if (category) {
      query.category = category;
    }
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const items = await InventoryItem.find(query).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// POST - Create new item
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description, category, unit, sku, barcode, image, isActive } = body;

    if (!name || !category || !unit) {
      return NextResponse.json(
        { success: false, error: 'Name, category, and unit are required' },
        { status: 400 }
      );
    }

    const item = await InventoryItem.create({
      name,
      description,
      category,
      unit,
      sku,
      barcode,
      image,
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'SKU or barcode already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create item' },
      { status: 500 }
    );
  }
}

