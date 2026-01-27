import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, canPerform } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import DamageReport from '@/models/DamageReport';

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse, request?: NextRequest) {
  // Get origin from request or use configured URL
  let allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // If request origin matches our domain, use it (for production)
  if (request) {
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin) {
      // Allow same origin or configured origin
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

// GET - Get single damage report
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

    const damageReport = await DamageReport.findById(id).lean();

    if (!damageReport) {
      const response = NextResponse.json(
        { success: false, error: 'Damage report not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, request);
    }

    // Calculate funding metrics
    const totalFunding = damageReport.fundingSources?.reduce((sum: number, source: any) => sum + (source.amount || 0), 0) || 0;
    const fundingPercentage = damageReport.estimatedCost > 0 
      ? Math.round((totalFunding / damageReport.estimatedCost) * 100) 
      : 0;

    const response = NextResponse.json({
      success: true,
      data: {
        damageReport: {
          ...damageReport,
          _id: damageReport._id.toString(),
          id: damageReport._id.toString(),
          totalFunding,
          fundingPercentage,
          remainingFunding: Math.max(0, (damageReport.estimatedCost || 0) - totalFunding),
          vendor: damageReport.vendor,
        },
      },
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Get damage report error:', error);
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

// PUT - Update damage report
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

    // Get existing report to track milestone changes
    const existingReport = await DamageReport.findById(id).lean();
    if (!existingReport) {
      const response = NextResponse.json(
        { success: false, error: 'Damage report not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, request);
    }

    const body = await request.json();

    // If report number is being updated, check for duplicates
    if (body.reportNumber) {
      const duplicateReport = await DamageReport.findOne({ 
        reportNumber: body.reportNumber.toUpperCase(),
        _id: { $ne: id }
      });
      if (duplicateReport) {
        const response = NextResponse.json(
          { success: false, error: 'Damage report with this report number already exists' },
          { status: 400 }
        );
        return addCorsHeaders(response, request);
      }
      body.reportNumber = body.reportNumber.toUpperCase();
    }

    // Track milestone history if milestones are being updated
    if (body.milestones && Array.isArray(body.milestones)) {
      const existingMilestones = existingReport.milestones || [];
      body.milestones = body.milestones.map((milestone: any, index: number) => {
        const existingMilestone = existingMilestones.find(
          (m: any) => m.name === milestone.name && m.order === milestone.order
        );
        
        // If status changed, add to history
        if (existingMilestone && existingMilestone.status !== milestone.status) {
          const history = existingMilestone.history || [];
          history.push({
            status: milestone.status,
            changedAt: new Date(),
            changedBy: tokenPayload.userId,
            notes: milestone.notes,
          });
          milestone.history = history;
        } else if (!existingMilestone) {
          // New milestone, initialize history
          milestone.history = [{
            status: milestone.status,
            changedAt: new Date(),
            changedBy: tokenPayload.userId,
          }];
        } else {
          // Keep existing history
          milestone.history = existingMilestone.history || [];
        }

        // Update completion date if status is completed
        if (milestone.status === 'completed' && !milestone.completionDate) {
          milestone.completionDate = new Date();
        }

        return milestone;
      });
    }

    // Update lastModifiedBy
    body.lastModifiedBy = tokenPayload.userId;

    // If reportDate is provided, ensure it's a Date object
    if (body.reportDate) {
      body.reportDate = new Date(body.reportDate);
    }

    // Handle vendor assignment - update assignedDate if vendor is being assigned/updated
    if (body.vendor) {
      if (body.vendor.assignedDate) {
        body.vendor.assignedDate = new Date(body.vendor.assignedDate);
      } else if (!existingReport.vendor || existingReport.vendor.vendorId !== body.vendor.vendorId) {
        // New assignment or vendor change
        body.vendor.assignedDate = new Date();
        body.vendor.assignedBy = tokenPayload.userId;
      }
    }

    const damageReport = await DamageReport.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!damageReport) {
      const response = NextResponse.json(
        { success: false, error: 'Damage report not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, request);
    }

    // Calculate funding metrics
    const totalFunding = damageReport.fundingSources?.reduce((sum: number, source: any) => sum + (source.amount || 0), 0) || 0;
    const fundingPercentage = damageReport.estimatedCost > 0 
      ? Math.round((totalFunding / damageReport.estimatedCost) * 100) 
      : 0;

    const response = NextResponse.json({
      success: true,
      data: {
        damageReport: {
          ...damageReport,
          _id: damageReport._id.toString(),
          id: damageReport._id.toString(),
          totalFunding,
          fundingPercentage,
          remainingFunding: Math.max(0, (damageReport.estimatedCost || 0) - totalFunding),
          vendor: damageReport.vendor,
        },
      },
      message: 'Damage report updated successfully',
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Update damage report error:', error);
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

// DELETE - Delete damage report
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

    // Only super_admin can delete damage reports
    if (tokenPayload.role !== 'super_admin') {
      const response = NextResponse.json(
        { success: false, error: 'Permission denied. Only super admin can delete damage reports.' },
        { status: 403 }
      );
      return addCorsHeaders(response, request);
    }

    await connectDB();

    const damageReport = await DamageReport.findByIdAndDelete(id);

    if (!damageReport) {
      const response = NextResponse.json(
        { success: false, error: 'Damage report not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, request);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Damage report deleted successfully',
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Delete damage report error:', error);
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
