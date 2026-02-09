import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Volunteer from '@/models/Volunteer';
import User from '@/models/User';
import { verifyPassword, generateToken } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * POST /api/volunteers/mobile-login
 * Volunteer login for mobile app. No auth token required.
 * Body: { volunteerId?: string, email?: string, password: string }
 * - volunteerId: 6-digit volunteer ID (e.g. "123456")
 * - email: volunteer's linked user email (alternative to volunteerId)
 * One of volunteerId or email is required.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { volunteerId, email, password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    if (!volunteerId && !email) {
      return NextResponse.json(
        { success: false, error: 'Either volunteerId or email is required' },
        { status: 400 }
      );
    }

    let user: { _id: mongoose.Types.ObjectId; email: string; password: string; firstName: string; lastName: string; name?: string; phone?: string; status: string } | null = null;
    let volunteer: Awaited<ReturnType<typeof Volunteer.findOne>> = null;

    if (volunteerId) {
      volunteer = await Volunteer.findOne({
        $or: [
          { volunteerId: String(volunteerId).trim() },
          ...(mongoose.Types.ObjectId.isValid(volunteerId) ? [{ _id: new mongoose.Types.ObjectId(volunteerId) }] : []),
        ],
      }).lean();
      if (volunteer && (volunteer as any).userId) {
        user = await User.findById((volunteer as any).userId)
          .select('email password firstName lastName name phone status')
          .lean();
      }
    } else if (email) {
      user = await User.findOne({ email: String(email).toLowerCase().trim(), role: 'volunteer' })
        .select('email password firstName lastName name phone status')
        .lean();
      if (user) {
        volunteer = await Volunteer.findOne({ userId: (user as any)._id.toString() }).lean();
      }
    }

    if (!user || !volunteer) {
      return NextResponse.json(
        { success: false, error: 'Invalid volunteer ID or email' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is not active. Please contact administrator.' },
        { status: 403 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const token = generateToken({
      userId: (user as any)._id.toString(),
      email: user.email,
      role: 'volunteer',
      name: displayName,
    });

    const volunteerData = {
      _id: (volunteer as any)._id.toString(),
      volunteerId: (volunteer as any).volunteerId,
      userId: (volunteer as any).userId,
      firstName: user.firstName,
      lastName: user.lastName,
      name: displayName,
      email: user.email,
      phone: user.phone,
      availability: (volunteer as any).availability,
      status: (volunteer as any).status,
      address: (volunteer as any).address,
      skills: (volunteer as any).skills,
      profileImage: (volunteer as any).profileImage,
    };

    return NextResponse.json({
      success: true,
      data: {
        volunteer: volunteerData,
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Volunteer mobile login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
