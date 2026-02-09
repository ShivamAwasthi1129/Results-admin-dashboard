import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Volunteer from '@/models/Volunteer';
import User from '@/models/User';
import VolunteerTeam from '@/models/VolunteerTeam';
import mongoose from 'mongoose';

/**
 * GET /api/volunteers/by-id/[volunteerId]
 * Fetch a single volunteer by ID for mobile app. No authorization required.
 * [volunteerId] can be: 6-digit volunteerId (e.g. "123456") or MongoDB _id.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ volunteerId: string }> }
) {
  try {
    await connectDB();

    const { volunteerId } = await params;
    if (!volunteerId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Volunteer ID is required' },
        { status: 400 }
      );
    }

    const id = volunteerId.trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;

    const volunteer = await Volunteer.findOne(
      isObjectId ? { _id: new mongoose.Types.ObjectId(id) } : { volunteerId: id }
    ).lean();

    if (!volunteer) {
      return NextResponse.json(
        { success: false, error: 'Volunteer not found' },
        { status: 404 }
      );
    }

    const v = volunteer as Record<string, unknown>;
    let userData: { firstName?: string; lastName?: string; name?: string; email?: string; phone?: string } = {};
    if (v.userId) {
      const user = await User.findById(v.userId).select('firstName lastName name email phone').lean();
      if (user) {
        const u = user as Record<string, unknown>;
        userData = {
          firstName: u.firstName as string,
          lastName: u.lastName as string,
          name: (u.name as string) || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          email: u.email as string,
          phone: u.phone as string,
        };
      }
    }

    let teamData: { _id?: string; teamId?: string; name?: string; specialization?: string } | null = null;
    if (v.teamId) {
      const team = await VolunteerTeam.findById(v.teamId).select('teamId name specialization').lean();
      if (team) {
        const t = team as Record<string, unknown>;
        teamData = {
          _id: t._id?.toString(),
          teamId: t.teamId as string,
          name: t.name as string,
          specialization: t.specialization as string,
        };
      }
    }

    const response = {
      _id: v._id?.toString(),
      volunteerId: v.volunteerId,
      userId: v.userId,
      ...userData,
      dateOfBirth: v.dateOfBirth,
      gender: v.gender,
      bloodGroup: v.bloodGroup,
      profileImage: v.profileImage,
      address: v.address,
      skills: v.skills,
      specializations: v.specializations,
      languages: v.languages,
      experience: v.experience,
      certifications: v.certifications,
      trainingCompleted: v.trainingCompleted,
      availability: v.availability,
      availabilitySchedule: v.availabilitySchedule,
      currentLocation: v.currentLocation,
      preferredWorkAreas: v.preferredWorkAreas,
      willingToTravel: v.willingToTravel,
      maxTravelDistance: v.maxTravelDistance,
      assignedDisasters: v.assignedDisasters,
      currentMission: v.currentMission,
      completedMissions: v.completedMissions,
      totalHoursServed: v.totalHoursServed,
      rating: v.rating,
      totalReviews: v.totalReviews,
      badges: v.badges,
      emergencyContact: v.emergencyContact,
      healthInfo: v.healthInfo,
      hasOwnVehicle: v.hasOwnVehicle,
      vehicleType: v.vehicleType,
      vehicleNumber: v.vehicleNumber,
      status: v.status,
      verificationStatus: v.verificationStatus,
      joinedAt: v.joinedAt,
      lastActiveAt: v.lastActiveAt,
      team: teamData,
    };

    return NextResponse.json({
      success: true,
      data: { volunteer: response },
    });
  } catch (error) {
    console.error('Get volunteer by-id error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
