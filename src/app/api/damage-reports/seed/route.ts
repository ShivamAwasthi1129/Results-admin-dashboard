import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import DamageReport from '@/models/DamageReport';
import Adjuster from '@/models/Adjuster';
import ServiceProvider from '@/models/ServiceProvider';

const EXTERNAL_CUSTOMERS_API_URL =
  process.env.EXTERNAL_CUSTOMERS_API_URL ||
  'https://dms-rust-omega.vercel.app/api/admin/users';

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

// Map external API user to customer shape for damage report
function mapExternalUserToCustomer(externalUser: {
  id: string;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
}) {
  const fullName = externalUser.fullName || externalUser.email || 'Unknown';
  const parts = String(fullName).trim().split(/\s+/);
  const firstName = parts[0] || 'Unknown';
  const lastName = parts.slice(1).join(' ') || '';
  return {
    customerId: externalUser.id,
    firstName,
    lastName,
    email: externalUser.email || undefined,
    phone: externalUser.phoneNumber || undefined,
    address: {
      street: externalUser.address || undefined,
      city: externalUser.city || undefined,
      state: externalUser.state || undefined,
      zipCode: externalUser.pincode || undefined,
    },
  };
}

// Report templates (property/damage details only – customer and assignments come from real data)
const REPORT_TEMPLATES = [
  {
    propertyAddress: { street: '123 Oak Street', city: 'Houston', state: 'TX', zipCode: '77001', country: 'USA' },
    damageType: 'hurricane' as const,
    severity: 'severe' as const,
    description: 'Severe hurricane damage to roof and exterior.',
    affectedAreas: ['Roof', 'Second Floor', 'Exterior Walls'],
    estimatedCost: 45000,
    fundingSources: [{ source: 'insurance' as const, amount: 30000, status: 'received' as const }, { source: 'fema' as const, amount: 10000, status: 'pending' as const }],
  },
  {
    propertyAddress: { street: '456 Pine Avenue', city: 'Miami', state: 'FL', zipCode: '33101', country: 'USA' },
    damageType: 'flood' as const,
    severity: 'moderate' as const,
    description: 'Flood damage to ground floor.',
    affectedAreas: ['Ground Floor', 'Basement', 'HVAC System'],
    estimatedCost: 28000,
    fundingSources: [{ source: 'flood_insurance' as const, amount: 20000, status: 'received' as const }, { source: 'self_pay' as const, amount: 5000, status: 'received' as const }],
  },
  {
    propertyAddress: { street: '789 Maple Drive', city: 'New Orleans', state: 'LA', zipCode: '70112', country: 'USA' },
    damageType: 'wind' as const,
    severity: 'minor' as const,
    description: 'Wind damage to fence and garage door.',
    affectedAreas: ['Fence', 'Garage', 'Porch'],
    estimatedCost: 8500,
    fundingSources: [{ source: 'insurance' as const, amount: 6000, status: 'received' as const }],
  },
  {
    propertyAddress: { street: '321 Cedar Lane', city: 'Austin', state: 'TX', zipCode: '78701', country: 'USA' },
    damageType: 'fire' as const,
    severity: 'catastrophic' as const,
    description: 'Kitchen fire spread to living area.',
    affectedAreas: ['Kitchen', 'Living Room', 'Master Bedroom', 'Electrical System'],
    estimatedCost: 125000,
    fundingSources: [{ source: 'insurance' as const, amount: 80000, status: 'received' as const }, { source: 'non_profit' as const, amount: 25000, status: 'pledged' as const }],
  },
  {
    propertyAddress: { street: '555 Birch Road', city: 'Dallas', state: 'TX', zipCode: '75201', country: 'USA' },
    damageType: 'hail' as const,
    severity: 'moderate' as const,
    description: 'Hail damage to roof and vehicles.',
    affectedAreas: ['Roof', 'Skylights', 'Gutters'],
    estimatedCost: 18000,
    fundingSources: [{ source: 'insurance' as const, amount: 15000, status: 'pending' as const }],
  },
  {
    propertyAddress: { street: '100 Elm Street', city: 'Houston', state: 'TX', zipCode: '77002', country: 'USA' },
    damageType: 'storm' as const,
    severity: 'moderate' as const,
    description: 'Storm damage to windows and siding.',
    affectedAreas: ['Windows', 'Siding', 'Landscaping'],
    estimatedCost: 15000,
    fundingSources: [{ source: 'insurance' as const, amount: 12000, status: 'pending' as const }],
  },
  {
    propertyAddress: { street: '200 Willow Way', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India' },
    damageType: 'flood' as const,
    severity: 'severe' as const,
    description: 'Flood damage to ground floor and basement.',
    affectedAreas: ['Ground Floor', 'Basement', 'HVAC'],
    estimatedCost: 32000,
    fundingSources: [{ source: 'insurance' as const, amount: 25000, status: 'received' as const }],
  },
  {
    propertyAddress: { street: '300 Sector 5 Lane', city: 'Delhi', state: 'Delhi', zipCode: '110001', country: 'India' },
    damageType: 'other' as const,
    severity: 'moderate' as const,
    description: 'Structural damage requiring repair.',
    affectedAreas: ['Foundation', 'Walls'],
    estimatedCost: 22000,
    fundingSources: [{ source: 'self_pay' as const, amount: 10000, status: 'received' as const }, { source: 'insurance' as const, amount: 12000, status: 'pending' as const }],
  },
];

function getDefaultWorkflowSteps(
  currentStep: number,
  status: string,
  adminId: string,
  adminName: string,
  adminEmail: string,
  adjuster?: { adjusterId: string; fullName: string; email?: string; phone?: string; companyName?: string },
  inspectionBudget?: Array<{ taskName: string; amount: number }>
) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const steps: any[] = [
    {
      stepNumber: 1,
      name: 'Report Created',
      status: 'completed',
      startedAt: twoDaysAgo,
      completedAt: twoDaysAgo,
      completedBy: adminId,
    },
    {
      stepNumber: 2,
      name: 'Under Review',
      status: 'pending',
      statusHistory: [],
    },
    {
      stepNumber: 3,
      name: 'Assign Adjuster',
      status: 'pending',
      stepData: {},
    },
    {
      stepNumber: 4,
      name: 'Adjuster Inspection & Approval',
      status: 'pending',
      stepData: {},
    },
    {
      stepNumber: 5,
      name: 'Assign Vendors',
      status: 'pending',
      stepData: {},
    },
    {
      stepNumber: 6,
      name: 'Vendor Work',
      status: 'pending',
    },
    {
      stepNumber: 7,
      name: 'Completed',
      status: 'pending',
    },
  ];

  // Mark steps as completed based on currentStep
  for (let i = 0; i < currentStep - 1 && i < steps.length; i++) {
    steps[i].status = 'completed';
    steps[i].completedAt = i === 0 ? twoDaysAgo : dayAgo;
    steps[i].completedBy = adminId;
  }

  // Current step is in_progress
  if (currentStep > 0 && currentStep <= steps.length) {
    const idx = currentStep - 1;
    if (steps[idx].status !== 'completed') {
      steps[idx].status = 'in_progress';
      steps[idx].startedAt = dayAgo;
    }
  }

  // Add status history for step 2 if it's completed or in progress
  if (currentStep >= 2) {
    steps[1].statusHistory = [
      {
        status: 'in_progress',
        changedAt: twoDaysAgo,
        changedBy: { userId: adminId, name: adminName, email: adminEmail },
      },
    ];
    if (currentStep >= 3) {
      steps[1].statusHistory.push({
        status: 'completed',
        changedAt: dayAgo,
        changedBy: { userId: adminId, name: adminName, email: adminEmail },
      });
    }
  }

  // Add adjuster snapshot to step 3 if adjuster is assigned
  if (currentStep >= 4 && adjuster) {
    steps[2].stepData = {
      assignedAdjusterSnapshot: {
        adjusterId: adjuster.adjusterId,
        fullName: adjuster.fullName,
        email: adjuster.email,
        phone: adjuster.phone,
        companyName: adjuster.companyName,
        assignedDate: dayAgo,
        assignedBy: adminId,
      },
    };
  }

  // Add inspection budget (key-value pairs) to step 4 whenever provided
  if (inspectionBudget && inspectionBudget.length > 0) {
    steps[3].stepData = steps[3].stepData || {};
    steps[3].stepData.inspectionBudget = inspectionBudget;
  }

  return steps;
}

// POST - Seed damage reports from external users + existing adjusters/vendors
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
    if (tokenPayload.role !== 'super_admin') {
      const response = NextResponse.json(
        { success: false, error: 'Permission denied. Only super admin can seed data.' },
        { status: 403 }
      );
      return addCorsHeaders(response, request);
    }

    await connectDB();

    // 1) Fetch users (customers) from external API only – no fake data
    const externalRes = await fetch(EXTERNAL_CUSTOMERS_API_URL, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!externalRes.ok) {
      const response = NextResponse.json(
        { success: false, error: 'Failed to fetch customers from external API. Check EXTERNAL_CUSTOMERS_API_URL.' },
        { status: 502 }
      );
      return addCorsHeaders(response, request);
    }
    const externalData = await externalRes.json();
    const externalUsers = externalData?.data?.users ?? externalData?.users ?? [];
    if (!Array.isArray(externalUsers) || externalUsers.length === 0) {
      const response = NextResponse.json(
        { success: false, error: 'No users returned from external API. Cannot seed damage reports.' },
        { status: 400 }
      );
      return addCorsHeaders(response, request);
    }
    const customers = externalUsers.map((u: Record<string, unknown>) => mapExternalUserToCustomer(u as any));

    // 2) Fetch existing adjusters and service providers (vendors) from our DB
    const [adjusters, vendors] = await Promise.all([
      Adjuster.find({}).limit(10).lean(),
      ServiceProvider.find({}).limit(10).lean(),
    ]);

    // Clear existing damage reports
    await DamageReport.deleteMany({});

    const reportedBy = {
      userId: tokenPayload.userId,
      name: tokenPayload.name || 'Admin',
      email: tokenPayload.email,
    };
    const year = new Date().getFullYear();
    const reportsToCreate: any[] = [];
    let reportIndex = 0;

    // Build 12 reports: multiple per customer (a single user can have multiple damage reports)
    // Customers repeated: 0,1,2 appear multiple times.
    const customerIndexForReport = [0, 1, 2, 0, 1, 2, 0, 3, 1, 4, 0, 2];
    const assignAdjusterForReport = [false, true, true, false, true, false, true, false, false, true, false, true];
    const assignVendorsForReport =  [false, false, true, true, true, false, true, true, false, true, true, true];

    for (let i = 0; i < 12; i++) {
      const custIdx = customerIndexForReport[i] % customers.length;
      const customer = customers[custIdx];
      const template = REPORT_TEMPLATES[i % REPORT_TEMPLATES.length];
      reportIndex++;
      const reportNumber = `DR-${year}-${String(reportIndex).padStart(3, '0')}`;

      let currentStep = 1;
      let status: string = 'report_created';
      let assignedAdjuster: any = undefined;
      let assignedVendors: any[] = [];

      if (assignAdjusterForReport[i] && adjusters.length > 0) {
        const adj = adjusters[i % adjusters.length] as any;
        assignedAdjuster = {
          adjusterId: adj.adjusterId || adj._id?.toString(),
          adjusterDbId: adj._id?.toString(),
          fullName: adj.fullName || `${adj.firstName || ''} ${adj.lastName || ''}`.trim(),
          email: adj.email,
          phone: adj.phone,
          companyName: adj.companyName,
          assignedDate: new Date(),
          assignedBy: tokenPayload.userId,
          approvalStatus: i === 3 ? 'approved' : 'pending',
        };
        currentStep = 4;
        status = 'adjuster_assigned';
      }

      // Generate step 4 key-value pairs: inspection budget for every report (from affected areas)
      const inspectionBudget: Array<{ taskName: string; amount: number }> = [];
      template.affectedAreas.forEach((area) => {
        inspectionBudget.push({
          taskName: `${area} Repair`,
          amount: Math.round((template.estimatedCost / template.affectedAreas.length) * (0.8 + Math.random() * 0.4)),
        });
      });

      if (assignVendorsForReport[i] && vendors.length > 0) {
        const v1 = vendors[i % vendors.length] as any;
        const taskName1 = inspectionBudget[0]?.taskName || 'General Repair';
        assignedVendors.push({
          vendorId: v1._id?.toString(),
          providerId: v1.providerId,
          businessName: v1.businessName || 'Vendor',
          taskName: taskName1,
          contactPerson: v1.contactPerson || {},
          category: v1.category,
          assignedDate: new Date(),
          assignedBy: tokenPayload.userId,
          estimatedCost: inspectionBudget[0]?.amount || Math.round((template.estimatedCost * 0.4) + Math.random() * 5000),
          status: i >= 6 ? 'completed' : i >= 4 ? 'in_progress' : 'assigned',
        });
        if (i === 5 && vendors.length > 1 && inspectionBudget.length > 1) {
          const v2 = vendors[(i + 1) % vendors.length] as any;
          const taskName2 = inspectionBudget[1]?.taskName || 'Secondary Repair';
          assignedVendors.push({
            vendorId: v2._id?.toString(),
            providerId: v2.providerId,
            businessName: v2.businessName || 'Vendor',
            taskName: taskName2,
            category: v2.category,
            assignedDate: new Date(),
            assignedBy: tokenPayload.userId,
            estimatedCost: inspectionBudget[1]?.amount || Math.round((template.estimatedCost * 0.3) + Math.random() * 3000),
            status: 'in_progress',
          });
        }
        if (assignedVendors.length > 0) {
          currentStep = assignedVendors.every((v: any) => v.status === 'completed') ? 7 : 6;
          status = currentStep === 7 ? 'completed' : 'work_in_progress';
        }
      }

      // Generate workflow steps (step 4 inspection budget only; vendors are report.assignedVendors)
      const workflowSteps = getDefaultWorkflowSteps(
        currentStep,
        status,
        tokenPayload.userId,
        tokenPayload.name || 'Admin',
        tokenPayload.email || '',
        assignedAdjuster ? {
          adjusterId: assignedAdjuster.adjusterId,
          fullName: assignedAdjuster.fullName,
          email: assignedAdjuster.email,
          phone: assignedAdjuster.phone,
          companyName: assignedAdjuster.companyName,
        } : undefined,
        inspectionBudget
      );

      reportsToCreate.push({
        customer: {
          customerId: customer.customerId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        },
        reportNumber,
        reportDate: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        reportedBy,
        propertyAddress: template.propertyAddress,
        damageType: template.damageType,
        severity: template.severity,
        status,
        description: template.description,
        affectedAreas: template.affectedAreas,
        estimatedCost: template.estimatedCost,
        fundingSources: template.fundingSources,
        workflowSteps,
        currentStep,
        assignedAdjuster,
        assignedVendors,
        images: [],
        priority: ['low', 'medium', 'high', 'urgent'][i % 4],
        createdBy: tokenPayload.userId,
        lastModifiedBy: tokenPayload.userId,
      });
    }

    const insertedReports = await DamageReport.insertMany(reportsToCreate);

    // Sync Adjuster.assignedReports for reports that have an assigned adjuster
    for (let i = 0; i < insertedReports.length; i++) {
      const r = insertedReports[i] as any;
      if (r.assignedAdjuster?.adjusterId) {
        try {
          await Adjuster.findOneAndUpdate(
            { adjusterId: r.assignedAdjuster.adjusterId },
            {
              $push: {
                assignedReports: {
                  reportId: r._id.toString(),
                  reportNumber: r.reportNumber,
                  customerId: r.customer?.customerId,
                  assignedDate: new Date(),
                  status: 'assigned',
                },
              },
              $inc: { currentActiveReports: 1, totalReportsHandled: 1 },
            }
          );
        } catch (adjErr) {
          console.error('Error syncing adjuster assignedReports:', adjErr);
        }
      }
    }

    const response = NextResponse.json({
      success: true,
      message: `Successfully seeded ${insertedReports.length} damage reports using external API customers and existing adjusters/vendors.`,
      data: {
        damageReportsCount: insertedReports.length,
        source: 'EXTERNAL_CUSTOMERS_API_URL',
        reports: insertedReports.map((r: any) => ({
          reportNumber: r.reportNumber,
          customerName: `${r.customer.firstName} ${r.customer.lastName}`,
          customerId: r.customer.customerId,
          status: r.status,
          damageType: r.damageType,
          hasAdjuster: !!r.assignedAdjuster,
          vendorCount: r.assignedVendors?.length ?? 0,
        })),
      },
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Seed damage reports error:', error);
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

// DELETE - Clear all damage reports
export async function DELETE(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      const response = NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
      return addCorsHeaders(response, request);
    }
    if (tokenPayload.role !== 'super_admin') {
      const response = NextResponse.json(
        { success: false, error: 'Permission denied. Only super admin can clear data.' },
        { status: 403 }
      );
      return addCorsHeaders(response, request);
    }
    await connectDB();
    const result = await DamageReport.deleteMany({});
    const response = NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} damage reports`,
      data: { deletedCount: result.deletedCount },
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Clear damage reports error:', error);
    const response = NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
    return addCorsHeaders(response, request);
  }
}
