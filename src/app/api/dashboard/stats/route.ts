import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Volunteer from '@/models/Volunteer';
import ServiceProvider from '@/models/ServiceProvider';
import Disaster from '@/models/Disaster';
import Emergency from '@/models/Emergency';
import { verifyAuth } from '@/lib/auth';

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

    // Get counts
    const [
      totalUsers,
      totalAdmins,
      totalVolunteers,
      availableVolunteers,
      totalServiceProviders,
      verifiedServiceProviders,
      activeDisasters,
      resolvedDisasters,
      criticalDisasters,
      pendingEmergencies,
      inProgressEmergencies,
      resolvedEmergencies,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: { $in: ['super_admin', 'admin'] } }),
      Volunteer.countDocuments(),
      Volunteer.countDocuments({ availability: 'available' }),
      ServiceProvider.countDocuments(),
      ServiceProvider.countDocuments({ verified: true }),
      Disaster.countDocuments({ status: 'active' }),
      Disaster.countDocuments({ status: 'resolved' }),
      Disaster.countDocuments({ severity: 'critical', status: 'active' }),
      Emergency.countDocuments({ status: 'pending' }),
      Emergency.countDocuments({ status: 'in_progress' }),
      Emergency.countDocuments({ status: 'resolved' }),
    ]);

    // Get total affected population from active disasters
    const activeDisastersData = await Disaster.find({ status: { $in: ['active', 'monitoring'] } });
    const totalAffectedPeople = activeDisastersData.reduce(
      (sum, d) => sum + (d.affectedPopulation || 0),
      0
    );

    // Get recent disasters
    const recentDisasters = await Disaster.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title type severity status location createdAt');

    // Get recent emergencies
    const recentEmergencies = await Emergency.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title type priority status createdAt');

    // Calculate month-over-month changes (simplified)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const lastMonthUsers = await User.countDocuments({ createdAt: { $lt: lastMonth } });
    const lastMonthVolunteers = await Volunteer.countDocuments({ createdAt: { $lt: lastMonth } });

    const userGrowth = lastMonthUsers > 0 ? ((totalUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;
    const volunteerGrowth = lastMonthVolunteers > 0 ? ((totalVolunteers - lastMonthVolunteers) / lastMonthVolunteers) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalAdmins,
          totalVolunteers,
          availableVolunteers,
          totalServiceProviders,
          verifiedServiceProviders,
          activeDisasters,
          resolvedDisasters,
          criticalDisasters,
          pendingEmergencies,
          inProgressEmergencies,
          resolvedEmergencies,
          totalAffectedPeople,
        },
        growth: {
          users: Math.round(userGrowth),
          volunteers: Math.round(volunteerGrowth),
        },
        recentDisasters,
        recentEmergencies,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

