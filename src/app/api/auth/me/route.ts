import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OpsUser from '@/models/OpsUser';
import { verifyAuth } from '@/lib/auth';

// Portal auth: current user is always from OPS users table (admin/super_admin).
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await OpsUser.findById(tokenPayload.userId).select('-password');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const name = user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.profilePhoto || user.avatar,
          status: user.status,
          address: user.address,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

