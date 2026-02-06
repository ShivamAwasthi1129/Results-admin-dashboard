import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, canPerform } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Adjuster from '@/models/Adjuster';

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse, request?: NextRequest) {
  let allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  if (request) {
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin) {
      const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (configuredUrl && requestOrigin.includes(new URL(configuredUrl).hostname)) {
        allowedOrigin = requestOrigin;
      } else if (!configuredUrl && requestOrigin.includes('localhost')) {
        allowedOrigin = requestOrigin;
      }
    }
  }
  
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response, request);
}

// GET - List all adjusters with pagination, search, and filters
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      const response = NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
      return addCorsHeaders(response, request);
    }

    // Check permission
    if (!canPerform(tokenPayload.role, 'viewIncidents')) {
      const response = NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
      return addCorsHeaders(response, request);
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const isAvailable = searchParams.get('isAvailable');
    const companyName = searchParams.get('companyName') || '';

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { adjusterId: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (isAvailable !== null && isAvailable !== undefined && isAvailable !== '') {
      query.isAvailable = isAvailable === 'true';
    }

    if (companyName) {
      query.companyName = { $regex: companyName, $options: 'i' };
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Fetch adjusters from database
    const adjusters = await Adjuster.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Adjuster.countDocuments(query);

    // Transform adjusters for response
    const transformedAdjusters = adjusters.map((adjuster: any) => ({
      _id: adjuster._id.toString(),
      id: adjuster._id.toString(),
      adjusterId: adjuster.adjusterId,
      photo: adjuster.photo,
      firstName: adjuster.firstName,
      lastName: adjuster.lastName,
      fullName: `${adjuster.firstName} ${adjuster.lastName}`,
      email: adjuster.email,
      phone: adjuster.phone,
      companyName: adjuster.companyName,
      address: adjuster.address,
      certifications: adjuster.certifications || [],
      documents: adjuster.documents || [],
      states: adjuster.states || [],
      specializations: adjuster.specializations || [],
      licenseNumber: adjuster.licenseNumber,
      yearsOfExperience: adjuster.yearsOfExperience,
      status: adjuster.status,
      assignedReports: adjuster.assignedReports || [],
      totalReportsHandled: adjuster.totalReportsHandled || 0,
      currentActiveReports: adjuster.currentActiveReports || 0,
      isAvailable: adjuster.isAvailable,
      availabilityNotes: adjuster.availabilityNotes,
      averageRating: adjuster.averageRating,
      totalRatings: adjuster.totalRatings || 0,
      notes: adjuster.notes,
      createdAt: adjuster.createdAt,
      updatedAt: adjuster.updatedAt,
    }));

    const response = NextResponse.json({
      success: true,
      data: {
        adjusters: transformedAdjusters,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Get adjusters error:', error);
    const response = NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
    return addCorsHeaders(response, request);
  }
}

// POST - Create new adjuster
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      const response = NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
      return addCorsHeaders(response, request);
    }

    // Allow admin and super_admin to create adjusters
    if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
      const response = NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
      return addCorsHeaders(response, request);
    }

    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.email) {
      const response = NextResponse.json(
        { success: false, error: 'First name, last name, and email are required' },
        { status: 400 }
      );
      return addCorsHeaders(response, request);
    }

    // Check if email already exists
    const existingAdjuster = await Adjuster.findOne({ email: body.email.toLowerCase() });
    if (existingAdjuster) {
      const response = NextResponse.json(
        { success: false, error: 'An adjuster with this email already exists' },
        { status: 400 }
      );
      return addCorsHeaders(response, request);
    }

    // Check if adjusterId already exists (if provided)
    if (body.adjusterId) {
      const existingById = await Adjuster.findOne({ adjusterId: body.adjusterId.toUpperCase() });
      if (existingById) {
        const response = NextResponse.json(
          { success: false, error: 'An adjuster with this ID already exists' },
          { status: 400 }
        );
        return addCorsHeaders(response, request);
      }
    }

    // Create new adjuster
    const adjusterData = {
      ...body,
      adjusterId: body.adjusterId?.toUpperCase(),
      email: body.email.toLowerCase(),
      certifications: body.certifications || [],
      documents: body.documents || [],
      states: body.states || [],
      specializations: body.specializations || [],
      assignedReports: [],
      totalReportsHandled: 0,
      currentActiveReports: 0,
      isAvailable: body.isAvailable !== false,
      status: body.status || 'active',
      createdBy: tokenPayload.userId,
      lastModifiedBy: tokenPayload.userId,
    };

    const adjuster = new Adjuster(adjusterData);
    await adjuster.save();

    const response = NextResponse.json({
      success: true,
      data: {
        adjuster: {
          ...adjuster.toObject(),
          _id: adjuster._id.toString(),
          id: adjuster._id.toString(),
          fullName: `${adjuster.firstName} ${adjuster.lastName}`,
        },
      },
      message: 'Adjuster created successfully',
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Create adjuster error:', error);
    const response = NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
    return addCorsHeaders(response, request);
  }
}
