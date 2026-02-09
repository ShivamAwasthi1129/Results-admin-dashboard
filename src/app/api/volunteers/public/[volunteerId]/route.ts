import { NextRequest, NextResponse } from 'next/server';
import { getVolunteerById } from '../../getVolunteerById';

/**
 * GET /api/volunteers/public/[volunteerId]
 * Same as by-id: fetch volunteer by ID for mobile app. No authorization required.
 * [volunteerId] can be: 6-digit volunteerId or MongoDB _id.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ volunteerId: string }> }
) {
  try {
    const { volunteerId } = await params;
    if (!volunteerId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Volunteer ID is required' },
        { status: 400 }
      );
    }

    const result = await getVolunteerById(volunteerId);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Volunteer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get volunteer public error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
