import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Volunteer from '@/models/Volunteer';
import Disaster from '@/models/Disaster';
import { verifyAuth } from '@/lib/auth';
import mongoose from 'mongoose';

function getValue<T>(v: T | null | undefined, def: T): T {
  return v !== null && v !== undefined ? v : def;
}

/**
 * GET /api/mobile/tasks/[disasterId]
 * Returns single task (disaster) detail for the logged-in volunteer. Only allowed if this disaster is assigned to them.
 * Auth: Bearer token (volunteer).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ disasterId: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload || tokenPayload.role !== 'volunteer') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { disasterId } = await context.params;
    if (!disasterId || !mongoose.Types.ObjectId.isValid(disasterId)) {
      return NextResponse.json(
        { success: false, error: 'Valid disasterId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const volunteer = await Volunteer.findOne({ userId: tokenPayload.userId }).lean();
    if (!volunteer) {
      return NextResponse.json(
        { success: false, error: 'Volunteer not found' },
        { status: 404 }
      );
    }

    const assignment = (volunteer as any).assignedDisasters?.find(
      (a: any) => String(a.disasterId) === disasterId
    );
    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Task not found or not assigned to you' },
        { status: 404 }
      );
    }

    const disaster = await Disaster.findById(disasterId).lean();
    if (!disaster) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const d = disaster as any;
    const severity = d.severity || 'high';
    const priority = severity === 'critical' ? 'Critical' : severity === 'high' ? 'High' : severity === 'medium' ? 'Medium' : 'Low';

    return NextResponse.json({
      success: true,
      data: {
        taskId: disasterId,
        title: getValue(d.title, 'Task'),
        description: getValue(d.description, ''),
        priority,
        status: assignment.status,
        thumbnailImageUrl: null,
        fromDate: assignment.fromDate?.toISOString?.() ?? assignment.fromDate,
        toDate: assignment.toDate?.toISOString?.() ?? assignment.toDate,
        assignedAt: assignment.assignedAt?.toISOString?.() ?? assignment.assignedAt,
        location: d.location,
        type: d.type,
        severity: d.severity,
      },
    });
  } catch (error) {
    console.error('Mobile task detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
