import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OpsUser from '@/models/OpsUser';
import { verifyPassword, generateToken } from '@/lib/auth';

// Portal login uses OPS users table only. Only admin/super_admin in ops_users can access this portal.
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await OpsUser.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Your account is not active. Please contact administrator.' },
        { status: 403 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const displayName = user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: displayName,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: displayName,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.profilePhoto || user.avatar,
          status: user.status,
        },
        token,
      },
      message: 'Login successful',
    });

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

