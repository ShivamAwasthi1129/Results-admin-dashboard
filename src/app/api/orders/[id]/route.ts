import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const isObjectId = /^[a-f\d]{24}$/i.test(id);
    const order = await Order.findOne(
      isObjectId ? { _id: new mongoose.Types.ObjectId(id) } : { id }
    )
      .lean()
      .exec();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const lineItems = (order as any).line_items || [];
    const enrichedLineItems = await Promise.all(
      lineItems.map(async (item: { productId: string; [key: string]: unknown }) => {
        let product = null;
        if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
          try {
            product = await Product.findById(item.productId)
              .select('name description category sellingPrice images status sku')
              .lean();
          } catch {
            // product may not exist
          }
        }
        return {
          ...item,
          product,
        };
      })
    );

    const orderObj = order as unknown as Record<string, unknown>;
    const result = {
      ...orderObj,
      line_items: enrichedLineItems,
    };

    return NextResponse.json({
      success: true,
      data: { order: result },
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
