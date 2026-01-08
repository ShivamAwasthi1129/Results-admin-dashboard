import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VolunteerTeam from '@/models/VolunteerTeam';
import Volunteer from '@/models/Volunteer';
import User from '@/models/User';
import { verifyAuth, canPerform } from '@/lib/auth';

// GET - List all teams
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
    const status = searchParams.get('status') || '';

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    let teams = await VolunteerTeam.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Manually populate lead and members (since userId is stored as String, not ObjectId)
    for (const team of teams) {
      if (team.leadId) {
        const lead = await Volunteer.findById(team.leadId).lean();
        if (lead && (lead as any).userId) {
          const leadUser = await User.findById((lead as any).userId)
            .select('firstName lastName name email phone')
            .lean();
          (lead as any).userId = leadUser || { firstName: '', lastName: '', name: 'Unknown', email: '', phone: '' };
        }
        (team as any).lead = lead;
      }
      
      if (team.memberIds && team.memberIds.length > 0) {
        const members = await Volunteer.find({ _id: { $in: team.memberIds } }).lean();
        // Manually populate userId for each member
        for (const member of members) {
          if ((member as any).userId) {
            const memberUser = await User.findById((member as any).userId)
              .select('firstName lastName name email phone')
              .lean();
            (member as any).userId = memberUser || { firstName: '', lastName: '', name: 'Unknown', email: '', phone: '' };
          }
        }
        (team as any).members = members;
      }
    }

    // Filter by search if needed
    let filteredTeams = teams;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTeams = teams.filter((t: any) => 
        (t.teamId && t.teamId.toLowerCase().includes(searchLower)) ||
        (t.name && t.name.toLowerCase().includes(searchLower)) ||
        (t.specialization && t.specialization.toLowerCase().includes(searchLower)) ||
        (t.lead?.userId?.name && t.lead.userId.name.toLowerCase().includes(searchLower))
      );
    }

    const total = await VolunteerTeam.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        teams: filteredTeams,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + teams.length < total,
        },
      },
    });
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new team
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

    // Validate lead exists
    const lead = await Volunteer.findById(body.leadId);
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Team lead not found' },
        { status: 400 }
      );
    }

    // Validate members exist
    if (body.memberIds && body.memberIds.length > 0) {
      const members = await Volunteer.find({ _id: { $in: body.memberIds } });
      if (members.length !== body.memberIds.length) {
        return NextResponse.json(
          { success: false, error: 'One or more members not found' },
          { status: 400 }
        );
      }
    }

    // Ensure lead is in memberIds
    const memberIds = body.memberIds || [];
    if (!memberIds.includes(body.leadId)) {
      memberIds.push(body.leadId);
    }

    // Create team
    const team = await VolunteerTeam.create({
      name: body.name,
      description: body.description,
      leadId: body.leadId,
      memberIds: memberIds,
      specialization: body.specialization,
      status: body.status || 'active',
    });

    // Update volunteers with teamId
    await Volunteer.updateMany(
      { _id: { $in: memberIds } },
      { $set: { teamId: team._id.toString() } }
    );

    const populatedTeam = await VolunteerTeam.findById(team._id).lean();
    
    // Manually populate lead and members (since userId is stored as String)
    let leadData = null;
    if (team.leadId) {
      const lead = await Volunteer.findById(team.leadId).lean();
      if (lead && (lead as any).userId) {
        const leadUser = await User.findById((lead as any).userId)
          .select('firstName lastName name email phone')
          .lean();
        (lead as any).userId = leadUser || { firstName: '', lastName: '', name: 'Unknown', email: '', phone: '' };
      }
      leadData = lead;
    }
    
    let membersData: any[] = [];
    if (team.memberIds && team.memberIds.length > 0) {
      const members = await Volunteer.find({ _id: { $in: team.memberIds } }).lean();
      for (const member of members) {
        if ((member as any).userId) {
          const memberUser = await User.findById((member as any).userId)
            .select('firstName lastName name email phone')
            .lean();
          (member as any).userId = memberUser || { firstName: '', lastName: '', name: 'Unknown', email: '', phone: '' };
        }
      }
      membersData = members;
    }

    return NextResponse.json({
      success: true,
      data: {
        team: {
          ...populatedTeam,
          lead: leadData,
          members: membersData,
        },
      },
      message: 'Team created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create team error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update team
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
        { success: false, error: 'Team ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const team = await VolunteerTeam.findById(id);

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // If lead is changing, validate new lead exists
    if (body.leadId && body.leadId !== team.leadId) {
      const newLead = await Volunteer.findById(body.leadId);
      if (!newLead) {
        return NextResponse.json(
          { success: false, error: 'New team lead not found' },
          { status: 400 }
        );
      }
    }

    // If members are changing, validate they exist
    if (body.memberIds && body.memberIds.length > 0) {
      const members = await Volunteer.find({ _id: { $in: body.memberIds } });
      if (members.length !== body.memberIds.length) {
        return NextResponse.json(
          { success: false, error: 'One or more members not found' },
          { status: 400 }
        );
      }
    }

    // Ensure lead is in memberIds
    const memberIds = body.memberIds || team.memberIds;
    const leadId = body.leadId || team.leadId;
    if (!memberIds.includes(leadId)) {
      memberIds.push(leadId);
    }

    // Get old member IDs to update their teamId
    const oldMemberIds = team.memberIds || [];

    // Update team
    const updateData: any = {
      name: body.name,
      description: body.description,
      leadId: leadId,
      memberIds: memberIds,
      specialization: body.specialization,
      status: body.status,
    };

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedTeam = await VolunteerTeam.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).lean();

    // Update volunteers' teamId
    // Remove teamId from old members who are no longer in the team
    const removedMembers = oldMemberIds.filter((id: string) => !memberIds.includes(id.toString()));
    await Volunteer.updateMany(
      { _id: { $in: removedMembers } },
      { $unset: { teamId: '' } }
    );

    // Add teamId to new members
    await Volunteer.updateMany(
      { _id: { $in: memberIds } },
      { $set: { teamId: id } }
    );

    // Manually populate lead and members (since userId is stored as String)
    let leadData = null;
    if (leadId) {
      const lead = await Volunteer.findById(leadId).lean();
      if (lead && (lead as any).userId) {
        const leadUser = await User.findById((lead as any).userId)
          .select('firstName lastName name email phone')
          .lean();
        (lead as any).userId = leadUser || { firstName: '', lastName: '', name: 'Unknown', email: '', phone: '' };
      }
      leadData = lead;
    }
    
    let membersData: any[] = [];
    if (memberIds && memberIds.length > 0) {
      const members = await Volunteer.find({ _id: { $in: memberIds } }).lean();
      for (const member of members) {
        if ((member as any).userId) {
          const memberUser = await User.findById((member as any).userId)
            .select('firstName lastName name email phone')
            .lean();
          (member as any).userId = memberUser || { firstName: '', lastName: '', name: 'Unknown', email: '', phone: '' };
        }
      }
      membersData = members;
    }

    return NextResponse.json({
      success: true,
      data: {
        team: {
          ...updatedTeam,
          lead: leadData,
          members: membersData,
        },
      },
      message: 'Team updated successfully'
    });

  } catch (error: any) {
    console.error('Update team error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete team
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
        { success: false, error: 'Team ID required' },
        { status: 400 }
      );
    }

    const team = await VolunteerTeam.findById(id);
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Remove teamId from all members
    if (team.memberIds && team.memberIds.length > 0) {
      await Volunteer.updateMany(
        { _id: { $in: team.memberIds } },
        { $unset: { teamId: '' } }
      );
    }

    // Delete team
    await VolunteerTeam.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete team error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

