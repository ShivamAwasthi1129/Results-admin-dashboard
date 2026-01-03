import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockEntry from '@/models/StockEntry';
import { verifyAuth } from '@/lib/auth';

// POST - Dispatch stock (reduce quantity and add to audit log)
export async function POST(
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
    const { quantity, destination, notes } = body;

    // Ensure quantity is a number
    const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : Number(quantity);
    
    if (!quantityNum || isNaN(quantityNum) || quantityNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid quantity is required' },
        { status: 400 }
      );
    }

    const stockEntry = await StockEntry.findById(id);
    if (!stockEntry) {
      return NextResponse.json({ success: false, error: 'Stock entry not found' }, { status: 404 });
    }

    // Ensure both values are numbers before comparison and subtraction
    const currentQuantity = Number(stockEntry.inventory.currentQuantity) || 0;
    const reservedQuantity = Number(stockEntry.inventory.reservedQuantity) || 0;
    const availableQuantity = Math.max(0, currentQuantity - reservedQuantity);

    if (availableQuantity < quantityNum) {
      return NextResponse.json(
        { success: false, error: 'Insufficient available quantity' },
        { status: 400 }
      );
    }

    const oldQuantity = currentQuantity;
    const newQuantity = oldQuantity - quantityNum;
    stockEntry.inventory.currentQuantity = newQuantity;
    
    // Add action
    stockEntry.actions.push({
      type: 'Dispatch',
      triggeredBy: user.userId,
      timestamp: new Date(),
      status: 'Completed',
      notes: notes || `Dispatched ${quantityNum} ${stockEntry.inventory.unit}${destination ? ` to ${destination}` : ''}`,
    });

    // Add audit log
    stockEntry.auditLog.push({
      userId: user.userId,
      change: `Dispatched ${quantityNum} ${stockEntry.inventory.unit}${destination ? ` to ${destination}` : ''}. Quantity changed from ${oldQuantity} to ${newQuantity}`,
      timestamp: new Date(),
    });

    await stockEntry.save();

    return NextResponse.json({
      success: true,
      data: stockEntry,
    });
  } catch (error: any) {
    console.error('Error dispatching stock:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch stock' },
      { status: 500 }
    );
  }
}

