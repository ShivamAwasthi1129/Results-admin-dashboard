import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Incident from '@/models/Incident';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Clear existing incidents
    await Incident.deleteMany({});

    // Sample incident data based on the images
    const sampleIncidents = [
      {
        ticketNumber: 'TKT-2024-01001',
        type: 'insurance_support',
        title: 'Insurance adjuster appointment',
        description: 'Detailed description for Insurance adjuster appointment. Requires immediate attention and proper handling.',
        priority: 'low',
        status: 'open',
        reportedBy: {
          name: 'John Smith',
          email: 'john.smith@email.com',
          phone: '(816) 365-1136',
        },
        assignedTo: 'Unassigned',
        attachments: ['file1.pdf', 'file2.jpg'],
        notes: [
          {
            content: 'Initial contact made',
            createdBy: 'System',
            createdAt: new Date('2024-12-08'),
          },
          {
            content: 'Documentation received',
            createdBy: 'System',
            createdAt: new Date('2024-12-08'),
          },
        ],
        timeline: [
          {
            type: 'created',
            title: 'Incident Created',
            description: 'Created by John Smith',
            createdBy: 'John Smith',
            createdAt: new Date('2024-12-05'),
          },
          {
            type: 'status_updated',
            title: 'Status Updated',
            description: 'Changed to Open',
            createdBy: 'System',
            createdAt: new Date('2024-12-08'),
          },
          {
            type: 'note_added',
            title: 'Note Added',
            description: 'Initial contact made',
            createdBy: 'System',
            createdAt: new Date('2024-12-08'),
          },
          {
            type: 'note_added',
            title: 'Note Added',
            description: 'Documentation received',
            createdBy: 'System',
            createdAt: new Date('2024-12-08'),
          },
        ],
      },
      {
        ticketNumber: 'TKT-2024-01002',
        type: 'finance_management',
        title: 'Loan assistance needed',
        description: 'Need assistance with loan application and documentation.',
        priority: 'low',
        status: 'in_progress',
        reportedBy: {
          name: 'Maria Garcia',
          email: 'maria.garcia@email.com',
          phone: '(555) 123-4567',
        },
        assignedTo: 'Patricia Taylor',
        attachments: [],
        notes: [
          {
            content: 'Application review in progress',
            createdBy: 'Patricia Taylor',
            createdAt: new Date('2024-12-15'),
          },
        ],
        timeline: [
          {
            type: 'created',
            title: 'Incident Created',
            description: 'Created by Maria Garcia',
            createdBy: 'Maria Garcia',
            createdAt: new Date('2024-12-14'),
          },
          {
            type: 'assigned',
            title: 'Assignment Updated',
            description: 'Assigned to Patricia Taylor',
            createdBy: 'System',
            createdAt: new Date('2024-12-14'),
          },
          {
            type: 'status_updated',
            title: 'Status Updated',
            description: 'Changed to In Progress',
            createdBy: 'System',
            createdAt: new Date('2024-12-14'),
          },
          {
            type: 'note_added',
            title: 'Note Added',
            description: 'Application review in progress',
            createdBy: 'Patricia Taylor',
            createdAt: new Date('2024-12-15'),
          },
        ],
      },
      {
        ticketNumber: 'TKT-2024-01003',
        type: 'legal_assistance',
        title: 'Legal document review required',
        description: 'Need legal assistance with document review and consultation.',
        priority: 'high',
        status: 'open',
        reportedBy: {
          name: 'Robert Johnson',
          email: 'robert.johnson@email.com',
          phone: '(555) 987-6543',
        },
        assignedTo: 'Unassigned',
        attachments: ['legal-doc.pdf'],
        notes: [],
        timeline: [
          {
            type: 'created',
            title: 'Incident Created',
            description: 'Created by Robert Johnson',
            createdBy: 'Robert Johnson',
            createdAt: new Date('2024-12-20'),
          },
        ],
      },
      {
        ticketNumber: 'TKT-2024-01004',
        type: 'housing',
        title: 'Housing assistance request',
        description: 'Request for temporary housing assistance after disaster.',
        priority: 'critical',
        status: 'in_progress',
        reportedBy: {
          name: 'Sarah Williams',
          email: 'sarah.williams@email.com',
          phone: '(555) 456-7890',
        },
        assignedTo: 'Michael Brown',
        attachments: [],
        notes: [
          {
            content: 'Emergency housing arranged',
            createdBy: 'Michael Brown',
            createdAt: new Date('2024-12-22'),
          },
        ],
        timeline: [
          {
            type: 'created',
            title: 'Incident Created',
            description: 'Created by Sarah Williams',
            createdBy: 'Sarah Williams',
            createdAt: new Date('2024-12-21'),
          },
          {
            type: 'assigned',
            title: 'Assignment Updated',
            description: 'Assigned to Michael Brown',
            createdBy: 'System',
            createdAt: new Date('2024-12-21'),
          },
          {
            type: 'status_updated',
            title: 'Status Updated',
            description: 'Changed to In Progress',
            createdBy: 'System',
            createdAt: new Date('2024-12-21'),
          },
          {
            type: 'note_added',
            title: 'Note Added',
            description: 'Emergency housing arranged',
            createdBy: 'Michael Brown',
            createdAt: new Date('2024-12-22'),
          },
        ],
      },
      {
        ticketNumber: 'TKT-2024-01005',
        type: 'medical',
        title: 'Medical assistance needed',
        description: 'Request for medical assistance and prescription help.',
        priority: 'medium',
        status: 'resolved',
        reportedBy: {
          name: 'David Lee',
          email: 'david.lee@email.com',
          phone: '(555) 321-0987',
        },
        assignedTo: 'Jennifer Davis',
        attachments: ['medical-records.pdf'],
        notes: [
          {
            content: 'Medical assistance provided',
            createdBy: 'Jennifer Davis',
            createdAt: new Date('2024-12-18'),
          },
        ],
        timeline: [
          {
            type: 'created',
            title: 'Incident Created',
            description: 'Created by David Lee',
            createdBy: 'David Lee',
            createdAt: new Date('2024-12-16'),
          },
          {
            type: 'assigned',
            title: 'Assignment Updated',
            description: 'Assigned to Jennifer Davis',
            createdBy: 'System',
            createdAt: new Date('2024-12-16'),
          },
          {
            type: 'status_updated',
            title: 'Status Updated',
            description: 'Changed to In Progress',
            createdBy: 'System',
            createdAt: new Date('2024-12-16'),
          },
          {
            type: 'note_added',
            title: 'Note Added',
            description: 'Medical assistance provided',
            createdBy: 'Jennifer Davis',
            createdAt: new Date('2024-12-18'),
          },
          {
            type: 'status_updated',
            title: 'Status Updated',
            description: 'Changed to Resolved',
            createdBy: 'System',
            createdAt: new Date('2024-12-18'),
          },
        ],
      },
    ];

    const incidents = await Incident.insertMany(sampleIncidents);

    return NextResponse.json({
      success: true,
      message: `Seeded ${incidents.length} incidents`,
      count: incidents.length,
    });
  } catch (error: any) {
    console.error('Seed incidents error:', error);
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

