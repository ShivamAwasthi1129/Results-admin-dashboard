import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Disaster from '@/models/Disaster';
// Import Volunteer model to ensure schema is registered before populate
import Volunteer from '@/models/Volunteer';
// Ensure model is registered by accessing it
void Volunteer;
import { verifyAuth, canPerform } from '@/lib/auth';

// GET - List all disasters
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      await connectDB();
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const severity = searchParams.get('severity') || '';

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.state': { $regex: search, $options: 'i' } },
      ];
    }

    if (type) query.type = type;
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const skip = (page - 1) * limit;

    const [disasters, total] = await Promise.all([
      Disaster.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reportedBy', 'name email')
        .populate({
          path: 'assignedVolunteers.volunteerId',
          select: 'volunteerId userId',
          populate: {
            path: 'userId',
            select: 'firstName lastName name email phone',
          },
        }),
      Disaster.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        disasters,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + disasters.length < total,
        },
      },
    });
  } catch (error: any) {
    console.error('Get disasters error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create new disaster
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'createDisaster')) {
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
      severity,
      status,
      location,
      affectedArea,
      affectedPopulation,
      startedAt,
    } = body;

    const disaster = await Disaster.create({
      title,
      description,
      type,
      severity,
      status: status || 'active',
      location: {
        type: 'Point',
        coordinates: location.coordinates ? (Array.isArray(location.coordinates) ? location.coordinates : [location.coordinates.lng, location.coordinates.lat]) : undefined,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country || 'USA',
      },
      affectedArea: affectedArea || 0,
      affectedPopulation: affectedPopulation || 0,
      reportedBy: tokenPayload.userId,
      reportedAt: new Date(),
      startedAt: startedAt ? new Date(startedAt) : new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { disaster },
      message: 'Disaster reported successfully',
    });
  } catch (error) {
    console.error('Create disaster error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

