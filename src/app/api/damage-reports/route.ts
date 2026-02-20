import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, canPerform } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import DamageReport from '@/models/DamageReport';
import User from '@/models/User';

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

// Default workflow steps
const DEFAULT_WORKFLOW_STEPS = [
  { stepNumber: 1, name: 'Report Created', status: 'completed', startedAt: new Date(), completedAt: new Date() },
  { stepNumber: 2, name: 'Under Review', status: 'pending' },
  { stepNumber: 3, name: 'Assign Adjuster', status: 'pending' },
  { stepNumber: 4, name: 'Adjuster Inspection & Approval', status: 'pending' },
  { stepNumber: 5, name: 'Assign Vendors', status: 'pending' },
  { stepNumber: 6, name: 'Vendor Work', status: 'pending' },
  { stepNumber: 7, name: 'Completed', status: 'pending' },
];

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
    const customerId = searchParams.get('customerId') || '';
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { reportNumber: { $regex: search, $options: 'i' } },
        { 'customer.firstName': { $regex: search, $options: 'i' } },
        { 'customer.lastName': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
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

    if (customerId) {
      query['customer.customerId'] = customerId;
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
      const totalVendorCost = report.assignedVendors?.reduce((sum: number, vendor: any) => sum + (vendor.estimatedCost || 0), 0) || 0;
      const vendorWorkProgress = report.assignedVendors?.length > 0
        ? Math.round((report.assignedVendors.filter((v: any) => v.status === 'completed').length / report.assignedVendors.length) * 100)
        : 0;

      return {
        _id: report._id.toString(),
        id: report._id.toString(),
        reportNumber: report.reportNumber,
        reportDate: report.reportDate,
        customer: report.customer,
        customerFullName: report.customer ? `${report.customer.firstName} ${report.customer.lastName}` : 'N/A',
        reportedBy: report.reportedBy,
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
        workflowSteps: report.workflowSteps || [],
        currentStep: report.currentStep || 1,
        assignedAdjuster: report.assignedAdjuster,
        assignedVendors: report.assignedVendors || [],
        totalVendorCost,
        vendorWorkProgress,
        images: report.images || [],
        notes: report.notes,
        tags: report.tags || [],
        priority: report.priority,
        insuranceCoverage: report.insuranceCoverage ?? null,
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

    // Validate required fields - now requires customer selection
    if (!body.customer?.customerId) {
      const response = NextResponse.json(
        { success: false, error: 'Customer selection is required' },
        { status: 400 }
      );
      return addCorsHeaders(response, request);
    }

    if (!body.propertyAddress || !body.damageType || !body.severity || !body.description) {
      const response = NextResponse.json(
        { success: false, error: 'Property address, damage type, severity, and description are required' },
        { status: 400 }
      );
      return addCorsHeaders(response, request);
    }

    // Validate insuranceCoverage if provided
    const validInsuranceCoverage = ['uninsured', 'partially_insured', 'fully_insured'];
    if (body.insuranceCoverage != null && body.insuranceCoverage !== '') {
      if (!validInsuranceCoverage.includes(body.insuranceCoverage)) {
        const response = NextResponse.json(
          { success: false, error: 'insuranceCoverage must be one of: uninsured, partially_insured, fully_insured' },
          { status: 400 }
        );
        return addCorsHeaders(response, request);
      }
    }

    const estimatedCost = Number(body.estimatedCost) || 0;
    const fundingSources = Array.isArray(body.fundingSources) ? body.fundingSources : [];
    const totalFunding = fundingSources.reduce((sum: number, s: { amount?: number }) => sum + (Number(s?.amount) || 0), 0);
    if (estimatedCost > 0 && totalFunding > estimatedCost) {
      const response = NextResponse.json(
        { success: false, error: 'Sum of funding sources cannot exceed the estimated repair cost.' },
        { status: 400 }
      );
      return addCorsHeaders(response, request);
    }

    // Fetch customer details from User model if only customerId provided
    let customerData = body.customer;
    if (body.customer.customerId && (!body.customer.firstName || !body.customer.lastName)) {
      const user = await User.findById(body.customer.customerId).lean();
      if (!user) {
        const response = NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
        return addCorsHeaders(response, request);
      }
      customerData = {
        customerId: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address ? {
          street: user.address.street,
          city: user.address.city,
          state: user.address.state,
          zipCode: user.address.pincode,
        } : undefined,
      };
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

    // Generate reportNumber before creating document (validation runs before pre-save hook)
    let reportNumber = body.reportNumber?.trim()?.toUpperCase();
    if (!reportNumber) {
      const year = new Date().getFullYear();
      const count = await DamageReport.countDocuments({
        reportDate: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
      });
      reportNumber = `DR-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    // Create new damage report with new structure
    const reportData = {
      ...body,
      customer: customerData,
      reportNumber,
      reportDate: body.reportDate ? new Date(body.reportDate) : new Date(),
      reportedBy: {
        userId: tokenPayload.userId,
        name: body.reportedBy?.name || tokenPayload.name,
        email: body.reportedBy?.email || tokenPayload.email,
        phone: body.reportedBy?.phone,
      },
      status: 'report_created',
      description: body.description || '',
      affectedAreas: Array.isArray(body.affectedAreas) ? body.affectedAreas : [],
      estimatedCost: body.estimatedCost || 0,
      fundingSources: body.fundingSources || [],
      insuranceCoverage: body.insuranceCoverage && validInsuranceCoverage.includes(body.insuranceCoverage) ? body.insuranceCoverage : null,
      workflowSteps: DEFAULT_WORKFLOW_STEPS,
      currentStep: 1,
      assignedVendors: [],
      images: body.images || [],
      createdBy: tokenPayload.userId,
      lastModifiedBy: tokenPayload.userId,
    };

    const damageReport = new DamageReport(reportData);
    await damageReport.save();

    // Calculate metrics from saved document
    const savedTotalFunding = damageReport.fundingSources.reduce((sum, source) => sum + (source.amount || 0), 0);
    const fundingPercentage = damageReport.estimatedCost > 0 
      ? Math.round((savedTotalFunding / damageReport.estimatedCost) * 100) 
      : 0;

    const response = NextResponse.json({
      success: true,
      data: {
        damageReport: {
          ...damageReport.toObject(),
          customerFullName: `${damageReport.customer.firstName} ${damageReport.customer.lastName}`,
          totalFunding: savedTotalFunding,
          fundingPercentage,
          remainingFunding: Math.max(0, damageReport.estimatedCost - savedTotalFunding),
          totalVendorCost: 0,
          vendorWorkProgress: 0,
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
