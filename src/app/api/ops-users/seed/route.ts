import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OpsUser from '@/models/OpsUser';
import { hashPassword } from '@/lib/auth';

// Seed OPS users with full Add-user-form data. Safe to call multiple times (upserts by email).
// No auth required so initial setup can create the first super_admin.
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const defaultPassword = 'Admin@123';
    const hashed = await hashPassword(defaultPassword);

    const seeds = [
      {
        firstName: 'Super',
        lastName: 'Admin',
        name: 'Super Admin',
        email: 'superadmin@resultsportal.com',
        password: hashed,
        phone: '+1-555-0100',
        role: 'super_admin' as const,
        status: 'active' as const,
        profilePhoto: '',
        dateOfBirth: new Date('1980-01-15'),
        gender: 'male' as const,
        bloodGroup: 'O+' as const,
        ssnNumber: '***-**-1000',
        driversLicense: { number: 'DL100001', state: 'CA', expiryDate: new Date('2028-12-31') },
        emergencyContact: {
          firstName: 'Jane',
          lastName: 'Admin',
          phone: '+1-555-0101',
          relation: 'spouse',
        },
        address: {
          street: '100 Admin Plaza',
          apartment: 'Suite 1',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'United States',
        },
      },
      {
        firstName: 'Portal',
        lastName: 'Admin',
        name: 'Portal Admin',
        email: 'admin@resultsportal.com',
        password: hashed,
        phone: '+1-555-0200',
        role: 'admin' as const,
        status: 'active' as const,
        profilePhoto: '',
        dateOfBirth: new Date('1985-06-20'),
        gender: 'female' as const,
        bloodGroup: 'A+' as const,
        ssnNumber: '***-**-2000',
        driversLicense: { number: 'DL200002', state: 'NY', expiryDate: new Date('2027-06-30') },
        emergencyContact: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1-555-0201',
          relation: 'sibling',
        },
        address: {
          street: '200 Operations Way',
          apartment: 'Apt 5',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States',
        },
      },
      {
        firstName: 'Ops',
        lastName: 'Manager',
        name: 'Ops Manager',
        email: 'ops.manager@resultsportal.com',
        password: hashed,
        phone: '+1-555-0300',
        role: 'admin' as const,
        status: 'active' as const,
        profilePhoto: '',
        dateOfBirth: new Date('1990-03-10'),
        gender: 'male' as const,
        bloodGroup: 'B+' as const,
        ssnNumber: '***-**-3000',
        driversLicense: { number: 'DL300003', state: 'TX', expiryDate: new Date('2026-09-15') },
        emergencyContact: {
          firstName: 'Sarah',
          lastName: 'Manager',
          phone: '+1-555-0301',
          relation: 'parent',
        },
        address: {
          street: '300 Manager Blvd',
          apartment: '',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001',
          country: 'United States',
        },
      },
    ];

    const results: { email: string; action: 'created' | 'updated' | 'skipped' }[] = [];
    for (const s of seeds) {
      const existing = await OpsUser.findOne({ email: s.email.toLowerCase() });
      if (existing) {
        await OpsUser.updateOne(
          { email: s.email.toLowerCase() },
          {
            $set: {
              firstName: s.firstName,
              lastName: s.lastName,
              name: s.name,
              phone: s.phone,
              role: s.role,
              status: s.status,
              dateOfBirth: s.dateOfBirth,
              gender: s.gender,
              bloodGroup: s.bloodGroup,
              ssnNumber: s.ssnNumber,
              driversLicense: s.driversLicense,
              emergencyContact: s.emergencyContact,
              address: s.address,
              updatedAt: new Date(),
            },
          }
        );
        results.push({ email: s.email, action: 'updated' });
      } else {
        await OpsUser.create({
          ...s,
          email: s.email.toLowerCase(),
        });
        results.push({ email: s.email, action: 'created' });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'OPS users seeded. Default password for all: ' + defaultPassword,
        results,
      },
    });
  } catch (error: any) {
    console.error('Ops users seed error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Seed failed' },
      { status: 500 }
    );
  }
}
