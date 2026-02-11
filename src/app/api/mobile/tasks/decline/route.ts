import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Volunteer from '@/models/Volunteer';
import Disaster from '@/models/Disaster';
import { verifyAuth } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * POST /api/mobile/tasks/decline
 * Volunteer declines an assigned task. Sets assignment status to 'cancelled'.
 * Optionally updates disaster's assignedVolunteers entry to 'removed' so admin sees it.
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
    if (assignment.status === 'cancelled') {
      return NextResponse.json({
        success: true,
        message: 'Task already declined',
        data: { disasterId, status: 'cancelled' },
      });
    }
    if (assignment.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Completed task cannot be declined' },
        { status: 400 }
      );
    }

    assignment.status = 'cancelled';
    await volunteer.save();

    const volunteerId = (volunteer as any)._id;
    const disaster = await Disaster.findById(disasterId);
    if (disaster && (disaster as any).assignedVolunteers?.length) {
      const av = (disaster as any).assignedVolunteers.find(
        (v: any) => v.volunteerId?.toString() === volunteerId?.toString()
      );
      if (av) av.status = 'removed';
      await disaster.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Task declined successfully',
      data: { disasterId, status: 'cancelled' },
    });
  } catch (error) {
    console.error('Mobile tasks decline error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
