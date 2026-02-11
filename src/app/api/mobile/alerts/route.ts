import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Emergency from '@/models/Emergency';
import { getApiUrl, fetchWithTimeout } from '@/lib/server-api';

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/**
 * GET /api/mobile/alerts
 * Returns unified alerts for mobile (weather + emergencies).
 * Query: lat, lon (optional - for weather alerts), limit (optional, default 20), filter (optional - type filter).
 * No auth required (alerts are public/situational).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const filterType = searchParams.get('filter') || '';

    const alerts: Array<{
      alertId: string;
      type: string;
      description: string;
      timestamp: string;
      timestampAbsolute?: string;
      iconType: string;
      source: 'weather' | 'emergency';
    }> = [];

    const latNum = lat ? parseFloat(lat) : 25.7617;
    const lonNum = lon ? parseFloat(lon) : -80.1918;

    try {
      const weatherUrl = getApiUrl(`/api/weather?type=alerts&lat=${latNum}&lon=${lonNum}`);
      const res = await fetchWithTimeout(weatherUrl, {}, 10000);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const now = Date.now() / 1000;
        data.data.forEach((a: any, i: number) => {
          const event = a.event || 'Alert';
          const start = a.start != null ? a.start : now - 120;
          alerts.push({
            alertId: `weather-${i}-${start}`,
            type: event,
            description: a.description || event,
            timestamp: relativeTime(new Date(start * 1000)),
            timestampAbsolute: new Date(start * 1000).toISOString(),
            iconType: 'warning',
            source: 'weather',
          });
        });
      }
    } catch (e) {
      console.warn('Mobile alerts: weather fetch failed', e);
    }

    await connectDB();
    const emergencies = await Emergency.find({
      status: { $in: ['pending', 'dispatched', 'in_progress'] },
      priority: { $in: ['high', 'critical'] },
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    const typeToTitle: Record<string, string> = {
      rescue: 'Rescue Alert',
      medical: 'Medical Assistance Alert',
      evacuation: 'Structural Collapse Warning',
      supply_delivery: 'Supply & Relief Alert',
      shelter: 'Shelter Alert',
      other: 'Emergency Alert',
    };

    emergencies.forEach((em: any) => {
      const title = em.title || typeToTitle[em.type] || 'Emergency Alert';
      if (filterType && title.toLowerCase().indexOf(filterType.toLowerCase()) < 0) return;
      alerts.push({
        alertId: `emergency-${em._id}`,
        type: title,
        description: em.description || em.title || 'Authorities report activity in your vicinity.',
        timestamp: relativeTime(em.createdAt || new Date()),
        timestampAbsolute: (em.createdAt || new Date()).toISOString?.()?.replace?.('Z', 'Z'),
        iconType: 'warning',
        source: 'emergency',
      });
    });

    alerts.sort((a, b) => {
      const tA = a.timestampAbsolute ? new Date(a.timestampAbsolute).getTime() : 0;
      const tB = b.timestampAbsolute ? new Date(b.timestampAbsolute).getTime() : 0;
      return tB - tA;
    });

    const sliced = alerts.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: sliced,
      pagination: { limit, total: alerts.length },
    });
  } catch (error) {
    console.error('Mobile alerts error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
