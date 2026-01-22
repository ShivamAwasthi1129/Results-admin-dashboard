import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, canPerform } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import DamageReport from '@/models/DamageReport';

// GET - Get single damage report
export async function GET(
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

    // Check permission
    if (!canPerform(tokenPayload.role, 'viewIncidents')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const damageReport = await DamageReport.findById(id).lean();

    if (!damageReport) {
      return NextResponse.json(
        { success: false, error: 'Damage report not found' },
        { status: 404 }
      );
    }

    // Calculate funding metrics
    const totalFunding = damageReport.fundingSources?.reduce((sum: number, source: any) => sum + (source.amount || 0), 0) || 0;
    const fundingPercentage = damageReport.estimatedCost > 0 
      ? Math.round((totalFunding / damageReport.estimatedCost) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        damageReport: {
          ...damageReport,
          _id: damageReport._id.toString(),
          id: damageReport._id.toString(),
          totalFunding,
          fundingPercentage,
          remainingFunding: Math.max(0, (damageReport.estimatedCost || 0) - totalFunding),
        },
      },
    });
  } catch (error: any) {
    console.error('Get damage report error:', error);
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

// PUT - Update damage report
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

    // Check permission
    if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    // Get existing report to track milestone changes
    const existingReport = await DamageReport.findById(id).lean();
    if (!existingReport) {
      return NextResponse.json(
        { success: false, error: 'Damage report not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // If report number is being updated, check for duplicates
    if (body.reportNumber) {
      const duplicateReport = await DamageReport.findOne({ 
        reportNumber: body.reportNumber.toUpperCase(),
        _id: { $ne: id }
      });
      if (duplicateReport) {
        return NextResponse.json(
          { success: false, error: 'Damage report with this report number already exists' },
          { status: 400 }
        );
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

    const damageReport = await DamageReport.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!damageReport) {
      return NextResponse.json(
        { success: false, error: 'Damage report not found' },
        { status: 404 }
      );
    }

    // Calculate funding metrics
    const totalFunding = damageReport.fundingSources?.reduce((sum: number, source: any) => sum + (source.amount || 0), 0) || 0;
    const fundingPercentage = damageReport.estimatedCost > 0 
      ? Math.round((totalFunding / damageReport.estimatedCost) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        damageReport: {
          ...damageReport,
          _id: damageReport._id.toString(),
          id: damageReport._id.toString(),
          totalFunding,
          fundingPercentage,
          remainingFunding: Math.max(0, (damageReport.estimatedCost || 0) - totalFunding),
        },
      },
      message: 'Damage report updated successfully',
    });
  } catch (error: any) {
    console.error('Update damage report error:', error);
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

// DELETE - Delete damage report
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

    // Only super_admin can delete damage reports
    if (tokenPayload.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Only super admin can delete damage reports.' },
        { status: 403 }
      );
    }

    await connectDB();

    const damageReport = await DamageReport.findByIdAndDelete(id);

    if (!damageReport) {
      return NextResponse.json(
        { success: false, error: 'Damage report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Damage report deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete damage report error:', error);
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
