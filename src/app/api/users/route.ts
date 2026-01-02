import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Volunteer from '@/models/Volunteer';
import ServiceProvider from '@/models/ServiceProvider';
import { verifyAuth, hashPassword, canPerform } from '@/lib/auth';
import { sendEmail, emailTemplates } from '@/lib/email';

// GET - List all users with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'viewUsers')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    // Build query
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

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    // Users module only shows admin and super_admin
    query.role = { $in: ['admin', 'super_admin'] };

    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
    });
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Check permissions
    if (body.role === 'super_admin' || body.role === 'admin') {
      if (!tokenPayload || !canPerform(tokenPayload?.role ?? 'volunteer', 'createAdmin')) {
        return NextResponse.json(
          { success: false, error: 'Only Super Admin can create admin users' },
          { status: 403 }
        );
      }
    } else {
      if (!canPerform(tokenPayload?.role ?? 'volunteer', 'createUser')) {
        return NextResponse.json(
          { success: false, error: 'Permission denied' },
          { status: 403 }
        );
      }
    }

    await connectDB();

    // Check if email exists
    const existingUser = await User.findOne({ email: body.email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);

    // Create user with all fields - handle both firstName/lastName and name
    let firstName = body.firstName || '';
    let lastName = body.lastName || '';
    
    // Backward compatibility: if name is provided but not firstName/lastName, split it
    if (!firstName && !lastName && body.name) {
      const nameParts = body.name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    const user = await User.create({
      firstName,
      lastName,
      email: body.email.toLowerCase(),
      password: hashedPassword,
      phone: body.phone || '',
      role: body.role || 'volunteer',
      status: body.status || 'active',
      profilePhoto: body.profilePhoto || '',
      bloodGroup: body.bloodGroup || '',
      gender: body.gender || '',
      ssnNumber: body.ssnNumber || '',
      aadharNumber: body.aadharNumber || body.ssnNumber || '',
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
        city: body.address?.city || body.city || '',
        state: body.address?.state || body.state || '',
        pincode: body.address?.pincode || body.zipCode || '',
        country: body.address?.country || 'United States',
      },
    });

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');

    // Send welcome email with credentials
    try {
      const userName = `${firstName} ${lastName}`.trim() || body.email;
      const emailTemplate = emailTemplates.welcome(userName, body.email.toLowerCase(), body.password);
      await sendEmail({
        to: body.email.toLowerCase(),
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the user creation if email fails
    }

    return NextResponse.json({
      success: true,
      data: { user: userResponse },
      message: 'User created successfully',
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'editUser')) {
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
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Find user
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent editing super_admin by non-super_admin
    if (existingUser.role === 'super_admin' && tokenPayload.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit super admin' },
        { status: 403 }
      );
    }

    // Handle firstName/lastName
    let firstName = body.firstName !== undefined ? body.firstName : existingUser.firstName;
    let lastName = body.lastName !== undefined ? body.lastName : existingUser.lastName;
    
    // Backward compatibility
    if (!firstName && !lastName && body.name) {
      const nameParts = body.name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Build update object
    const updateData: Record<string, any> = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim() || existingUser.name,
      phone: body.phone !== undefined ? body.phone : existingUser.phone,
      status: body.status || existingUser.status,
      profilePhoto: body.profilePhoto !== undefined ? body.profilePhoto : existingUser.profilePhoto,
      dateOfBirth: body.dateOfBirth || existingUser.dateOfBirth,
      bloodGroup: body.bloodGroup !== undefined ? body.bloodGroup : existingUser.bloodGroup,
      gender: body.gender !== undefined ? body.gender : existingUser.gender,
      ssnNumber: body.ssnNumber !== undefined ? body.ssnNumber : existingUser.ssnNumber,
      aadharNumber: body.aadharNumber !== undefined ? body.aadharNumber : existingUser.aadharNumber,
      driversLicense: {
        number: body.driversLicense?.number !== undefined ? body.driversLicense.number : existingUser.driversLicense?.number || '',
        state: body.driversLicense?.state !== undefined ? body.driversLicense.state : existingUser.driversLicense?.state || '',
        expiryDate: body.driversLicense?.expiryDate || existingUser.driversLicense?.expiryDate,
      },
      emergencyContact: {
        firstName: body.emergencyContact?.firstName || body.emergencyFirstName || existingUser.emergencyContact?.firstName || '',
        lastName: body.emergencyContact?.lastName || body.emergencyLastName || existingUser.emergencyContact?.lastName || '',
        phone: body.emergencyContact?.phone || body.emergencyContactPhone || body.emergencyPhone || existingUser.emergencyContact?.phone || '',
        relation: body.emergencyContact?.relation || body.emergencyContactRelation || body.emergencyRelation || existingUser.emergencyContact?.relation || '',
      },
      address: {
        street: body.address?.street || body.street || existingUser.address?.street || '',
        city: body.address?.city || body.city || existingUser.address?.city || '',
        state: body.address?.state || body.state || existingUser.address?.state || '',
        pincode: body.address?.pincode || body.zipCode || existingUser.address?.pincode || '',
        country: body.address?.country || existingUser.address?.country || 'United States',
      },
    };

    // Only super_admin can change roles
    if (body.role && tokenPayload.role === 'super_admin') {
      updateData.role = body.role;
    }

    // Update password if provided
    if (body.password && body.password.length >= 6) {
      updateData.password = await hashPassword(body.password);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
      message: 'User updated successfully',
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'deleteUser')) {
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
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting super_admin
    if (user.role === 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete super admin' },
        { status: 403 }
      );
    }

    // Delete user (admin and super_admin don't have related profiles)
    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
