import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Disaster from '@/models/Disaster';
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
      .populate('updates.updatedBy', 'name');

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
        (disaster as Record<string, unknown>)[field] = body[field];
      }
    });

    if (body.location) {
      disaster.location = {
        type: 'Point',
        coordinates: body.location.coordinates || disaster.location.coordinates,
        address: body.location.address || disaster.location.address,
        city: body.location.city || disaster.location.city,
        state: body.location.state || disaster.location.state,
        country: body.location.country || disaster.location.country,
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

    const disaster = await Disaster.findByIdAndDelete(id);

    if (!disaster) {
      return NextResponse.json(
        { success: false, error: 'Disaster not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Disaster deleted successfully',
    });
  } catch (error) {
    console.error('Delete disaster error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

