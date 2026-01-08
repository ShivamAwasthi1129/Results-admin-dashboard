import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Volunteer from '@/models/Volunteer';
import Disaster from '@/models/Disaster';
import { verifyAuth, canPerform } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageVolunteers')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const params = await context.params;
    const { id: volunteerId } = params;
    const { disasterId, fromDate, toDate } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(volunteerId) || !mongoose.Types.ObjectId.isValid(disasterId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Volunteer ID or Disaster ID' },
        { status: 400 }
      );
    }

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: 'From date and To date are required' },
        { status: 400 }
      );
    }

    if (new Date(toDate) < new Date(fromDate)) {
      return NextResponse.json(
        { success: false, error: 'To date must be after from date' },
        { status: 400 }
      );
    }

    const volunteer = await Volunteer.findById(volunteerId);
    const disaster = await Disaster.findById(disasterId);

    if (!volunteer) {
      return NextResponse.json(
        { success: false, error: 'Volunteer not found' },
        { status: 404 }
      );
    }
    if (!disaster) {
      return NextResponse.json(
        { success: false, error: 'Disaster not found' },
        { status: 404 }
      );
    }

    // Check if volunteer is already assigned to this disaster
    const isAlreadyAssigned = volunteer.assignedDisasters?.some(
      (assignment: any) => assignment.disasterId.toString() === disasterId
    );

    if (isAlreadyAssigned) {
      return NextResponse.json(
        { success: false, error: 'Volunteer already assigned to this disaster' },
        { status: 409 }
      );
    }

    // Check if volunteer is on mission (has active assignments)
    const volunteerDoc = volunteer as any;
    const now = new Date();
    const hasActiveAssignments = volunteerDoc.assignedDisasters?.some(
      (ad: any) => {
        const toDate = new Date(ad.toDate);
        const status = ad.status;
        return toDate > now && (status === 'assigned' || status === 'active');
      }
    );

    if (volunteerDoc.availability === 'on_mission' || hasActiveAssignments) {
      return NextResponse.json(
        { success: false, error: 'Volunteer is currently on mission and cannot be assigned to another disaster until their current assignment period ends' },
        { status: 400 }
      );
    }

    // Add assignment to volunteer
    volunteer.assignedDisasters = volunteer.assignedDisasters || [];
    volunteer.assignedDisasters.push({
      disasterId: new mongoose.Types.ObjectId(disasterId),
      assignedBy: new mongoose.Types.ObjectId(tokenPayload.userId),
      assignedAt: new Date(),
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      status: 'assigned',
    } as any);

    // Change volunteer availability to 'on_mission'
    volunteerDoc.availability = 'on_mission';

    // Add assignment to disaster
    const disasterDoc = disaster as any;
    disasterDoc.assignedVolunteers = disasterDoc.assignedVolunteers || [];
    
    // Check if volunteer is already assigned to this disaster
    const isAlreadyAssignedInDisaster = disasterDoc.assignedVolunteers.some(
      (av: any) => av.volunteerId?.toString() === volunteerId
    );
    
    if (!isAlreadyAssignedInDisaster) {
      disasterDoc.assignedVolunteers.push({
        volunteerId: new mongoose.Types.ObjectId(volunteerId),
        assignedBy: new mongoose.Types.ObjectId(tokenPayload.userId),
        assignedAt: new Date(),
        status: 'assigned', // Use 'assigned' instead of 'pending' to match schema enum
      });
    }

    await volunteer.save();
    await disaster.save();

    // Populate disaster data for response
    await volunteer.populate({
      path: 'assignedDisasters.disasterId',
      select: 'title type severity status'
    });

    return NextResponse.json({
      success: true,
      message: 'Disaster assigned to volunteer successfully',
      data: { volunteer, disaster },
    });
  } catch (error) {
    console.error('Assign disaster to volunteer error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

