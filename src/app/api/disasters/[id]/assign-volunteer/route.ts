import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Disaster from '@/models/Disaster';
import Volunteer from '@/models/Volunteer';
import { verifyAuth, canPerform } from '@/lib/auth';

// POST - Assign volunteer to disaster
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    const { id: disasterId } = await params;

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'editDisaster')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { volunteerId, fromDate, toDate } = body;

    if (!volunteerId) {
      return NextResponse.json(
        { success: false, error: 'Volunteer ID is required' },
        { status: 400 }
      );
    }

    // Find disaster
    const disaster = await Disaster.findById(disasterId);
    if (!disaster) {
      return NextResponse.json(
        { success: false, error: 'Disaster not found' },
        { status: 404 }
      );
    }

    // Find volunteer
    const volunteer = await Volunteer.findById(volunteerId);
    if (!volunteer) {
      return NextResponse.json(
        { success: false, error: 'Volunteer not found' },
        { status: 404 }
      );
    }

    // Check if volunteer is already assigned to this disaster
    const existingAssignment = (disaster.assignedVolunteers as any[]).find(
      (v: any) => v.volunteerId?.toString() === volunteerId
    );

    if (existingAssignment) {
      return NextResponse.json(
        { success: false, error: 'Volunteer is already assigned to this disaster' },
        { status: 400 }
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

    // Add volunteer to disaster
    (disaster.assignedVolunteers as any[]).push({
      volunteerId: volunteerId,
      assignedAt: new Date(),
      assignedBy: tokenPayload.userId,
      status: 'assigned',
    });

    // Update volunteer's assignedDisasters (new schema with dates)
    const isAlreadyAssigned = volunteerDoc.assignedDisasters?.some(
      (ad: any) => ad.disasterId?.toString() === disasterId
    );
    if (!isAlreadyAssigned) {
      volunteerDoc.assignedDisasters = volunteerDoc.assignedDisasters || [];
      volunteerDoc.assignedDisasters.push({
        disasterId: disasterId,
        assignedAt: new Date(),
        assignedBy: tokenPayload.userId,
        fromDate: fromDate ? new Date(fromDate) : new Date(), // Use provided date or default to today
        toDate: toDate ? new Date(toDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Use provided date or default to 30 days from now
        status: 'assigned',
      });
      
      // Change volunteer availability to 'on_mission'
      volunteerDoc.availability = 'on_mission';
    }

    // Update resources count
    disaster.resources.volunteersDeployed = (disaster.assignedVolunteers as any[]).length;

    await Promise.all([
      disaster.save(),
      volunteer.save(),
    ]);

    // Populate volunteer details for response
    await disaster.populate({
      path: 'assignedVolunteers.volunteerId',
      select: 'volunteerId userId',
    });

    return NextResponse.json({
      success: true,
      data: { disaster },
      message: 'Volunteer assigned successfully',
    });
  } catch (error) {
    console.error('Assign volunteer error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove volunteer from disaster
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    const { id: disasterId } = await params;

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'editDisaster')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const volunteerId = searchParams.get('volunteerId');

    if (!volunteerId) {
      return NextResponse.json(
        { success: false, error: 'Volunteer ID is required' },
        { status: 400 }
      );
    }

    // Find disaster
    const disaster = await Disaster.findById(disasterId);
    if (!disaster) {
      return NextResponse.json(
        { success: false, error: 'Disaster not found' },
        { status: 404 }
      );
    }

    // Remove volunteer from disaster
    (disaster.assignedVolunteers as any[]) = (disaster.assignedVolunteers as any[]).filter(
      (v: any) => v.volunteerId?.toString() !== volunteerId
    );

    // Update volunteer's assignedDisasters (new schema)
    const volunteer = await Volunteer.findById(volunteerId);
    if (volunteer) {
      const volunteerDoc = volunteer as any;
      const beforeLength = (volunteerDoc.assignedDisasters || []).length;
      volunteerDoc.assignedDisasters = (volunteerDoc.assignedDisasters || []).filter(
        (ad: any) => ad.disasterId?.toString() !== disasterId
      );
      const afterLength = volunteerDoc.assignedDisasters.length;
      
      // Check if volunteer has any other active assignments
      const now = new Date();
      const hasActiveAssignments = volunteerDoc.assignedDisasters?.some(
        (ad: any) => {
          const toDate = new Date(ad.toDate);
          const status = ad.status;
          return toDate > now && (status === 'assigned' || status === 'active');
        }
      );
      
      // If no active assignments, change availability back to 'available'
      if (!hasActiveAssignments && volunteerDoc.availability === 'on_mission') {
        volunteerDoc.availability = 'available';
      }
      
      // Only save if there was a change
      if (beforeLength !== afterLength || volunteerDoc.isModified('availability')) {
        await volunteerDoc.save();
      }
    }

    // Update resources count
    disaster.resources.volunteersDeployed = (disaster.assignedVolunteers as any[]).length;

    await disaster.save();

    return NextResponse.json({
      success: true,
      data: { disaster },
      message: 'Volunteer removed successfully',
    });
  } catch (error) {
    console.error('Remove volunteer error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

