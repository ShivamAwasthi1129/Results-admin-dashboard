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

// GET - List all damage reports with pagination, search, and filters
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
    const damageType = searchParams.get('damageType') || '';
    const severity = searchParams.get('severity') || '';
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { reportNumber: { $regex: search, $options: 'i' } },
        { 'propertyOwner.name': { $regex: search, $options: 'i' } },
        { 'propertyAddress.street': { $regex: search, $options: 'i' } },
        { 'propertyAddress.city': { $regex: search, $options: 'i' } },
        { 'propertyAddress.zipCode': { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (damageType) {
      query.damageType = damageType;
    }

    if (severity) {
      query.severity = severity;
    }

    if (city) {
      query['propertyAddress.city'] = { $regex: city, $options: 'i' };
    }

    if (state) {
      query['propertyAddress.state'] = { $regex: state, $options: 'i' };
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Fetch damage reports from database
    const damageReports = await DamageReport.find(query)
      .sort({ reportDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await DamageReport.countDocuments(query);

    // Transform damage reports for response
    const transformedReports = damageReports.map((report: any) => {
      const totalFunding = report.fundingSources?.reduce((sum: number, source: any) => sum + (source.amount || 0), 0) || 0;
      const fundingPercentage = report.estimatedCost > 0 
        ? Math.round((totalFunding / report.estimatedCost) * 100) 
        : 0;

      return {
        _id: report._id.toString(),
        id: report._id.toString(),
        reportNumber: report.reportNumber,
        reportDate: report.reportDate,
        reportedBy: report.reportedBy,
        propertyOwner: report.propertyOwner,
        propertyAddress: report.propertyAddress,
        damageType: report.damageType,
        severity: report.severity,
        status: report.status,
        description: report.description,
        affectedAreas: report.affectedAreas || [],
        estimatedCost: report.estimatedCost,
        actualCost: report.actualCost,
        fundingSources: report.fundingSources || [],
        totalFunding,
        fundingPercentage,
        remainingFunding: Math.max(0, (report.estimatedCost || 0) - totalFunding),
        milestones: report.milestones || [],
        images: report.images || [],
        contractor: report.contractor,
        vendor: report.vendor,
        notes: report.notes,
        tags: report.tags || [],
        priority: report.priority,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      };
    });

    const response = NextResponse.json({
      success: true,
      data: {
        damageReports: transformedReports,
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
    console.error('Get damage reports error:', error);
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

// POST - Create new damage report
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

    // Allow admin and super_admin to create damage reports
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
    if (!body.propertyOwner?.name || !body.propertyOwner?.phone || !body.propertyAddress || !body.damageType || !body.severity || !body.description) {
      const response = NextResponse.json(
        { success: false, error: 'Property owner, address, damage type, severity, and description are required' },
        { status: 400 }
      );
      return addCorsHeaders(response, request);
    }

    // Check if report number already exists (if provided)
    if (body.reportNumber) {
      const existingReport = await DamageReport.findOne({ reportNumber: body.reportNumber.toUpperCase() });
      if (existingReport) {
        const response = NextResponse.json(
          { success: false, error: 'Damage report with this report number already exists' },
          { status: 400 }
        );
        return addCorsHeaders(response, request);
      }
    }

    // Set default milestones if not provided
    const defaultMilestones = [
      { name: 'Initial Assessment', status: 'pending', order: 1 },
      { name: 'Insurance Approval', status: 'pending', order: 2 },
      { name: 'Contractor Assignment', status: 'pending', order: 3 },
      { name: 'Repair Work Started', status: 'pending', order: 4 },
      { name: 'Final Inspection', status: 'pending', order: 5 },
      { name: 'Completion & Closeout', status: 'pending', order: 6 },
    ];

    // Create new damage report
    const reportData = {
      ...body,
      reportNumber: body.reportNumber?.toUpperCase(),
      reportDate: body.reportDate ? new Date(body.reportDate) : new Date(),
      reportedBy: {
        userId: tokenPayload.userId,
        name: body.reportedBy?.name || tokenPayload.name,
        email: body.reportedBy?.email || tokenPayload.email,
        phone: body.reportedBy?.phone,
      },
      estimatedCost: body.estimatedCost || 0,
      fundingSources: body.fundingSources || [],
      milestones: body.milestones && body.milestones.length > 0 ? body.milestones : defaultMilestones,
      images: body.images || [],
      vendor: body.vendor ? {
        ...body.vendor,
        assignedDate: body.vendor.assignedDate ? new Date(body.vendor.assignedDate) : new Date(),
      } : undefined,
      createdBy: tokenPayload.userId,
      lastModifiedBy: tokenPayload.userId,
    };

    const damageReport = new DamageReport(reportData);
    await damageReport.save();

    // Calculate funding metrics
    const totalFunding = damageReport.fundingSources.reduce((sum, source) => sum + (source.amount || 0), 0);
    const fundingPercentage = damageReport.estimatedCost > 0 
      ? Math.round((totalFunding / damageReport.estimatedCost) * 100) 
      : 0;

    const response = NextResponse.json({
      success: true,
      data: {
        damageReport: {
          ...damageReport.toObject(),
          totalFunding,
          fundingPercentage,
          remainingFunding: Math.max(0, damageReport.estimatedCost - totalFunding),
        },
      },
      message: 'Damage report created successfully',
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Create damage report error:', error);
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
