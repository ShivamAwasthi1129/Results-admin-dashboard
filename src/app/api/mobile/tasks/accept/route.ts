import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Volunteer from '@/models/Volunteer';
import { verifyAuth } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * POST /api/mobile/tasks/accept
 * Volunteer accepts an assigned task (disaster). Sets assignment status to 'active'.
 * Auth: Bearer token (volunteer).
 * Body: { disasterId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload || tokenPayload.role !== 'volunteer') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const disasterId = body?.disasterId ? String(body.disasterId).trim() : '';
    if (!disasterId || !mongoose.Types.ObjectId.isValid(disasterId)) {
      return NextResponse.json(
        { success: false, error: 'Valid disasterId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const volunteer = await Volunteer.findOne({ userId: tokenPayload.userId });
    if (!volunteer) {
      return NextResponse.json(
        { success: false, error: 'Volunteer not found' },
        { status: 404 }
      );
    }

    const assignments = (volunteer as any).assignedDisasters || [];
    const assignment = assignments.find(
      (a: any) => String(a.disasterId) === disasterId
    );
    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Task not found or not assigned to you' },
        { status: 404 }
      );
    }
    if (assignment.status === 'active') {
      return NextResponse.json({
        success: true,
        message: 'Task already accepted',
        data: { disasterId, status: 'active' },
      });
    }
    if (assignment.status === 'cancelled' || assignment.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Task cannot be accepted in current state' },
        { status: 400 }
      );
    }

    assignment.status = 'active';
    await volunteer.save();

    return NextResponse.json({
      success: true,
      message: 'Task accepted successfully',
      data: { disasterId, status: 'active' },
    });
  } catch (error) {
    console.error('Mobile tasks accept error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
