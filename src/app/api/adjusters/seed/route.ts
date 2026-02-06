import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Adjuster from '@/models/Adjuster';

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse, request?: NextRequest) {
  let allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  if (request) {
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin) {
      const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (configuredUrl && requestOrigin.includes(new URL(configuredUrl).hostname)) {
        allowedOrigin = requestOrigin;
      } else if (!configuredUrl && requestOrigin.includes('localhost')) {
        allowedOrigin = requestOrigin;
      }
    }
  }
  
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

// Premade adjusters data
const premadeAdjusters = [
  {
    adjusterId: 'ADJ-0001',
    firstName: 'Michael',
    lastName: 'Thompson',
    email: 'michael.thompson@insuranceadjusters.com',
    phone: '(555) 123-4567',
    companyName: 'National Insurance Adjusters Inc.',
    address: {
      street: '1234 Main Street',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      country: 'USA',
    },
    certifications: [
      {
        name: 'Licensed Public Adjuster',
        issuingAuthority: 'Texas Department of Insurance',
        certificateNumber: 'TXA-2024-1234',
        issueDate: new Date('2020-03-15'),
        expiryDate: new Date('2026-03-15'),
        notes: 'State of Texas Public Adjuster License',
      },
      {
        name: 'IICRC Water Damage Restoration',
        issuingAuthority: 'Institute of Inspection Cleaning and Restoration Certification',
        certificateNumber: 'IICRC-WRT-5678',
        issueDate: new Date('2019-06-20'),
        expiryDate: new Date('2025-06-20'),
        notes: 'Water Damage Restoration Technician',
      },
    ],
    specializations: ['Hurricane', 'Flood', 'Wind', 'Water Damage'],
    documents: [],
    states: ['TX', 'LA', 'OK'],
    licenseNumber: 'TXA-2024-1234',
    yearsOfExperience: 12,
    status: 'active',
    isAvailable: true,
    averageRating: 4.8,
    totalRatings: 156,
    notes: 'Senior adjuster with extensive hurricane damage experience.',
  },
  {
    adjusterId: 'ADJ-0002',
    firstName: 'Sarah',
    lastName: 'Martinez',
    email: 'sarah.martinez@claimsexperts.com',
    phone: '(555) 234-5678',
    companyName: 'Claims Experts LLC',
    address: {
      street: '5678 Oak Avenue',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA',
    },
    certifications: [
      {
        name: 'Florida Licensed Public Adjuster',
        issuingAuthority: 'Florida Department of Financial Services',
        certificateNumber: 'FLA-2023-5678',
        issueDate: new Date('2018-01-10'),
        expiryDate: new Date('2026-01-10'),
        notes: 'Florida All Lines Adjuster License',
      },
      {
        name: 'Certified Professional Public Adjuster (CPPA)',
        issuingAuthority: 'National Association of Public Insurance Adjusters',
        certificateNumber: 'NAPIA-CPPA-9012',
        issueDate: new Date('2021-08-15'),
        expiryDate: new Date('2027-08-15'),
        notes: 'National certification for public adjusters',
      },
    ],
    specializations: ['Hurricane', 'Flood', 'Fire', 'Roof Damage'],
    documents: [],
    states: ['FL', 'GA', 'SC'],
    licenseNumber: 'FLA-2023-5678',
    yearsOfExperience: 8,
    status: 'active',
    isAvailable: true,
    averageRating: 4.9,
    totalRatings: 98,
    notes: 'Bilingual adjuster (English/Spanish) specializing in residential claims.',
  },
  {
    adjusterId: 'ADJ-0003',
    firstName: 'James',
    lastName: 'Wilson',
    email: 'james.wilson@propertyadjust.com',
    phone: '(555) 345-6789',
    companyName: 'Property Adjust Solutions',
    address: {
      street: '9101 Pine Road',
      city: 'New Orleans',
      state: 'LA',
      zipCode: '70112',
      country: 'USA',
    },
    certifications: [
      {
        name: 'Louisiana Licensed Adjuster',
        issuingAuthority: 'Louisiana Department of Insurance',
        certificateNumber: 'LAA-2022-3456',
        issueDate: new Date('2017-05-20'),
        expiryDate: new Date('2025-05-20'),
        notes: 'Louisiana Property and Casualty Adjuster License',
      },
      {
        name: 'Certified Fire & Explosion Investigator',
        issuingAuthority: 'International Association of Arson Investigators',
        certificateNumber: 'IAAI-CFI-7890',
        issueDate: new Date('2020-11-10'),
        expiryDate: new Date('2026-11-10'),
        notes: 'Fire investigation certification',
      },
    ],
    specializations: ['Fire', 'Explosion', 'Storm', 'Commercial Property'],
    documents: [],
    states: ['LA', 'MS', 'TX'],
    licenseNumber: 'LAA-2022-3456',
    yearsOfExperience: 15,
    status: 'active',
    isAvailable: true,
    averageRating: 4.7,
    totalRatings: 203,
    notes: 'Expert in commercial property damage and fire investigations.',
  },
  {
    adjusterId: 'ADJ-0004',
    firstName: 'Emily',
    lastName: 'Chen',
    email: 'emily.chen@rapidclaims.com',
    phone: '(555) 456-7890',
    companyName: 'Rapid Claims Adjusting',
    address: {
      street: '2345 Cedar Lane',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA',
    },
    certifications: [
      {
        name: 'California Licensed Public Adjuster',
        issuingAuthority: 'California Department of Insurance',
        certificateNumber: 'CAA-2021-8901',
        issueDate: new Date('2019-09-05'),
        expiryDate: new Date('2025-09-05'),
        notes: 'California Public Adjuster License',
      },
      {
        name: 'HAAG Certified Inspector - Residential Roofs',
        issuingAuthority: 'HAAG Engineering',
        certificateNumber: 'HAAG-RES-2345',
        issueDate: new Date('2022-03-25'),
        expiryDate: new Date('2028-03-25'),
        notes: 'Residential roof inspection certification',
      },
    ],
    specializations: ['Earthquake', 'Fire', 'Wildfire', 'Roof Damage'],
    documents: [],
    states: ['CA', 'NV', 'AZ'],
    licenseNumber: 'CAA-2021-8901',
    yearsOfExperience: 6,
    status: 'active',
    isAvailable: true,
    averageRating: 4.6,
    totalRatings: 67,
    notes: 'Specializes in earthquake and wildfire damage assessment in California.',
  },
  {
    adjusterId: 'ADJ-0005',
    firstName: 'Robert',
    lastName: 'Johnson',
    email: 'robert.johnson@stormclaims.net',
    phone: '(555) 567-8901',
    companyName: 'Storm Claims Network',
    address: {
      street: '6789 Maple Drive',
      city: 'Oklahoma City',
      state: 'OK',
      zipCode: '73101',
      country: 'USA',
    },
    certifications: [
      {
        name: 'Oklahoma All Lines Adjuster',
        issuingAuthority: 'Oklahoma Insurance Department',
        certificateNumber: 'OKA-2020-6789',
        issueDate: new Date('2016-07-15'),
        expiryDate: new Date('2026-07-15'),
        notes: 'Oklahoma All Lines Adjuster License',
      },
      {
        name: 'Certified Storm Damage Inspector',
        issuingAuthority: 'Storm Damage Institute',
        certificateNumber: 'SDI-CSI-1234',
        issueDate: new Date('2018-04-10'),
        expiryDate: new Date('2024-04-10'),
        notes: 'Hail and wind damage inspection specialist',
      },
    ],
    specializations: ['Tornado', 'Hail', 'Wind', 'Storm'],
    documents: [],
    states: ['OK', 'KS', 'TX', 'AR'],
    licenseNumber: 'OKA-2020-6789',
    yearsOfExperience: 10,
    status: 'active',
    isAvailable: false,
    availabilityNotes: 'Currently handling multiple tornado damage claims in the region.',
    averageRating: 4.5,
    totalRatings: 142,
    notes: 'Expert in tornado and severe storm damage assessment.',
  },
];

// POST - Seed premade adjusters
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      const response = NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
      return addCorsHeaders(response, request);
    }

    // Only super_admin can seed data
    if (tokenPayload.role !== 'super_admin') {
      const response = NextResponse.json(
        { success: false, error: 'Permission denied. Only super admin can seed data.' },
        { status: 403 }
      );
      return addCorsHeaders(response, request);
    }

    await connectDB();

    // Check if adjusters already exist
    const existingCount = await Adjuster.countDocuments();
    if (existingCount > 0) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Adjusters already exist in the database. Clear existing data first if you want to reseed.',
          existingCount,
        },
        { status: 400 }
      );
      return addCorsHeaders(response, request);
    }

    // Insert premade adjusters
    const adjustersToInsert = premadeAdjusters.map(adj => ({
      ...adj,
      assignedReports: [],
      totalReportsHandled: 0,
      currentActiveReports: 0,
      createdBy: tokenPayload.userId,
      lastModifiedBy: tokenPayload.userId,
    }));

    const insertedAdjusters = await Adjuster.insertMany(adjustersToInsert);

    const response = NextResponse.json({
      success: true,
      message: `Successfully seeded ${insertedAdjusters.length} adjusters`,
      data: {
        count: insertedAdjusters.length,
        adjusters: insertedAdjusters.map(adj => ({
          adjusterId: adj.adjusterId,
          fullName: `${adj.firstName} ${adj.lastName}`,
          email: adj.email,
          companyName: adj.companyName,
        })),
      },
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Seed adjusters error:', error);
    const response = NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
    return addCorsHeaders(response, request);
  }
}

// DELETE - Clear all adjusters (for development/testing)
export async function DELETE(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      const response = NextResponse.json(
        { success: false, message: 'Not authorized. No token provided.' },
        { status: 401 }
      );
      return addCorsHeaders(response, request);
    }

    // Only super_admin can clear data
    if (tokenPayload.role !== 'super_admin') {
      const response = NextResponse.json(
        { success: false, error: 'Permission denied. Only super admin can clear data.' },
        { status: 403 }
      );
      return addCorsHeaders(response, request);
    }

    await connectDB();

    const result = await Adjuster.deleteMany({});

    const response = NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} adjusters`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
    return addCorsHeaders(response, request);
  } catch (error: any) {
    console.error('Clear adjusters error:', error);
    const response = NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
    return addCorsHeaders(response, request);
  }
}
