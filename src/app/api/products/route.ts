import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

// CORS: allow any origin for public GET (use from another website)
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

// GET - List all products with pagination, search, and filters (public, no auth required)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const brand = searchParams.get('brand') || '';
    const lowStock = searchParams.get('lowStock') === 'true';
    const featured = searchParams.get('featured') === 'true';

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }

    if (lowStock) {
      query.$expr = {
        $lt: ['$stock.quantity', '$stock.lowStockThreshold'],
      };
    }

    if (featured) {
      query.isFeatured = true;
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Fetch products from database
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);

    // Transform products for response
    const transformedProducts = products.map((product: any) => ({
      _id: product._id.toString(),
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      subcategory: product.subcategory,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      discount: product.discount || 0,
      taxRate: product.taxRate || 0,
      stock: product.stock,
      brand: product.brand,
      model: product.model,
      size: product.size || [],
      color: product.color || [],
      material: product.material,
      weight: product.weight,
      dimensions: product.dimensions,
      safetyFeatures: product.safetyFeatures || [],
      safetyStandards: product.safetyStandards || [],
      certifications: product.certifications || [],
      images: product.images || [],
      videoUrl: product.videoUrl,
      model3dUrl: product.model3dUrl,
      model3dFormat: product.model3dFormat,
      keyFeatures: product.keyFeatures || [],
      variants: product.variants || [],
      categoryAttributes: product.categoryAttributes || {},
      specifications: product.specifications || [],
      vendor: product.vendor,
      status: product.status,
      isFeatured: product.isFeatured || false,
      tags: product.tags || [],
      warrantyPeriod: product.warrantyPeriod,
      returnPolicy: product.returnPolicy,
      shippingInfo: product.shippingInfo,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

    const json = NextResponse.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
    addCorsHeaders(json);
    return json;
  } catch (error: any) {
    console.error('Get products error:', error);
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

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
    }

    // Allow admin and super_admin to create products
    if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.sku || !body.category) {
      return NextResponse.json(
        { success: false, error: 'Name, SKU, and category are required' },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: body.sku.toUpperCase() });
    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product with this SKU already exists' },
        { status: 400 }
      );
    }

    // Create new product
    const productData = {
      ...body,
      sku: body.sku.toUpperCase(),
      createdBy: tokenPayload.userId,
      lastModifiedBy: tokenPayload.userId,
      stock: {
        quantity: body.stock?.quantity || 0,
        lowStockThreshold: body.stock?.lowStockThreshold || 10,
        reservedQuantity: body.stock?.reservedQuantity || 0,
        availableQuantity: (body.stock?.quantity || 0) - (body.stock?.reservedQuantity || 0),
        reorderPoint: body.stock?.reorderPoint || 0,
        maxStock: body.stock?.maxStock,
      },
    };

    const product = new Product(productData);
    await product.save();

    return NextResponse.json({
      success: true,
      data: { product },
      message: 'Product created successfully',
    });
  } catch (error: any) {
    console.error('Create product error:', error);
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
