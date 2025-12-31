import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Incident from '@/models/Incident';
import { verifyAuth, canPerform } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - List all incidents
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'viewIncidents')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // If ID is provided, return single incident
    if (id) {
      try {
        const incidentId = new mongoose.Types.ObjectId(id);
        const incident = await Incident.findById(incidentId).lean();
        
        if (!incident) {
          return NextResponse.json(
            { success: false, error: 'Incident not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            id: incident._id.toString(),
            ticketNumber: incident.ticketNumber,
            type: incident.type,
            title: incident.title,
            description: incident.description,
            priority: incident.priority,
            status: incident.status,
            reportedBy: incident.reportedBy,
            assignedTo: incident.assignedTo || 'Unassigned',
            attachments: incident.attachments || [],
            notes: incident.notes || [],
            timeline: incident.timeline || [],
            createdAt: incident.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: incident.updatedAt?.toISOString() || new Date().toISOString(),
          },
        });
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid incident ID format' },
          { status: 400 }
        );
      }
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const priority = searchParams.get('priority') || 'all';

    const query: any = {};

    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { 'reportedBy.name': { $regex: search, $options: 'i' } },
        { 'reportedBy.email': { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    if (priority && priority !== 'all') query.priority = priority;

    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Incident.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: incidents.map(incident => ({
        id: incident._id.toString(),
        ticketNumber: incident.ticketNumber,
        type: incident.type,
        title: incident.title,
        description: incident.description,
        priority: incident.priority,
        status: incident.status,
        reportedBy: incident.reportedBy,
        assignedTo: incident.assignedTo || 'Unassigned',
        attachments: incident.attachments || [],
        notes: incident.notes || [],
        timeline: incident.timeline || [],
        createdAt: incident.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: incident.updatedAt?.toISOString() || new Date().toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get incidents error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new incident
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageIncidents')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    // Validate required fields
    const missingFields: string[] = [];
    if (!body.type) missingFields.push('type');
    if (!body.title || !String(body.title).trim()) missingFields.push('title');
    if (!body.description || !String(body.description).trim()) missingFields.push('description');
    if (!body.reportedBy?.name || !String(body.reportedBy.name).trim()) missingFields.push('reportedBy.name');
    if (!body.reportedBy?.email || !String(body.reportedBy.email).trim()) missingFields.push('reportedBy.email');
    if (!body.reportedBy?.phone || !String(body.reportedBy.phone).trim()) missingFields.push('reportedBy.phone');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(body.reportedBy.email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Generate ticket number
    const year = new Date().getFullYear();
    const count = await Incident.countDocuments({});
    const ticketNumber = `TKT-${year}-${String(count + 1).padStart(5, '0')}`;

    const incidentData: any = {
      ticketNumber,
      type: body.type,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      priority: body.priority || 'low',
      status: body.status || 'open',
      reportedBy: {
        name: String(body.reportedBy.name).trim(),
        email: String(body.reportedBy.email).trim().toLowerCase(),
        phone: String(body.reportedBy.phone).trim(),
      },
      assignedTo: body.assignedTo || 'Unassigned',
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      notes: [],
      timeline: [{
        type: 'created',
        title: 'Incident Created',
        description: `Created by ${body.reportedBy.name}`,
        createdBy: tokenPayload.name || 'System',
        createdAt: new Date(),
      }],
    };

    const incident = await Incident.create(incidentData);

    return NextResponse.json({
      success: true,
      data: {
        id: incident._id.toString(),
        ticketNumber: incident.ticketNumber,
        type: incident.type,
        title: incident.title,
        description: incident.description,
        priority: incident.priority,
        status: incident.status,
        reportedBy: incident.reportedBy,
        assignedTo: incident.assignedTo || 'Unassigned',
        attachments: incident.attachments || [],
        notes: incident.notes || [],
        timeline: incident.timeline || [],
        createdAt: incident.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: incident.updatedAt?.toISOString() || new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create incident error:', error);
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

// PUT - Update incident
export async function PUT(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageIncidents')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Incident ID is required' },
        { status: 400 }
      );
    }

    let incidentId;
    try {
      incidentId = new mongoose.Types.ObjectId(body.id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid incident ID format' },
        { status: 400 }
      );
    }

    const incident = await Incident.findById(incidentId);

    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    const timelineUpdates: any[] = [];

    // Update basic fields
    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.description !== undefined) updateData.description = String(body.description).trim();
    if (body.type !== undefined) updateData.type = body.type;
    
    // Update priority with timeline
    if (body.priority !== undefined && body.priority !== incident.priority) {
      updateData.priority = body.priority;
      timelineUpdates.push({
        type: 'priority_changed',
        title: 'Priority Changed',
        description: `Changed to ${body.priority}`,
        createdBy: tokenPayload.name || 'System',
        createdAt: new Date(),
      });
    }
    
    // Update status with timeline
    if (body.status !== undefined && body.status !== incident.status) {
      updateData.status = body.status;
      timelineUpdates.push({
        type: 'status_updated',
        title: 'Status Updated',
        description: `Changed to ${body.status}`,
        createdBy: tokenPayload.name || 'System',
        createdAt: new Date(),
      });
    }
    
    // Update assigned to with timeline
    if (body.assignedTo !== undefined && body.assignedTo !== incident.assignedTo) {
      updateData.assignedTo = body.assignedTo || 'Unassigned';
      timelineUpdates.push({
        type: 'assigned',
        title: 'Assignment Updated',
        description: body.assignedTo ? `Assigned to ${body.assignedTo}` : 'Unassigned',
        createdBy: tokenPayload.name || 'System',
        createdAt: new Date(),
      });
    }

    // Update reported by info
    if (body.reportedBy !== undefined) {
      updateData.reportedBy = {
        name: body.reportedBy.name !== undefined ? String(body.reportedBy.name).trim() : incident.reportedBy.name,
        email: body.reportedBy.email !== undefined ? String(body.reportedBy.email).trim().toLowerCase() : incident.reportedBy.email,
        phone: body.reportedBy.phone !== undefined ? String(body.reportedBy.phone).trim() : incident.reportedBy.phone,
      };
    }

    if (body.attachments !== undefined) {
      updateData.attachments = Array.isArray(body.attachments) ? body.attachments : [];
    }

    // Prepare update operations
    const updateOps: any = {
      $set: {
        ...updateData,
        updatedAt: new Date(),
      },
    };

    // Add note if provided
    if (body.note && String(body.note).trim()) {
      const newNote = {
        content: String(body.note).trim(),
        createdBy: tokenPayload.name || 'System',
        createdAt: new Date(),
      };
      updateOps.$push = { notes: newNote };
      timelineUpdates.push({
        type: 'note_added',
        title: 'Note Added',
        description: newNote.content,
        createdBy: newNote.createdBy,
        createdAt: new Date(),
      });
    }

    // Add timeline updates
    if (timelineUpdates.length > 0) {
      if (updateOps.$push) {
        updateOps.$push.timeline = { $each: timelineUpdates };
      } else {
        updateOps.$push = { timeline: { $each: timelineUpdates } };
      }
    }

    if (Object.keys(updateData).length === 0 && !updateOps.$push) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Use collection directly for update
    const IncidentCollection = Incident.collection;
    const updateResult = await IncidentCollection.updateOne(
      { _id: incidentId },
      updateOps
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 }
      );
    }

    const updatedIncident = await Incident.findById(incidentId).lean();

    if (!updatedIncident) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedIncident._id.toString(),
        ticketNumber: updatedIncident.ticketNumber,
        type: updatedIncident.type,
        title: updatedIncident.title,
        description: updatedIncident.description,
        priority: updatedIncident.priority,
        status: updatedIncident.status,
        reportedBy: updatedIncident.reportedBy,
        assignedTo: updatedIncident.assignedTo || 'Unassigned',
        attachments: updatedIncident.attachments || [],
        notes: updatedIncident.notes || [],
        timeline: updatedIncident.timeline || [],
        createdAt: updatedIncident.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: updatedIncident.updatedAt?.toISOString() || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Update incident error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete incident
export async function DELETE(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageIncidents')) {
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
        { success: false, error: 'Incident ID is required' },
        { status: 400 }
      );
    }

    let incidentId;
    try {
      incidentId = new mongoose.Types.ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid incident ID format' },
        { status: 400 }
      );
    }

    const deleteResult = await Incident.deleteOne({ _id: incidentId });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Incident deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete incident error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

