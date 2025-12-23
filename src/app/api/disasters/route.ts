import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Disaster from '@/models/Disaster';
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

    await connectDB();

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
        .populate('reportedBy', 'name email'),
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
  } catch (error) {
    console.error('Get disasters error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
        coordinates: location.coordinates,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country || 'India',
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

