import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Volunteer from '@/models/Volunteer';
import User from '@/models/User';
import { verifyAuth, canPerform, hashPassword } from '@/lib/auth';

// GET - List all volunteers
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'viewVolunteers')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const availability = searchParams.get('availability') || '';

    const query: Record<string, unknown> = {};
    if (availability) query.availability = availability;

    const skip = (page - 1) * limit;

    const volunteers = await Volunteer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email phone status address');

    // Filter by search if needed
    let filteredVolunteers = volunteers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredVolunteers = volunteers.filter((v: any) => 
        (v.volunteerId && v.volunteerId.toLowerCase().includes(searchLower)) ||
        (v.userId?.name && v.userId.name.toLowerCase().includes(searchLower)) ||
        (v.userId?.email && v.userId.email.toLowerCase().includes(searchLower)) ||
        (Array.isArray(v.skills) && v.skills.some((s: string) => s && s.toLowerCase().includes(searchLower))) ||
        (v.address?.city && v.address.city.toLowerCase().includes(searchLower))
      );
    }

    const total = await Volunteer.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        volunteers: filteredVolunteers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + volunteers.length < total,
        },
      },
    });
  } catch (error) {
    console.error('Get volunteers error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new volunteer with user account
export async function POST(request: NextRequest) {
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
    const body = await request.json();

    // Check if email already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Create user account first
    const hashedPassword = await hashPassword(body.password || 'volunteer123');
    const user = await User.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      password: hashedPassword,
      role: 'volunteer',
      status: 'active',
      address: body.address,
    });

    // Create volunteer profile
    const volunteer = await Volunteer.create({
      userId: user._id,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      bloodGroup: body.bloodGroup,
      profileImage: body.profileImage,
      address: body.address,
      skills: body.skills || [],
      specializations: body.specializations || [],
      languages: body.languages || [],
      experience: body.experience,
      availability: body.availability || 'available',
      availabilitySchedule: body.availabilitySchedule,
      preferredWorkAreas: body.preferredWorkAreas || [],
      willingToTravel: body.willingToTravel ?? true,
      maxTravelDistance: body.maxTravelDistance || 50,
      emergencyContact: body.emergencyContact,
      healthInfo: body.healthInfo,
      hasOwnVehicle: body.hasOwnVehicle || false,
      vehicleType: body.vehicleType,
      status: body.status || 'active',
    });

    const populatedVolunteer = await Volunteer.findById(volunteer._id)
      .populate('userId', 'name email phone status');

    return NextResponse.json({
      success: true,
      data: { volunteer: populatedVolunteer },
      message: 'Volunteer account created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create volunteer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update volunteer
export async function PUT(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Volunteer ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Update volunteer profile
    const volunteer = await Volunteer.findByIdAndUpdate(
      id,
      {
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
        bloodGroup: body.bloodGroup,
        profileImage: body.profileImage,
        address: body.address,
        skills: body.skills || [],
        specializations: body.specializations || [],
        languages: body.languages || [],
        experience: body.experience,
        availability: body.availability,
        availabilitySchedule: body.availabilitySchedule,
        preferredWorkAreas: body.preferredWorkAreas || [],
        willingToTravel: body.willingToTravel,
        maxTravelDistance: body.maxTravelDistance,
        emergencyContact: body.emergencyContact,
        healthInfo: body.healthInfo,
        hasOwnVehicle: body.hasOwnVehicle,
        vehicleType: body.vehicleType,
        status: body.status,
        lastActiveAt: new Date(),
      },
      { new: true }
    ).populate('userId', 'name email phone status');

    if (!volunteer) {
      return NextResponse.json(
        { success: false, error: 'Volunteer not found' },
        { status: 404 }
      );
    }

    // Update user info if provided
    if (body.name || body.phone) {
      await User.findByIdAndUpdate(volunteer.userId, {
        ...(body.name && { name: body.name }),
        ...(body.phone && { phone: body.phone }),
        ...(body.address && { address: body.address }),
      });
    }

    const updatedVolunteer = await Volunteer.findById(id)
      .populate('userId', 'name email phone status');

    return NextResponse.json({
      success: true,
      data: { volunteer: updatedVolunteer },
      message: 'Volunteer updated successfully'
    });

  } catch (error: any) {
    console.error('Update volunteer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete volunteer
export async function DELETE(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Volunteer ID required' },
        { status: 400 }
      );
    }

    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      return NextResponse.json(
        { success: false, error: 'Volunteer not found' },
        { status: 404 }
      );
    }

    // Delete volunteer profile
    await Volunteer.findByIdAndDelete(id);

    // Optionally deactivate user account
    await User.findByIdAndUpdate(volunteer.userId, { status: 'inactive' });

    return NextResponse.json({
      success: true,
      message: 'Volunteer deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete volunteer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
