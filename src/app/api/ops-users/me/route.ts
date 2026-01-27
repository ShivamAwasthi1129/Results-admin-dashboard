import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OpsUser from '@/models/OpsUser';
import { verifyAuth } from '@/lib/auth';

function mapMe(user: any) {
  const fullName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    name: fullName,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    status: user.status,
    profilePhoto: user.profilePhoto || '',
    avatar: user.profilePhoto || user.avatar || '',
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : '',
    gender: user.gender || '',
    bloodGroup: user.bloodGroup || '',
    ssnNumber: user.ssnNumber || '',
    driversLicense: {
      number: user.driversLicense?.number || '',
      state: user.driversLicense?.state || '',
      expiryDate: user.driversLicense?.expiryDate ? user.driversLicense.expiryDate.toISOString().split('T')[0] : '',
    },
    emergencyContact: {
      firstName: user.emergencyContact?.firstName || '',
      lastName: user.emergencyContact?.lastName || '',
      phone: user.emergencyContact?.phone || '',
      relation: user.emergencyContact?.relation || '',
    },
    address: {
      street: user.address?.street || '',
      apartment: user.address?.apartment || '',
      city: user.address?.city || '',
      state: user.address?.state || '',
      zipCode: user.address?.zipCode || user.address?.pincode || '',
      country: user.address?.country || 'United States',
    },
    preferences: user.preferences || {
      notifications: {
        email: true, push: true, sms: false,
        emergencyAlerts: true, disasterUpdates: true, volunteerAssignments: true,
        systemUpdates: false, weeklyReport: true,
      },
    },
    createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await OpsUser.findById(tokenPayload.userId).select('-password');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: mapMe(user) });
  } catch (error: any) {
    console.error('Get ops user me error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
