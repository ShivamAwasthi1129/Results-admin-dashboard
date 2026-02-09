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
    let volunteer: Record<string, unknown> | null = null;

    if (volunteerId) {
      const volDoc = await Volunteer.findOne({
        $or: [
          { volunteerId: String(volunteerId).trim() },
          ...(mongoose.Types.ObjectId.isValid(volunteerId) ? [{ _id: new mongoose.Types.ObjectId(volunteerId) }] : []),
        ],
      }).lean();
      volunteer = volDoc as Record<string, unknown> | null;
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
        const volDoc = await Volunteer.findOne({ userId: (user as any)._id.toString() }).lean();
        volunteer = volDoc as Record<string, unknown> | null;
      }
    }

    if (!user || !volunteer) {
      return NextResponse.json(
        { success: false, error: 'Invalid volunteer ID or email' },
        { status: 401 }
      );
    }

    if ((user as Record<string, unknown>).status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is not active. Please contact administrator.' },
        { status: 403 }
      );
    }

    const hashedPassword = (user as Record<string, unknown>).password;
    if (typeof hashedPassword !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid account state' },
        { status: 500 }
      );
    }
    let isPasswordValid = false;
    try {
      isPasswordValid = await verifyPassword(String(password), hashedPassword);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    const userObj = user as Record<string, unknown>;
    const displayName =
      (userObj.name as string) ||
      `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim();
    const token = generateToken({
      userId: String(userObj._id ?? (user as any)._id?.toString?.() ?? ''),
      email: String(userObj.email ?? ''),
      role: 'volunteer',
      name: displayName,
    });

    const volObj = volunteer as Record<string, unknown>;
    const volunteerData = {
      _id: String(volObj._id ?? (volunteer as any)._id?.toString?.() ?? ''),
      volunteerId: volObj.volunteerId,
      userId: volObj.userId,
      firstName: String(userObj.firstName ?? ''),
      lastName: String(userObj.lastName ?? ''),
      name: displayName,
      email: String(userObj.email ?? ''),
      phone: String(userObj.phone ?? ''),
      availability: volObj.availability,
      status: volObj.status,
      address: volObj.address,
      skills: volObj.skills,
      profileImage: volObj.profileImage,
    };

    return NextResponse.json({
      success: true,
      data: {
        volunteer: volunteerData,
        token,
      },
      message: 'Login successful',
    });
  } catch (error: unknown) {
    console.error('Volunteer mobile login error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' ? message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
