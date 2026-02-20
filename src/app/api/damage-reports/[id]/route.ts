import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, canPerform } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import DamageReport from '@/models/DamageReport';
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

// Helper to calculate metrics
function calculateMetrics(report: any) {
  const totalFunding = report.fundingSources?.reduce((sum: number, source: any) => sum + (source.amount || 0), 0) || 0;
  const fundingPercentage = report.estimatedCost > 0 
    ? Math.round((totalFunding / report.estimatedCost) * 100) 
    : 0;
  const totalVendorCost = report.assignedVendors?.reduce((sum: number, vendor: any) => sum + (vendor.estimatedCost || 0), 0) || 0;
  const vendorWorkProgress = report.assignedVendors?.length > 0
    ? Math.round((report.assignedVendors.filter((v: any) => v.status === 'completed').length / report.assignedVendors.length) * 100)
    : 0;

  return {
    totalFunding,
    fundingPercentage,
    remainingFunding: Math.max(0, (report.estimatedCost || 0) - totalFunding),
    totalVendorCost,
    vendorWorkProgress,
    customerFullName: report.customer ? `${report.customer.firstName} ${report.customer.lastName}` : 'N/A',
  };
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

    const metrics = calculateMetrics(damageReport);

    const response = NextResponse.json({
      success: true,
      data: {
        damageReport: {
          ...damageReport,
          _id: damageReport._id.toString(),
          id: damageReport._id.toString(),
          ...metrics,
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

    // Get existing report
    const existingReport = await DamageReport.findById(id).lean();
    if (!existingReport) {
      const response = NextResponse.json(
        { success: false, error: 'Damage report not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, request);
    }

    const body = await request.json();

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
    } else if (body.insuranceCoverage === '') {
      body.insuranceCoverage = null;
    }

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

    const adminChangedBy = {
      userId: tokenPayload.userId,
      name: tokenPayload.name || '',
      email: tokenPayload.email || '',
    };

    /**
     * Merge workflowSteps safely so we never drop nested stepData.
     *
     * Real-world UI payloads are often partial (e.g. a step object missing stepData).
     * Replacing the full array can wipe stepData in MongoDB. This merge preserves existing stepData
     * unless the incoming payload explicitly provides it.
     */
    const mergeWorkflowSteps = (existingSteps: any[], incomingSteps: any[]) => {
      const byStep = new Map<number, any>(
        (existingSteps || [])
          .filter((s) => s && typeof s.stepNumber === 'number')
          .map((s) => [s.stepNumber, s])
      );

      const merged = (incomingSteps || [])
        .filter((s) => s && typeof s.stepNumber === 'number')
        .map((incomingStep: any) => {
          const existingStep = byStep.get(incomingStep.stepNumber);
          const prevStatus = existingStep?.status;
          const newStatus = incomingStep.status;

          const nextStep: any = {
            ...(existingStep || {}),
            ...(incomingStep || {}),
          };

          // Status history: keep existing history, append change when status changes
          const baseHistory = Array.isArray(existingStep?.statusHistory) ? [...existingStep.statusHistory] : [];
          const incomingHistory = Array.isArray(incomingStep.statusHistory) ? incomingStep.statusHistory : undefined;
          const statusHistory = incomingHistory ? [...incomingHistory] : baseHistory;
          if (newStatus && newStatus !== prevStatus) {
            statusHistory.push({
              status: newStatus,
              changedAt: new Date(),
              changedBy: adminChangedBy,
            });
          }
          if (statusHistory.length > 0) nextStep.statusHistory = statusHistory;

          // Timestamps
          if (nextStep.status === 'in_progress' && prevStatus !== 'in_progress' && !nextStep.startedAt) {
            nextStep.startedAt = new Date();
          }
          if (nextStep.status === 'completed' && prevStatus !== 'completed' && !nextStep.completedAt) {
            nextStep.completedAt = new Date();
            nextStep.completedBy = tokenPayload.userId;
          }

          // StepData merge (preserve existing if incoming is missing/empty)
          const existingStepData =
            existingStep?.stepData && typeof existingStep.stepData === 'object' ? existingStep.stepData : undefined;
          const incomingStepData =
            incomingStep?.stepData && typeof incomingStep.stepData === 'object' ? incomingStep.stepData : undefined;

          const mergedStepData: any = { ...(existingStepData || {}) };
          if (incomingStepData) Object.assign(mergedStepData, incomingStepData);
          // Strip any deprecated fields
          if ('vendorAssignments' in mergedStepData) delete mergedStepData.vendorAssignments;

          // Step 4: normalize + preserve inspectionBudget unless explicitly overridden
          if (incomingStep.stepNumber === 4) {
            const incomingBudget = incomingStepData?.inspectionBudget;
            const hasIncomingBudget = Array.isArray(incomingBudget);
            const budgetToUse = hasIncomingBudget
              ? incomingBudget
              : Array.isArray(existingStepData?.inspectionBudget)
                ? existingStepData.inspectionBudget
                : [];
            mergedStepData.inspectionBudget = budgetToUse.map((item: any) => ({
              taskName: String(item?.taskName ?? '').trim(),
              amount: Number(item?.amount) || 0,
            }));
          }

          // Keep stepData around for step 3/4 even if empty object so it doesn't disappear in DB
          if (incomingStep.stepNumber === 3 || incomingStep.stepNumber === 4) {
            nextStep.stepData = mergedStepData;
          } else if (Object.keys(mergedStepData).length > 0) {
            nextStep.stepData = mergedStepData;
          } else {
            // Don't force stepData for other steps
            delete nextStep.stepData;
          }

          return nextStep;
        });

      return merged;
    };

    // Handle workflow step updates
    if (body.workflowSteps && Array.isArray(body.workflowSteps)) {
      body.workflowSteps = mergeWorkflowSteps(existingReport.workflowSteps || [], body.workflowSteps);

      // Update currentStep based on workflow
      const lastCompleted = body.workflowSteps
        .filter((s: any) => s.status === 'completed')
        .sort((a: any, b: any) => b.stepNumber - a.stepNumber)[0];
      body.currentStep = lastCompleted ? Math.min(lastCompleted.stepNumber + 1, 7) : 1;
    }

    // Handle adjuster assignment (Step 3)
    if (body.assignedAdjuster) {
      const adjuster = body.assignedAdjuster;
      const assignedDate = new Date();

      // If new assignment or adjuster changed
      if (!existingReport.assignedAdjuster ||
          existingReport.assignedAdjuster.adjusterId !== adjuster.adjusterId) {
        body.assignedAdjuster = {
          ...adjuster,
          assignedDate,
          assignedBy: tokenPayload.userId,
          approvalStatus: adjuster.approvalStatus || 'pending',
        };

        // Update status if assigning adjuster
        if (!body.status) {
          body.status = 'adjuster_assigned';
        }

        // Step 3: store adjuster in workflow step and set step 3 completed
        if (body.workflowSteps && Array.isArray(body.workflowSteps)) {
          const step3 = body.workflowSteps.find((s: any) => s.stepNumber === 3);
          if (step3) {
            step3.status = 'completed';
            step3.completedAt = assignedDate;
            step3.completedBy = tokenPayload.userId;
            step3.stepData = step3.stepData || {};
            step3.stepData.assignedAdjusterSnapshot = {
              adjusterId: adjuster.adjusterId,
              adjusterDbId: adjuster.adjusterDbId,
              fullName: adjuster.fullName,
              email: adjuster.email,
              phone: adjuster.phone,
              companyName: adjuster.companyName,
              assignedDate,
              assignedBy: tokenPayload.userId,
            };
            const lastCompleted = body.workflowSteps
              .filter((s: any) => s.status === 'completed')
              .sort((a: any, b: any) => b.stepNumber - a.stepNumber)[0];
            body.currentStep = lastCompleted ? Math.min(lastCompleted.stepNumber + 1, 7) : 1;
          }
        }

        // Also update the Adjuster model's assignedReports
        try {
          await Adjuster.findOneAndUpdate(
            { adjusterId: adjuster.adjusterId },
            {
              $push: {
                assignedReports: {
                  reportId: id,
                  reportNumber: existingReport.reportNumber,
                  customerId: existingReport.customer?.customerId,
                  assignedDate,
                  status: 'assigned',
                }
              },
              $inc: { currentActiveReports: 1, totalReportsHandled: 1 },
            }
          );
        } catch (adjErr) {
          console.error('Error updating adjuster:', adjErr);
        }
      }
      
      // Handle approval status change
      if (adjuster.approvalStatus === 'approved' && 
          existingReport.assignedAdjuster?.approvalStatus !== 'approved') {
        body.assignedAdjuster.approvalDate = new Date();
        if (!body.status) {
          body.status = 'adjuster_approved';
        }
        
        // Update adjuster's report status
        try {
          await Adjuster.findOneAndUpdate(
            { 
              adjusterId: adjuster.adjusterId,
              'assignedReports.reportId': id 
            },
            {
              $set: {
                'assignedReports.$.approvalStatus': 'approved',
                'assignedReports.$.approvalDate': new Date(),
                'assignedReports.$.status': 'approved',
              }
            }
          );
        } catch (adjErr) {
          console.error('Error updating adjuster approval:', adjErr);
        }
      }
    }

    // Handle vendor assignments
    if (body.assignedVendors && Array.isArray(body.assignedVendors)) {
      const existingVendors = existingReport.assignedVendors || [];
      
      body.assignedVendors = body.assignedVendors.map((vendor: any) => {
        const existingVendor = existingVendors.find((v: any) => 
          v.vendorId === vendor.vendorId || v._id?.toString() === vendor._id
        );
        
        // New vendor assignment
        if (!existingVendor) {
          return {
            ...vendor,
            assignedDate: new Date(),
            assignedBy: tokenPayload.userId,
            status: vendor.status || 'assigned',
          };
        }
        
        // Existing vendor - check for status changes
        if (vendor.status === 'in_progress' && existingVendor.status !== 'in_progress') {
          vendor.startDate = vendor.startDate || new Date();
        }
        
        if (vendor.status === 'completed' && existingVendor.status !== 'completed') {
          vendor.completionDate = vendor.completionDate || new Date();
          vendor.completedBy = vendor.completedBy || tokenPayload.userId;
        }
        
        return {
          ...existingVendor,
          ...vendor,
        };
      });
      
      // Update status based on vendor progress
      const allVendorsCompleted = body.assignedVendors.length > 0 && 
        body.assignedVendors.every((v: any) => v.status === 'completed' || v.status === 'cancelled');
      const anyVendorInProgress = body.assignedVendors.some((v: any) => v.status === 'in_progress');
      
      if (!body.status) {
        if (allVendorsCompleted) {
          body.status = 'completed';
          // Mark step 7 as completed
          if (body.workflowSteps) {
            const step7 = body.workflowSteps.find((s: any) => s.stepNumber === 7);
            if (step7) {
              step7.status = 'completed';
              step7.completedAt = new Date();
              step7.completedBy = tokenPayload.userId;
            }
          }
        } else if (anyVendorInProgress) {
          body.status = 'work_in_progress';
        } else if (body.assignedVendors.length > 0) {
          body.status = 'vendor_assigned';
        }
      }
    }

    // Update lastModifiedBy
    body.lastModifiedBy = tokenPayload.userId;

    // If reportDate is provided, ensure it's a Date object
    if (body.reportDate) {
      body.reportDate = new Date(body.reportDate);
    }

    // Note: workflowSteps normalization is handled inside mergeWorkflowSteps to avoid double-mapping
    // which can accidentally wipe nested stepData when payloads are partial.

    // Use find + save so nested stepData (e.g. step 4 inspectionBudget) is persisted.
    // findByIdAndUpdate with plain objects can drop nested subdocument fields in arrays.
    const doc = await DamageReport.findById(id);
    if (!doc) {
      const response = NextResponse.json(
        { success: false, error: 'Damage report not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, request);
    }

    const { _id: _omitId, __v: _omitV, ...updatePayload } = body as any;
    Object.keys(updatePayload).forEach((key) => {
      if (key === 'workflowSteps') {
        doc.workflowSteps = updatePayload.workflowSteps;
        doc.markModified('workflowSteps');
      } else if (key === 'reportDate' && updatePayload.reportDate) {
        doc.reportDate = new Date(updatePayload.reportDate);
      } else if (Object.prototype.hasOwnProperty.call(updatePayload, key)) {
        (doc as any).set(key, updatePayload[key]);
      }
    });

    await doc.save({ validateBeforeSave: true });
    const damageReport = doc.toObject ? doc.toObject() : (doc as any);

    const metrics = calculateMetrics(damageReport);

    const response = NextResponse.json({
      success: true,
      data: {
        damageReport: {
          ...damageReport,
          _id: damageReport._id.toString(),
          id: damageReport._id.toString(),
          ...metrics,
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

    // Update adjuster's assignedReports if there was one
    if (damageReport.assignedAdjuster) {
      try {
        await Adjuster.findOneAndUpdate(
          { adjusterId: damageReport.assignedAdjuster.adjusterId },
          {
            $pull: { assignedReports: { reportId: id } },
            $inc: { currentActiveReports: -1 },
          }
        );
      } catch (adjErr) {
        console.error('Error updating adjuster after report deletion:', adjErr);
      }
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
