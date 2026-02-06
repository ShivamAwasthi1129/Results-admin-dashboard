import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const search = (searchParams.get('search') || '').trim();
    const paymentStatus = searchParams.get('payment_status') || '';

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { id: { $regex: search, $options: 'i' } },
        { customer_email: { $regex: search, $options: 'i' } },
        { 'shipping_address.firstName': { $regex: search, $options: 'i' } },
        { 'shipping_address.lastName': { $regex: search, $options: 'i' } },
        { 'shipping_address.city': { $regex: search, $options: 'i' } },
        { 'shipping_address.country': { $regex: search, $options: 'i' } },
      ];
    }

    if (paymentStatus) {
      query.payment_status = paymentStatus;
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Orders list error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
