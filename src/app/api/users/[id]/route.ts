import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Volunteer from '@/models/Volunteer';
import ServiceProvider from '@/models/ServiceProvider';
import { verifyAuth, hashPassword, canPerform } from '@/lib/auth';

// GET - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    const { id } = await params;

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(id).select('-password');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get additional profile data
    let profile = null;
    if (user.role === 'volunteer') {
      profile = await Volunteer.findOne({ userId: id });
    } else if (user.role === 'service_provider') {
      profile = await ServiceProvider.findOne({ userId: id });
    }

    return NextResponse.json({
      success: true,
      data: { user, profile },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    const { id } = await params;

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

    const body = await request.json();
    const { name, email, phone, role, status, address, password } = body;

    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Admin cannot edit super_admin or other admins
    if (tokenPayload.role === 'admin') {
      if (user.role === 'super_admin' || user.role === 'admin') {
        return NextResponse.json(
          { success: false, error: 'You cannot edit this user' },
          { status: 403 }
        );
      }
    }

    // Check email uniqueness
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (phone) user.phone = phone;
    if (status) user.status = status;
    if (address) user.address = address;

    // Only super_admin can change roles
    if (role && tokenPayload.role === 'super_admin') {
      user.role = role;
    }

    // Update password if provided
    if (password) {
      user.password = await hashPassword(password);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          address: user.address,
        },
      },
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenPayload = await verifyAuth(request);
    const { id } = await params;

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'deleteUser')) {
      return NextResponse.json(
        { success: false, error: 'Only Super Admin can delete users' },
        { status: 403 }
      );
    }

    await connectDB();

    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Cannot delete self
    if (user._id.toString() === tokenPayload.userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete associated profiles
    if (user.role === 'volunteer') {
      await Volunteer.deleteOne({ userId: id });
    } else if (user.role === 'service_provider') {
      await ServiceProvider.deleteOne({ userId: id });
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

