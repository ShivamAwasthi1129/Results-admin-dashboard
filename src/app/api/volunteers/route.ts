import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Volunteer from '@/models/Volunteer';
import VolunteerTeam from '@/models/VolunteerTeam';
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const availability = searchParams.get('availability') || '';

    const query: Record<string, unknown> = {};
    if (availability) query.availability = availability;

    const skip = (page - 1) * limit;

    // First, update volunteers whose assignment periods have ended
    // Optimize: Only check if we have volunteers with on_mission status
    // This is done in background to avoid blocking the main query
    try {
      const now = new Date();
      const volunteersToUpdate = await Volunteer.find({
        availability: 'on_mission',
        assignedDisasters: { $exists: true, $ne: [] }
      }).select('_id assignedDisasters availability').lean();
      
      // Batch update instead of individual saves
      const updatePromises = volunteersToUpdate.map(async (vol: any) => {
        const hasActiveAssignments = vol.assignedDisasters?.some(
          (ad: any) => {
            const toDate = new Date(ad.toDate);
            const status = ad.status;
            return toDate > now && (status === 'assigned' || status === 'active');
          }
        );
        
        // If no active assignments, change status back to 'available'
        if (!hasActiveAssignments) {
          return Volunteer.findByIdAndUpdate(vol._id, { availability: 'available' }, { new: false });
        }
        return null;
      });
      
      // Don't await - let it run in background
      Promise.all(updatePromises).catch(err => {
        console.error('Background volunteer status update error:', err);
      });
    } catch (updateError) {
      // Don't fail the main request if status update fails
      console.error('Volunteer status update error:', updateError);
    }

    let volunteers = await Volunteer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Manually populate userId since it's stored as String, not ObjectId reference
    // Optimize: Batch fetch users and teams to reduce database queries
    const userIds = [...new Set(volunteers.map((v: any) => v.userId).filter(Boolean))];
    const teamIds = [...new Set(volunteers.map((v: any) => v.teamId).filter(Boolean))];
    
    // Batch fetch users
    const usersMap = new Map();
    if (userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds } })
        .select('firstName lastName name email phone status address')
        .lean();
      users.forEach((user: any) => {
        usersMap.set(user._id.toString(), user);
      });
    }
    
    // Batch fetch teams
    const teamsMap = new Map();
    if (teamIds.length > 0) {
      const teams = await VolunteerTeam.find({ _id: { $in: teamIds } })
        .select('_id teamId name specialization status')
        .lean();
      teams.forEach((team: any) => {
        teamsMap.set(team._id.toString(), team);
      });
    }
    
    // Batch fetch disasters for all assignments
    const disasterIds = new Set<string>();
    volunteers.forEach((v: any) => {
      if (v.assignedDisasters && Array.isArray(v.assignedDisasters)) {
        v.assignedDisasters.forEach((ad: any) => {
          if (ad.disasterId) disasterIds.add(ad.disasterId);
        });
      }
    });
    
    const disastersMap = new Map();
    if (disasterIds.size > 0) {
      const Disaster = (await import('@/models/Disaster')).default;
      const disasters = await Disaster.find({ _id: { $in: Array.from(disasterIds) } })
        .select('title type severity status')
        .lean();
      disasters.forEach((disaster: any) => {
        disastersMap.set(disaster._id.toString(), disaster);
      });
    }
    
    // Populate data from maps
    for (const volunteer of volunteers) {
      if ((volunteer as any).userId) {
        const userId = String((volunteer as any).userId);
        (volunteer as any).userId = usersMap.get(userId) || { firstName: '', lastName: '', name: 'Unknown', email: '', phone: '' };
      }
      
      // Populate team information
      if ((volunteer as any).teamId) {
        const teamId = String((volunteer as any).teamId);
        (volunteer as any).team = teamsMap.get(teamId) || null;
      } else {
        (volunteer as any).team = null;
      }
      
      // Populate assigned disasters
      if ((volunteer as any).assignedDisasters && Array.isArray((volunteer as any).assignedDisasters)) {
        for (const assignment of (volunteer as any).assignedDisasters) {
          if (assignment.disasterId) {
            const disasterId = String(assignment.disasterId);
            assignment.disaster = disastersMap.get(disasterId) || null;
          }
        }
      }
    }

    // Filter by search if needed
    let filteredVolunteers = volunteers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredVolunteers = volunteers.filter((v: any) => {
        const fullName = v.userId?.firstName && v.userId?.lastName 
          ? `${v.userId.firstName} ${v.userId.lastName}`.toLowerCase()
          : (v.userId?.name || '').toLowerCase();
        return (
          (v.volunteerId && v.volunteerId.toLowerCase().includes(searchLower)) ||
          (v.userId?.firstName && v.userId.firstName.toLowerCase().includes(searchLower)) ||
          (v.userId?.lastName && v.userId.lastName.toLowerCase().includes(searchLower)) ||
          fullName.includes(searchLower) ||
          (v.userId?.email && v.userId.email.toLowerCase().includes(searchLower)) ||
          (Array.isArray(v.skills) && v.skills.some((s: string) => s && s.toLowerCase().includes(searchLower))) ||
          (v.address?.city && v.address.city.toLowerCase().includes(searchLower)) ||
          (v.team?.name && v.team.name.toLowerCase().includes(searchLower))
        );
      });
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
  } catch (error: any) {
    console.error('Get volunteers error:', error);
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
    
    // Extract firstName and lastName - ensure they're not empty
    let firstName = '';
    let lastName = '';
    
    if (body.firstName) {
      firstName = String(body.firstName).trim();
    } else if (body.name) {
      const nameParts = String(body.name).trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    if (body.lastName) {
      lastName = String(body.lastName).trim();
    }
    
    // Ensure minimum length for validation
    if (firstName.length < 2) firstName = 'Unknown';
    if (lastName.length < 2) lastName = 'User';
    
    const email = String(body.email || '').toLowerCase().trim();
    const phone = body.phone ? String(body.phone).trim() : '';
    
    console.log('=== CREATING USER ===');
    console.log('User data:', { firstName, lastName, email, phone });
    
    const user = await User.create({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      password: hashedPassword,
      role: 'volunteer',
      status: 'active',
      address: body.address,
    });
    
    console.log('✅ User created successfully!');
    console.log('Created user:', {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      name: user.name
    });
    
    // Verify by fetching
    const verifyUser = await User.findById(user._id).lean();
    console.log('🔍 Verification from DB:', {
      firstName: verifyUser?.firstName,
      lastName: verifyUser?.lastName,
      email: verifyUser?.email,
      phone: verifyUser?.phone
    });
    console.log('=== END USER CREATION ===');

    // Create volunteer profile - ensure all form fields are saved
    const volunteer = await Volunteer.create({
      userId: user._id.toString(),
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      gender: body.gender,
      bloodGroup: body.bloodGroup,
      profileImage: body.profileImage || '',
      address: body.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
      },
      skills: body.skills || [],
      specializations: body.specializations || [],
      languages: body.languages || [],
      experience: body.experience || {
        years: 0,
        description: '',
      },
      availability: body.availability || 'available',
      availabilitySchedule: body.availabilitySchedule || {
        weekdays: true,
        weekends: true,
        nights: false,
        preferredShift: 'any',
      },
      preferredWorkAreas: body.preferredWorkAreas || [],
      willingToTravel: body.willingToTravel ?? true,
      maxTravelDistance: body.maxTravelDistance || 50,
      emergencyContact: body.emergencyContact || {
        name: '',
        phone: '',
        relation: '',
        email: '',
      },
      healthInfo: body.healthInfo || {
        medicalConditions: [],
        allergies: [],
        medications: [],
        physicallyFit: true,
      },
      hasOwnVehicle: body.hasOwnVehicle || false,
      vehicleType: body.vehicleType || 'none',
      vehicleNumber: body.vehicleNumber || '',
      status: body.status || 'active',
      teamId: body.teamId || undefined,
    });

    // Manually populate userId since it's stored as String
    const populatedVolunteer = await Volunteer.findById(volunteer._id).lean();
    if (populatedVolunteer && (populatedVolunteer as any).userId) {
      const user = await User.findById((populatedVolunteer as any).userId)
        .select('firstName lastName name email phone status')
        .lean();
      (populatedVolunteer as any).userId = user;
    }

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

    // Update volunteer profile - ensure all form fields are updated
    const updateData: any = {
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
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
      vehicleNumber: body.vehicleNumber,
      status: body.status,
      teamId: body.teamId,
      lastActiveAt: new Date(),
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Get the volunteer first to get userId before updating
    const existingVolunteer = await Volunteer.findById(id);
    if (!existingVolunteer) {
      return NextResponse.json(
        { success: false, error: 'Volunteer not found' },
        { status: 404 }
      );
    }

    // Get userId as string (it's stored as string in the schema)
    const userId = String(existingVolunteer.userId);
    
    // Update volunteer document
    const volunteer = await Volunteer.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).lean();
    
    // Manually populate userId since it's stored as String
    if (volunteer && (volunteer as any).userId) {
      const user = await User.findById((volunteer as any).userId)
        .select('firstName lastName name email phone status')
        .lean();
      (volunteer as any).userId = user;
    }
    
    console.log('=== USER UPDATE DEBUG ===');
    console.log('User ID to update:', userId);
    console.log('Request body keys:', Object.keys(body));
    console.log('Body fields:', { 
      firstName: body.firstName, 
      lastName: body.lastName, 
      email: body.email, 
      phone: body.phone 
    });
    
    // Always update user if these fields are present in body
    const updateUserData: any = {};
    
    // Handle firstName - ALWAYS update if present in body
    if (body.firstName !== undefined && body.firstName !== null) {
      const firstName = String(body.firstName).trim();
      // Ensure minimum 2 characters for validation
      updateUserData.firstName = firstName.length >= 2 ? firstName : (firstName || 'Unknown');
      console.log('Setting firstName:', updateUserData.firstName);
    }
    
    // Handle lastName - ALWAYS update if present in body
    if (body.lastName !== undefined && body.lastName !== null) {
      const lastName = String(body.lastName).trim();
      // Ensure minimum 2 characters for validation
      updateUserData.lastName = lastName.length >= 2 ? lastName : (lastName || 'User');
      console.log('Setting lastName:', updateUserData.lastName);
    }
    
    // Handle name (derived from firstName/lastName or from body.name)
    if (body.firstName !== undefined || body.lastName !== undefined || body.name !== undefined) {
      const firstName = body.firstName !== undefined 
        ? String(body.firstName).trim() 
        : (body.name ? String(body.name).split(' ')[0].trim() : '');
      const lastName = body.lastName !== undefined 
        ? String(body.lastName).trim() 
        : (body.name ? String(body.name).split(' ').slice(1).join(' ').trim() : '');
      updateUserData.name = `${firstName || ''} ${lastName || ''}`.trim() || body.email || 'Unknown User';
      console.log('Setting name:', updateUserData.name);
    }
    
    // Handle email - ALWAYS update if present in body
    if (body.email !== undefined && body.email !== null) {
      updateUserData.email = String(body.email).toLowerCase().trim();
      console.log('Setting email:', updateUserData.email);
    }
    
    // Handle phone - ALWAYS update if present in body
    if (body.phone !== undefined && body.phone !== null) {
      updateUserData.phone = String(body.phone).trim() || '';
      console.log('Setting phone:', updateUserData.phone);
    }
    
    // Handle address
    if (body.address) {
      updateUserData.address = body.address;
    }
    
    console.log('Final updateUserData:', updateUserData);
    
    // Update user if we have any fields to update
    if (Object.keys(updateUserData).length > 0) {
      try {
        const updatedUser = await User.findByIdAndUpdate(
          userId, 
          { $set: updateUserData },
          { new: true, runValidators: true }
        );
        
        if (updatedUser) {
          console.log('✅ User updated successfully!');
          console.log('Updated fields:', {
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phone: updatedUser.phone,
            name: updatedUser.name
          });
          
          // Verify by fetching again
          const verifyUser = await User.findById(userId).lean();
          console.log('🔍 Verification from DB:', {
            firstName: verifyUser?.firstName,
            lastName: verifyUser?.lastName,
            email: verifyUser?.email,
            phone: verifyUser?.phone
          });
        } else {
          console.error('❌ Failed to update user - findByIdAndUpdate returned null');
          console.error('User ID used:', userId);
        }
      } catch (updateError: any) {
        console.error('❌ Error updating user:', updateError.message);
        console.error('Full error:', updateError);
      }
    } else {
      console.log('⚠️ No user fields to update');
    }
    console.log('=== END USER UPDATE DEBUG ===');

    // Manually populate userId since it's stored as String
    const updatedVolunteer = await Volunteer.findById(id).lean();
    if (updatedVolunteer && (updatedVolunteer as any).userId) {
      const user = await User.findById((updatedVolunteer as any).userId)
        .select('firstName lastName name email phone status')
        .lean();
      (updatedVolunteer as any).userId = user;
    }

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
