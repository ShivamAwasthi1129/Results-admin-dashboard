import { NextResponse } from 'next/server';
import { isInUSA, getApproximateUSAState, USA_STATES } from '@/lib/geocoding';

// NASA EONET API for live natural events
const EONET_API = 'https://eonet.gsfc.nasa.gov/api/v3/events';

interface EONETEvent {
  id: string;
  title: string;
  description: string;
  link: string;
  closed: string | null;
  categories: { id: string; title: string }[];
  sources: { id: string; url: string }[];
  geometry: {
    magnitudeValue: number | null;
    magnitudeUnit: string | null;
    date: string;
    type: string;
    coordinates: number[];
  }[];
}

export async function GET() {
  try {
    // Fetch live events from NASA EONET with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let response: Response;
    try {
      response = await fetch(`${EONET_API}?status=open&limit=200`, {
        next: { revalidate: 300 }, // Cache for 5 minutes
        signal: controller.signal,
        headers: {
          'User-Agent': 'Results-Admin-Dashboard/1.0',
        }
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('EONET API request timed out');
        throw new Error('Request timeout');
      }
      throw fetchError;
    }

    if (!response.ok) {
      throw new Error(`EONET API returned ${response.status}`);
    }

    const data = await response.json();
    const events: EONETEvent[] = data.events || [];

    // Transform EONET data to our format
    const disasters = events.map(event => {
      const latestGeometry = event.geometry[event.geometry.length - 1];
      const category = event.categories[0];
      
      // Map EONET categories to our severity levels
      const severityMap: Record<string, string> = {
        'wildfires': 'high',
        'severeStorms': 'critical',
        'volcanoes': 'critical',
        'earthquakes': 'high',
        'floods': 'high',
        'landslides': 'medium',
        'seaLakeIce': 'low',
        'snow': 'low',
        'drought': 'medium',
        'dustHaze': 'low',
        'tempExtremes': 'medium',
        'waterColor': 'low',
        'manmade': 'medium'
      };

      // Map EONET categories to our types
      const typeMap: Record<string, string> = {
        'wildfires': 'wildfire',
        'severeStorms': 'cyclone',
        'volcanoes': 'volcanic',
        'earthquakes': 'earthquake',
        'floods': 'flood',
        'landslides': 'landslide',
        'seaLakeIce': 'iceberg',
        'snow': 'other',
        'drought': 'drought',
        'dustHaze': 'other',
        'tempExtremes': 'other',
        'waterColor': 'other',
        'manmade': 'other'
      };

      const lat = latestGeometry?.coordinates[1] || 0;
      const lng = latestGeometry?.coordinates[0] || 0;
      
      // Determine country and state from coordinates
      let country: string | undefined;
      let state: string | undefined;
      
      if (isInUSA(lat, lng)) {
        country = 'United States';
        state = getApproximateUSAState(lat, lng) || undefined;
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description || `Live ${category?.title || 'event'} detected by NASA satellites`,
        type: typeMap[category?.id] || 'other',
        category: category?.title || 'Unknown',
        severity: severityMap[category?.id] || 'medium',
        status: event.closed ? 'resolved' : 'active',
        location: {
          coordinates: {
            lat,
            lng
          },
          country,
          state,
          region: state ? `${state}, USA` : undefined
        },
        magnitude: latestGeometry?.magnitudeValue,
        magnitudeUnit: latestGeometry?.magnitudeUnit,
        date: latestGeometry?.date,
        source: event.sources[0]?.url || event.link,
        isLive: true
      };
    });

    const currentYear = new Date().getFullYear();
    const isCurrentYear = (dateStr: string | undefined) => {
      if (!dateStr) return false;
      const y = new Date(dateStr).getFullYear();
      return !isNaN(y) && y === currentYear;
    };
    const disastersCurrentYear = disasters.filter(d => isCurrentYear(d.date));

    // Also fetch some additional data from ReliefWeb API for context
    let reliefWebData: any[] = [];
    try {
      const reliefWebController = new AbortController();
      const reliefWebTimeout = setTimeout(() => reliefWebController.abort(), 10000);
      
      let reliefWebResponse: Response;
      try {
        reliefWebResponse = await fetch(
          'https://api.reliefweb.int/v1/disasters?appname=results-admin&limit=10&preset=latest',
          { 
            next: { revalidate: 300 },
            signal: reliefWebController.signal,
            headers: {
              'User-Agent': 'Results-Admin-Dashboard/1.0',
            }
          }
        );
        clearTimeout(reliefWebTimeout);
      } catch (reliefWebError: any) {
        clearTimeout(reliefWebTimeout);
        if (reliefWebError.name === 'AbortError') {
          console.error('ReliefWeb API request timed out');
        }
        throw reliefWebError;
      }
      
      if (reliefWebResponse.ok) {
        const rwData = await reliefWebResponse.json();
        const mapped = (rwData.data || []).map((item: any) => ({
          id: `rw-${item.id}`,
          title: item.fields?.name || 'Unknown Disaster',
          description: item.fields?.description || '',
          type: item.fields?.type?.[0]?.name?.toLowerCase() || 'other',
          category: item.fields?.type?.[0]?.name || 'Unknown',
          severity: 'high',
          status: item.fields?.status || 'active',
          location: {
            country: item.fields?.country?.[0]?.name,
            region: item.fields?.primary_country?.region?.[0]?.name
          },
          date: item.fields?.date?.created,
          source: item.fields?.url_alias ? `https://reliefweb.int${item.fields.url_alias}` : null,
          isLive: true,
          fromReliefWeb: true
        }));
        reliefWebData = mapped.filter((d: { date?: string }) => isCurrentYear(d.date));
      }
    } catch (e) {
      console.log('ReliefWeb fetch failed, continuing with EONET data');
    }

    return NextResponse.json({
      success: true,
      data: {
        disasters: [...disastersCurrentYear, ...reliefWebData],
        metadata: {
          eonetCount: disastersCurrentYear.length,
          reliefWebCount: reliefWebData.length,
          lastUpdated: new Date().toISOString(),
          sources: ['NASA EONET', 'ReliefWeb'],
          filter: `Current year (${currentYear}) only`
        }
      }
    });

  } catch (error: any) {
    console.error('Live disasters fetch error:', error);
    
    // Return cached/fallback data if API fails
    return NextResponse.json({
      success: true,
      data: {
        disasters: [],
        metadata: {
          error: 'Failed to fetch live data',
          lastUpdated: new Date().toISOString()
        }
      }
    });
  }
}

