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

// GET - Get single adjuster
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    const { id } = await params;

    if (!tokenPayload) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
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

    // Try to find by _id or adjusterId
    let adjuster = await Adjuster.findById(id).lean();
    if (!adjuster) {
      adjuster = await Adjuster.findOne({ adjusterId: id.toUpperCase() }).lean();
    }

    if (!adjuster) {
      const response = NextResponse.json(
        { success: false, error: 'Adjuster not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, request);
    }

    const response = NextResponse.json({
      success: true,
      data: {
        adjuster: {
          ...adjuster,
          _id: adjuster._id.toString(),
          id: adjuster._id.toString(),
          fullName: `${adjuster.firstName} ${adjuster.lastName}`,
        },
      },
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Get adjuster error:', error);
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

// PUT - Update adjuster
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    const { id } = await params;

    if (!tokenPayload) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      return addCorsHeaders(response, request);
    }

    // Check permission
    if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
      const response = NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
      return addCorsHeaders(response, request);
    }

    await connectDB();

    // Find existing adjuster
    let existingAdjuster = await Adjuster.findById(id);
    if (!existingAdjuster) {
      existingAdjuster = await Adjuster.findOne({ adjusterId: id.toUpperCase() });
    }

    if (!existingAdjuster) {
      const response = NextResponse.json(
        { success: false, error: 'Adjuster not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, request);
    }

    const body = await request.json();

    // If email is being updated, check for duplicates
    if (body.email && body.email.toLowerCase() !== existingAdjuster.email) {
      const duplicateEmail = await Adjuster.findOne({ 
        email: body.email.toLowerCase(),
        _id: { $ne: existingAdjuster._id }
      });
      if (duplicateEmail) {
        const response = NextResponse.json(
          { success: false, error: 'An adjuster with this email already exists' },
          { status: 400 }
        );
        return addCorsHeaders(response, request);
      }
      body.email = body.email.toLowerCase();
    }

    // If adjusterId is being updated, check for duplicates
    if (body.adjusterId && body.adjusterId.toUpperCase() !== existingAdjuster.adjusterId) {
      const duplicateId = await Adjuster.findOne({ 
        adjusterId: body.adjusterId.toUpperCase(),
        _id: { $ne: existingAdjuster._id }
      });
      if (duplicateId) {
        const response = NextResponse.json(
          { success: false, error: 'An adjuster with this ID already exists' },
          { status: 400 }
        );
        return addCorsHeaders(response, request);
      }
      body.adjusterId = body.adjusterId.toUpperCase();
    }

    // Update lastModifiedBy
    body.lastModifiedBy = tokenPayload.userId;

    // Update currentActiveReports if assignedReports changed
    if (body.assignedReports) {
      body.currentActiveReports = body.assignedReports.filter(
        (r: any) => ['assigned', 'in_progress', 'inspected'].includes(r.status)
      ).length;
      body.totalReportsHandled = body.assignedReports.length;
    }

    const adjuster = await Adjuster.findByIdAndUpdate(
      existingAdjuster._id, 
      body, 
      { new: true, runValidators: true }
    ).lean();

    if (!adjuster) {
      const response = NextResponse.json(
        { success: false, error: 'Adjuster not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, request);
    }

    const response = NextResponse.json({
      success: true,
      data: {
        adjuster: {
          ...adjuster,
          _id: adjuster._id.toString(),
          id: adjuster._id.toString(),
          fullName: `${adjuster.firstName} ${adjuster.lastName}`,
        },
      },
      message: 'Adjuster updated successfully',
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Update adjuster error:', error);
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

// DELETE - Delete adjuster
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    const { id } = await params;

    if (!tokenPayload) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      return addCorsHeaders(response, request);
    }

    // Only super_admin can delete adjusters
    if (tokenPayload.role !== 'super_admin') {
      const response = NextResponse.json(
        { success: false, error: 'Permission denied. Only super admin can delete adjusters.' },
        { status: 403 }
      );
      return addCorsHeaders(response, request);
    }

    await connectDB();

    // Try to find and delete by _id or adjusterId
    let adjuster = await Adjuster.findByIdAndDelete(id);
    if (!adjuster) {
      adjuster = await Adjuster.findOneAndDelete({ adjusterId: id.toUpperCase() });
    }

    if (!adjuster) {
      const response = NextResponse.json(
        { success: false, error: 'Adjuster not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, request);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Adjuster deleted successfully',
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Delete adjuster error:', error);
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
