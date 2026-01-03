import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockEntry from '@/models/StockEntry';
import { verifyAuth } from '@/lib/auth';

// POST - Restock (add quantity and create batch)
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
    const { quantity, batchNumber, expiryDate, condition, notes } = body;

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

    // Ensure both values are numbers before adding
    const oldQuantity = Number(stockEntry.inventory.currentQuantity) || 0;
    const newQuantity = oldQuantity + quantityNum;
    stockEntry.inventory.currentQuantity = newQuantity;

    // Add batch if provided
    if (batchNumber) {
      stockEntry.batches.push({
        batchNumber,
        quantity: quantityNum, // Ensure it's a number
        expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
        receivedDate: new Date(),
        condition: condition || 'New',
      });
    }

    // Add action
    stockEntry.actions.push({
      type: 'Restock',
      triggeredBy: user.userId,
      timestamp: new Date(),
      status: 'Completed',
      notes: notes || `Restocked ${quantityNum} ${stockEntry.inventory.unit}`,
    });

    // Add audit log
    stockEntry.auditLog.push({
      userId: user.userId,
      change: `Restocked ${quantityNum} ${stockEntry.inventory.unit}. Quantity changed from ${oldQuantity} to ${newQuantity}`,
      timestamp: new Date(),
    });

    await stockEntry.save();

    return NextResponse.json({
      success: true,
      data: stockEntry,
    });
  } catch (error: any) {
    console.error('Error restocking:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to restock' },
      { status: 500 }
    );
  }
}

