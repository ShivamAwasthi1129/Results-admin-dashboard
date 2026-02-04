import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

// CORS: allow any origin for public GET
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  addCorsHeaders(response);
  return response;
}

// GET - Get single product (public, no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const product = await Product.findById(id).lean();

    if (!product) {
      const notFound = NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
      addCorsHeaders(notFound);
      return notFound;
    }

    const json = NextResponse.json({
      success: true,
      data: { product },
    });
    addCorsHeaders(json);
    return json;
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    const { id } = await params;

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Allow admin and super_admin to edit products
    if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    // Check if SKU is being changed and if it already exists
    if (body.sku) {
      const existingProduct = await Product.findOne({
        sku: body.sku.toUpperCase(),
        _id: { $ne: id },
      });
      if (existingProduct) {
        return NextResponse.json(
          { success: false, error: 'Product with this SKU already exists' },
          { status: 400 }
        );
      }
      body.sku = body.sku.toUpperCase();
    }

    // If variants are provided, calculate total stock from variants
    if (body.variants && Array.isArray(body.variants) && body.variants.length > 0) {
      const totalQuantity = body.variants.reduce((sum: number, variant: any) => {
        const qty = variant.stock?.quantity || variant.stockQuantity || 0;
        return sum + (Number(qty) || 0);
      }, 0);
      const totalReserved = body.variants.reduce((sum: number, variant: any) => {
        const reserved = variant.stock?.reservedQuantity || variant.reservedQuantity || 0;
        return sum + (Number(reserved) || 0);
      }, 0);
      body.stock = {
        ...body.stock,
        quantity: totalQuantity,
        reservedQuantity: totalReserved,
        availableQuantity: Math.max(0, totalQuantity - totalReserved),
      };
    } else if (body.stock) {
      // Update stock calculations if stock is being updated (and no variants)
      const quantity = Number(body.stock.quantity) || 0;
      const reservedQuantity = Number(body.stock.reservedQuantity) || 0;
      body.stock.availableQuantity = Math.max(0, quantity - reservedQuantity);
    }

    body.lastModifiedBy = tokenPayload.userId;

    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { product },
      message: 'Product updated successfully',
    });
  } catch (error: any) {
    console.error('Update product error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    const { id } = await params;

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Allow admin and super_admin to delete products
    if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
