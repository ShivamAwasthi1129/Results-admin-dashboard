import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, canPerform } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Disaster from '@/models/Disaster';
import Volunteer from '@/models/Volunteer';
import User from '@/models/User';

// GET - List all disasters from local database
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const severity = searchParams.get('severity') || '';

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.state': { $regex: search, $options: 'i' } },
      ];
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (severity) {
      query.severity = severity;
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Fetch disasters from database
    const disastersRaw = await Disaster.find(query)
      .populate({
        path: 'assignedVolunteers.volunteerId',
        model: 'Volunteer',
        select: 'volunteerId userId',
      })
      .populate({
        path: 'assignedVolunteers.assignedBy',
        model: 'User',
        select: 'firstName lastName name email',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Disaster.countDocuments(query);

    // Manually populate userId for volunteers since it's a string reference
    const disasters = await Promise.all(disastersRaw.map(async (disaster: any) => {
      if (disaster.assignedVolunteers && Array.isArray(disaster.assignedVolunteers)) {
        disaster.assignedVolunteers = await Promise.all(disaster.assignedVolunteers.map(async (av: any) => {
          if (av.volunteerId && av.volunteerId.userId) {
            const user = await User.findById(av.volunteerId.userId).select('firstName lastName name email phone').lean();
            if (user) {
              av.volunteerId.userId = user;
            }
          }
          return av;
        }));
      }
      return disaster;
    }));

    // Transform disasters to match expected format
    const transformedDisasters = disasters.map((disaster: any) => {
      // Handle coordinates - can be GeoJSON [lng, lat] or {lat, lng}
      let coordinates;
      if (disaster.location?.coordinates) {
        if (Array.isArray(disaster.location.coordinates)) {
          // GeoJSON format: [longitude, latitude]
          coordinates = {
            lat: disaster.location.coordinates[1],
            lng: disaster.location.coordinates[0],
          };
        } else if (typeof disaster.location.coordinates === 'object') {
          // Already in {lat, lng} format
          coordinates = disaster.location.coordinates;
        }
      }

      // Transform assignedVolunteers
      let assignedVolunteers = [];
      if (disaster.assignedVolunteers && Array.isArray(disaster.assignedVolunteers)) {
        assignedVolunteers = disaster.assignedVolunteers.map((av: any) => {
          const volunteer = av.volunteerId;
          return {
            volunteerId: {
              _id: volunteer?._id?.toString() || volunteer?.id?.toString() || '',
              volunteerId: volunteer?.volunteerId || '',
              userId: volunteer?.userId ? {
                firstName: volunteer.userId.firstName || '',
                lastName: volunteer.userId.lastName || '',
                name: volunteer.userId.name || `${volunteer.userId.firstName || ''} ${volunteer.userId.lastName || ''}`.trim() || 'Unknown',
                email: volunteer.userId.email || '',
                phone: volunteer.userId.phone || '',
              } : undefined,
            },
            assignedAt: av.assignedAt ? new Date(av.assignedAt).toISOString() : new Date().toISOString(),
            assignedBy: av.assignedBy ? {
              _id: av.assignedBy._id?.toString() || '',
              firstName: av.assignedBy.firstName || '',
              lastName: av.assignedBy.lastName || '',
              name: av.assignedBy.name || `${av.assignedBy.firstName || ''} ${av.assignedBy.lastName || ''}`.trim() || 'Unknown',
              email: av.assignedBy.email || '',
            } : undefined,
            status: av.status || 'assigned',
          };
        });
      }

      return {
        _id: disaster._id.toString(),
        id: disaster._id.toString(),
        title: disaster.title,
        description: disaster.description,
        type: disaster.type,
        severity: disaster.severity,
        status: disaster.status,
        location: {
          address: disaster.location?.address,
          city: disaster.location?.city,
          state: disaster.location?.state,
          country: disaster.location?.country || 'USA',
          coordinates: coordinates,
        },
        affectedArea: disaster.affectedArea,
        estimatedAffectedPeople: disaster.affectedPopulation || disaster.estimatedAffectedPeople,
        assignedVolunteers: assignedVolunteers,
        reportedBy: disaster.reportedBy,
        reportedAt: disaster.reportedAt,
        startedAt: disaster.startedAt,
        createdAt: disaster.createdAt,
        updatedAt: disaster.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        disasters: transformedDisasters,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
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

