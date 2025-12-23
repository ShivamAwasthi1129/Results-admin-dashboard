import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User, Disaster, Emergency, Volunteer, ServiceProvider } from '@/models';
import { verifyAuth, canPerform } from '@/lib/auth';

// GET - Get reports data
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'viewDashboard')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    let reportData: any = {};

    switch (reportType) {
      case 'disaster':
        const disasters = await Disaster.find(dateFilter).lean();
        reportData = {
          title: 'Disaster Report',
          summary: {
            total: disasters.length,
            active: disasters.filter((d: any) => d.status === 'active').length,
            resolved: disasters.filter((d: any) => d.status === 'resolved').length,
            critical: disasters.filter((d: any) => d.severity === 'critical').length,
          },
          byType: disasters.reduce((acc: any, d: any) => {
            acc[d.type] = (acc[d.type] || 0) + 1;
            return acc;
          }, {}),
          bySeverity: disasters.reduce((acc: any, d: any) => {
            acc[d.severity] = (acc[d.severity] || 0) + 1;
            return acc;
          }, {}),
          recentDisasters: disasters.slice(0, 10),
        };
        break;

      case 'volunteer':
        const volunteers = await Volunteer.find(dateFilter).populate('userId', 'name email phone').lean();
        reportData = {
          title: 'Volunteer Report',
          summary: {
            total: volunteers.length,
            available: volunteers.filter((v: any) => v.availability === 'available').length,
            onMission: volunteers.filter((v: any) => v.availability === 'on_mission').length,
            totalMissionsCompleted: volunteers.reduce((acc: any, v: any) => acc + (v.completedMissions || 0), 0),
          },
          byAvailability: volunteers.reduce((acc: any, v: any) => {
            acc[v.availability] = (acc[v.availability] || 0) + 1;
            return acc;
          }, {}),
          topVolunteers: volunteers
            .sort((a: any, b: any) => (b.completedMissions || 0) - (a.completedMissions || 0))
            .slice(0, 10),
        };
        break;

      case 'emergency':
        const emergencies = await Emergency.find(dateFilter).lean();
        reportData = {
          title: 'Emergency Response Report',
          summary: {
            total: emergencies.length,
            pending: emergencies.filter((e: any) => e.status === 'pending').length,
            inProgress: emergencies.filter((e: any) => e.status === 'in_progress').length,
            resolved: emergencies.filter((e: any) => e.status === 'resolved').length,
            critical: emergencies.filter((e: any) => e.priority === 'critical').length,
          },
          byType: emergencies.reduce((acc: any, e: any) => {
            acc[e.type] = (acc[e.type] || 0) + 1;
            return acc;
          }, {}),
          byPriority: emergencies.reduce((acc: any, e: any) => {
            acc[e.priority] = (acc[e.priority] || 0) + 1;
            return acc;
          }, {}),
          recentEmergencies: emergencies.slice(0, 10),
        };
        break;

      case 'service':
        const providers = await ServiceProvider.find(dateFilter).populate('userId', 'name email phone').lean();
        reportData = {
          title: 'Service Provider Report',
          summary: {
            total: providers.length,
            verified: providers.filter((p: any) => p.verified).length,
            emergencyAvailable: providers.filter((p: any) => p.isAvailableForEmergency).length,
            avgRating: providers.length > 0
              ? (providers.reduce((acc: any, p: any) => acc + (p.rating || 0), 0) / providers.length).toFixed(1)
              : 0,
          },
          byCategory: providers.reduce((acc: any, p: any) => {
            acc[p.category] = (acc[p.category] || 0) + 1;
            return acc;
          }, {}),
          topProviders: providers
            .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 10),
        };
        break;

      default: // summary
        const [totalUsers, totalDisasters, totalEmergencies, totalVolunteers, totalProviders] = await Promise.all([
          User.countDocuments(dateFilter),
          Disaster.countDocuments(dateFilter),
          Emergency.countDocuments(dateFilter),
          Volunteer.countDocuments(dateFilter),
          ServiceProvider.countDocuments(dateFilter),
        ]);

        const activeDisasters = await Disaster.countDocuments({ ...dateFilter, status: 'active' });
        const pendingEmergencies = await Emergency.countDocuments({ ...dateFilter, status: 'pending' });
        const availableVolunteers = await Volunteer.countDocuments({ ...dateFilter, availability: 'available' });
        const verifiedProviders = await ServiceProvider.countDocuments({ ...dateFilter, verified: true });

        reportData = {
          title: 'Summary Report',
          overview: {
            totalUsers,
            totalDisasters,
            totalEmergencies,
            totalVolunteers,
            totalProviders,
            activeDisasters,
            pendingEmergencies,
            availableVolunteers,
            verifiedProviders,
          },
          period: {
            startDate: startDate || 'All time',
            endDate: endDate || 'Present',
          },
        };
    }

    return NextResponse.json({
      success: true,
      data: {
        report: reportData,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Generate a new report
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'viewDashboard')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, format, dateRange } = body;

    // In a real application, this would generate actual files
    // For now, we return metadata about the generated report
    const reportId = `RPT-${Date.now()}`;

    return NextResponse.json({
      success: true,
      data: {
        reportId,
        type,
        format,
        dateRange,
        status: 'ready',
        downloadUrl: `/api/reports/download?id=${reportId}`,
        generatedAt: new Date().toISOString(),
        generatedBy: tokenPayload.userId,
      },
      message: 'Report generated successfully',
    });

  } catch (error: any) {
    console.error('Generate report error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

