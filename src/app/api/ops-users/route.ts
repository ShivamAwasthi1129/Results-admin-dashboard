import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OpsUser from '@/models/OpsUser';
import { verifyAuth, hashPassword, canPerform } from '@/lib/auth';
import { sendEmail, emailTemplates } from '@/lib/email';

function mapOpsUserToResponse(user: any) {
  const fullName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    name: fullName,
    fullName: fullName,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    status: user.status,
    profilePhoto: user.profilePhoto || '',
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
    gender: user.gender || '',
    bloodGroup: user.bloodGroup || '',
    ssnNumber: user.ssnNumber || '',
    driversLicense: user.driversLicense || { number: '', state: '', expiryDate: null },
    emergencyContact: user.emergencyContact || { firstName: '', lastName: '', phone: '', relation: '' },
    address: {
      street: user.address?.street || '',
      apartment: user.address?.apartment || '',
      city: user.address?.city || '',
      state: user.address?.state || '',
      zipCode: user.address?.zipCode || user.address?.pincode || '',
      country: user.address?.country || 'United States',
    },
    createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
  };
}

// GET - List all OPS users (admin/super_admin only)
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!canPerform(tokenPayload.role as 'admin' | 'super_admin', 'viewUsers')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      OpsUser.find(query).select('-password').sort({ [sort]: sortOrder }).skip(skip).limit(limit),
      OpsUser.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((u: any) => mapOpsUserToResponse(u)),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    console.error('Get ops users error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Create OPS user
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const role = (body.role === 'super_admin' ? 'super_admin' : 'admin') as 'admin' | 'super_admin';
    if (role === 'super_admin' && !canPerform(tokenPayload.role as 'admin' | 'super_admin', 'createAdmin')) {
      return NextResponse.json({ success: false, error: 'Only Super Admin can create super admin users' }, { status: 403 });
    }
    if (!canPerform(tokenPayload.role as 'admin' | 'super_admin', 'createUser')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    await connectDB();

    const existing = await OpsUser.findOne({ email: (body.email || '').toLowerCase() });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(body.password);
    let firstName = body.firstName || '';
    let lastName = body.lastName || '';
    if (!firstName && !lastName && body.name) {
      const parts = (body.name || '').trim().split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const user = await OpsUser.create({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email: (body.email || '').toLowerCase(),
      password: hashedPassword,
      phone: body.phone || '',
      role: body.role === 'super_admin' ? 'super_admin' : 'admin',
      status: body.status || 'active',
      profilePhoto: body.profilePhoto || '',
      bloodGroup: body.bloodGroup || '',
      gender: body.gender || '',
      dateOfBirth: body.dateOfBirth || undefined,
      ssnNumber: body.ssnNumber || '',
      driversLicense: {
        number: body.driversLicense?.number || '',
        state: body.driversLicense?.state || '',
        expiryDate: body.driversLicense?.expiryDate || undefined,
      },
      emergencyContact: {
        firstName: body.emergencyContact?.firstName || body.emergencyFirstName || '',
        lastName: body.emergencyContact?.lastName || body.emergencyLastName || '',
        phone: body.emergencyContact?.phone || body.emergencyContactPhone || body.emergencyPhone || '',
        relation: body.emergencyContact?.relation || body.emergencyContactRelation || body.emergencyRelation || '',
      },
      address: {
        street: body.address?.street || body.street || '',
        apartment: body.address?.apartment || body.apartment || '',
        city: body.address?.city || body.city || '',
        state: body.address?.state || body.state || '',
        zipCode: body.address?.zipCode || body.zipCode || body.address?.pincode || '',
        country: body.address?.country || 'United States',
      },
    });

    try {
      const userName = `${firstName} ${lastName}`.trim() || body.email;
      const emailTemplate = emailTemplates.welcome(userName, body.email.toLowerCase(), body.password);
      await sendEmail({ to: body.email.toLowerCase(), subject: emailTemplate.subject, html: emailTemplate.html });
    } catch (_) {}

    const u = await OpsUser.findById(user._id).select('-password');
    return NextResponse.json({
      success: true,
      data: { user: u ? mapOpsUserToResponse(u) : mapOpsUserToResponse(user) },
      message: 'OPS user created successfully',
    });
  } catch (error: any) {
    console.error('Create ops user error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update OPS user
export async function PUT(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!canPerform(tokenPayload.role as 'admin' | 'super_admin', 'editUser')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    await connectDB();
    const body = await request.json();
    const existing = await OpsUser.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (existing.role === 'super_admin' && tokenPayload.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Cannot edit super admin' }, { status: 403 });
    }

    let firstName = body.firstName !== undefined ? body.firstName : existing.firstName;
    let lastName = body.lastName !== undefined ? body.lastName : existing.lastName;
    if (!firstName && !lastName && body.name) {
      const parts = (body.name || '').trim().split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const updateData: Record<string, any> = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      phone: body.phone !== undefined ? body.phone : existing.phone,
      status: body.status || existing.status,
      profilePhoto: body.profilePhoto !== undefined ? body.profilePhoto : existing.profilePhoto,
      dateOfBirth: body.dateOfBirth !== undefined ? body.dateOfBirth : existing.dateOfBirth,
      bloodGroup: body.bloodGroup !== undefined ? body.bloodGroup : existing.bloodGroup,
      gender: body.gender !== undefined ? body.gender : existing.gender,
      ssnNumber: body.ssnNumber !== undefined ? body.ssnNumber : existing.ssnNumber,
      driversLicense: {
        number: body.driversLicense?.number !== undefined ? body.driversLicense.number : (existing.driversLicense?.number || ''),
        state: body.driversLicense?.state !== undefined ? body.driversLicense.state : (existing.driversLicense?.state || ''),
        expiryDate: body.driversLicense?.expiryDate !== undefined ? body.driversLicense.expiryDate : existing.driversLicense?.expiryDate,
      },
      emergencyContact: {
        firstName: body.emergencyContact?.firstName ?? body.emergencyFirstName ?? existing.emergencyContact?.firstName ?? '',
        lastName: body.emergencyContact?.lastName ?? body.emergencyLastName ?? existing.emergencyContact?.lastName ?? '',
        phone: body.emergencyContact?.phone ?? body.emergencyContactPhone ?? body.emergencyPhone ?? existing.emergencyContact?.phone ?? '',
        relation: body.emergencyContact?.relation ?? body.emergencyContactRelation ?? body.emergencyRelation ?? existing.emergencyContact?.relation ?? '',
      },
      address: {
        street: body.address?.street ?? body.street ?? existing.address?.street ?? '',
        apartment: body.address?.apartment ?? body.apartment ?? existing.address?.apartment ?? '',
        city: body.address?.city ?? body.city ?? existing.address?.city ?? '',
        state: body.address?.state ?? body.state ?? existing.address?.state ?? '',
        zipCode: body.address?.zipCode ?? body.zipCode ?? existing.address?.zipCode ?? existing.address?.pincode ?? '',
        country: body.address?.country ?? existing.address?.country ?? 'United States',
      },
    };
    if (body.role && tokenPayload.role === 'super_admin') {
      updateData.role = body.role === 'super_admin' ? 'super_admin' : 'admin';
    }
    if (body.password && body.password.length >= 6) {
      updateData.password = await hashPassword(body.password);
    }
    if (body.preferences && typeof body.preferences === 'object' && body.preferences.notifications) {
      updateData.preferences = {
        notifications: {
          ...(existing.preferences?.notifications || {}),
          ...body.preferences.notifications,
        },
      };
    }

    const updated = await OpsUser.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    return NextResponse.json({
      success: true,
      data: { user: updated ? mapOpsUserToResponse(updated) : null },
      message: 'OPS user updated successfully',
    });
  } catch (error: any) {
    console.error('Update ops user error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete OPS user
export async function DELETE(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!canPerform(tokenPayload.role as 'admin' | 'super_admin', 'deleteUser')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    await connectDB();
    const user = await OpsUser.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (user.role === 'super_admin') {
      return NextResponse.json({ success: false, error: 'Cannot delete super admin' }, { status: 403 });
    }
    if (user._id.toString() === tokenPayload.userId) {
      return NextResponse.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
    }

    await OpsUser.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'OPS user deleted successfully' });
  } catch (error: any) {
    console.error('Delete ops user error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
