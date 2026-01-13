import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Disaster from '@/models/Disaster';
// Import Volunteer model to ensure schema is registered before populate
import Volunteer from '@/models/Volunteer';
// Ensure model is registered by accessing it
void Volunteer;
import { verifyAuth, canPerform } from '@/lib/auth';

// GET - Get single disaster
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

    await connectDB();

    const disaster = await Disaster.findById(id)
      .populate('reportedBy', 'name email')
      .populate('updates.updatedBy', 'name')
      .populate({
        path: 'assignedVolunteers.volunteerId',
        select: 'volunteerId userId',
        populate: {
          path: 'userId',
          select: 'firstName lastName name email',
        },
      });

    if (!disaster) {
      return NextResponse.json(
        { success: false, error: 'Disaster not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { disaster },
    });
  } catch (error) {
    console.error('Get disaster error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update disaster
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

    if (!canPerform(tokenPayload.role, 'editDisaster')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const disaster = await Disaster.findById(id);

    if (!disaster) {
      return NextResponse.json(
        { success: false, error: 'Disaster not found' },
        { status: 404 }
      );
    }

    // Update fields
    const updateFields = [
      'title', 'description', 'type', 'severity', 'status',
      'affectedArea', 'affectedPopulation'
    ];

    updateFields.forEach((field) => {
      if (body[field] !== undefined) {
        (disaster as any)[field] = body[field];
      }
    });

    if (body.location) {
      // Handle coordinates - convert from {lat, lng} to [lng, lat] if needed
      let coordinates = body.location.coordinates || disaster.location.coordinates;
      if (coordinates && !Array.isArray(coordinates)) {
        // Convert {lat, lng} to [lng, lat] (GeoJSON format)
        if (coordinates.lat !== undefined && coordinates.lng !== undefined) {
          coordinates = [coordinates.lng, coordinates.lat];
        }
      }
      
      disaster.location = {
        type: 'Point',
        coordinates: coordinates,
        address: body.location.address !== undefined ? body.location.address : disaster.location.address,
        city: body.location.city !== undefined ? body.location.city : disaster.location.city,
        state: body.location.state !== undefined ? body.location.state : disaster.location.state,
        country: body.location.country !== undefined ? (body.location.country || 'USA') : disaster.location.country,
      };
    }

    if (body.casualties) {
      disaster.casualties = { ...disaster.casualties, ...body.casualties };
    }

    if (body.resources) {
      disaster.resources = { ...disaster.resources, ...body.resources };
    }

    // Add update log
    if (body.updateMessage) {
      disaster.updates.push({
        message: body.updateMessage,
        updatedBy: tokenPayload.userId,
        updatedAt: new Date(),
      });
    }

    // Mark as resolved if status changed to resolved
    if (body.status === 'resolved' && disaster.status !== 'resolved') {
      disaster.resolvedAt = new Date();
    }

    await disaster.save();

    return NextResponse.json({
      success: true,
      data: { disaster },
      message: 'Disaster updated successfully',
    });
  } catch (error) {
    console.error('Update disaster error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete disaster
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

    if (!canPerform(tokenPayload.role, 'deleteDisaster')) {
      return NextResponse.json(
        { success: false, error: 'Only Super Admin can delete disasters' },
        { status: 403 }
      );
    }

    await connectDB();

    // Find the disaster first to get assigned volunteers
    const disaster = await Disaster.findById(id);

    if (!disaster) {
      return NextResponse.json(
        { success: false, error: 'Disaster not found' },
        { status: 404 }
      );
    }

    // Get all assigned volunteer IDs before deleting
    const assignedVolunteerIds: string[] = [];
    if (disaster.assignedVolunteers && Array.isArray(disaster.assignedVolunteers)) {
      (disaster.assignedVolunteers as any[]).forEach((av: any) => {
        const volId = av.volunteerId;
        if (volId) {
          const volunteerIdStr = typeof volId === 'string' 
            ? volId 
            : (typeof volId === 'object' && volId?._id ? volId._id.toString() : '');
          if (volunteerIdStr) {
            assignedVolunteerIds.push(volunteerIdStr);
          }
        }
      });
    }

    // Update all assigned volunteers - remove this disaster from their assignedDisasters
    if (assignedVolunteerIds.length > 0) {
      const volunteers = await Volunteer.find({ _id: { $in: assignedVolunteerIds } });
      
      for (const volunteer of volunteers) {
        const volunteerDoc = volunteer as any;
        
        // Remove this disaster from volunteer's assignedDisasters
        if (volunteerDoc.assignedDisasters && Array.isArray(volunteerDoc.assignedDisasters)) {
          const beforeLength = volunteerDoc.assignedDisasters.length;
          volunteerDoc.assignedDisasters = volunteerDoc.assignedDisasters.filter(
            (ad: any) => ad.disasterId?.toString() !== id
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
      }
    }

    // Now delete the disaster
    await Disaster.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Disaster deleted successfully. All assigned volunteers have been updated.',
      data: {
        removedVolunteersCount: assignedVolunteerIds.length,
      },
    });
  } catch (error) {
    console.error('Delete disaster error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

