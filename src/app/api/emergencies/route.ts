import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Emergency from '@/models/Emergency';
import { verifyAuth, canPerform } from '@/lib/auth';

// GET - List all emergencies
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'requestedBy.name': { $regex: search, $options: 'i' } },
      ];
    }

    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;

    const [emergencies, total] = await Promise.all([
      Emergency.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('disasterId', 'title')
        .populate('assignedTo', 'userId'),
      Emergency.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        emergencies,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + emergencies.length < total,
        },
      },
    });
  } catch (error) {
    console.error('Get emergencies error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new emergency
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'createEmergency')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const {
      title,
      description,
      type,
      priority,
      disasterId,
      location,
      requestedBy,
      numberOfPeople,
      specialRequirements,
    } = body;

    const emergency = await Emergency.create({
      title,
      description,
      type,
      priority,
      status: 'pending',
      disasterId,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address,
      },
      requestedBy,
      numberOfPeople: numberOfPeople || 1,
      specialRequirements: specialRequirements || [],
    });

    return NextResponse.json({
      success: true,
      data: { emergency },
      message: 'Emergency created successfully',
    });
  } catch (error) {
    console.error('Create emergency error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

