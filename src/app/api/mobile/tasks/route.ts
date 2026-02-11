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
 * GET /api/mobile/tasks
 * Returns task summary (active count, completed count, response rating) and assigned tasks list for the logged-in volunteer.
 * Auth: Bearer token (volunteer from mobile login).
 */
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload || tokenPayload.role !== 'volunteer') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
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

    const now = new Date();
    const assignments = (volunteer as any).assignedDisasters || [];
    const activeTasks = assignments.filter(
      (a: any) =>
        new Date(a.toDate) >= now &&
        (a.status === 'assigned' || a.status === 'active')
    );
    const completedTasks = assignments.filter(
      (a: any) => a.status === 'completed'
    );
    const activeTaskCount = activeTasks.length;
    const completedTaskCount = completedTasks.length;
    const responseRating = getValue((volunteer as any).rating, 0);
    const ratingDisplay = responseRating ? `${Number(responseRating).toFixed(1)}/5` : '0/5';

    const disasterIds = activeTasks
      .map((a: any) => a.disasterId)
      .filter(Boolean)
      .map((id: any) => (typeof id === 'string' ? id : id?.toString?.() ?? ''))
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id));

    const disasters = await Disaster.find({ _id: { $in: disasterIds.map((id: string) => new mongoose.Types.ObjectId(id)) } })
      .select('title description severity status')
      .lean();
    const disasterMap = new Map(disasters.map((d: any) => [d._id.toString(), d]));

    const tasks = activeTasks.map((a: any) => {
      const did = typeof a.disasterId === 'object' ? (a.disasterId as any)?.toString?.() : String(a.disasterId ?? '');
      const disaster = disasterMap.get(did);
      const severity = disaster?.severity || 'high';
      const priority = severity === 'critical' ? 'Critical' : severity === 'high' ? 'High' : severity === 'medium' ? 'Medium' : 'Low';
      return {
        taskId: did,
        assignmentId: did,
        title: getValue(disaster?.title, 'Task'),
        description: getValue(disaster?.description, 'New situation reported close to your location.'),
        priority,
        status: a.status,
        thumbnailImageUrl: null,
        fromDate: a.fromDate?.toISOString?.() ?? a.fromDate,
        toDate: a.toDate?.toISOString?.() ?? a.toDate,
        assignedAt: a.assignedAt?.toISOString?.() ?? a.assignedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          activeTaskCount,
          completedTaskCount,
          responseRating: ratingDisplay,
          responseRatingValue: responseRating,
        },
        tasks,
      },
    });
  } catch (error) {
    console.error('Mobile tasks GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
