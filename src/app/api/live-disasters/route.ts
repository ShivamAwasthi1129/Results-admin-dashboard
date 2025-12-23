import { NextResponse } from 'next/server';

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
    // Fetch live events from NASA EONET
    const response = await fetch(`${EONET_API}?status=open&limit=50`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from EONET');
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
        'seaLakeIce': 'other',
        'snow': 'other',
        'drought': 'drought',
        'dustHaze': 'other',
        'tempExtremes': 'other',
        'waterColor': 'other',
        'manmade': 'other'
      };

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
            lat: latestGeometry?.coordinates[1] || 0,
            lng: latestGeometry?.coordinates[0] || 0
          }
        },
        magnitude: latestGeometry?.magnitudeValue,
        magnitudeUnit: latestGeometry?.magnitudeUnit,
        date: latestGeometry?.date,
        source: event.sources[0]?.url || event.link,
        isLive: true
      };
    });

    // Also fetch some additional data from ReliefWeb API for context
    let reliefWebData: any[] = [];
    try {
      const reliefWebResponse = await fetch(
        'https://api.reliefweb.int/v1/disasters?appname=results-admin&limit=10&preset=latest',
        { next: { revalidate: 300 } }
      );
      
      if (reliefWebResponse.ok) {
        const rwData = await reliefWebResponse.json();
        reliefWebData = (rwData.data || []).map((item: any) => ({
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
      }
    } catch (e) {
      console.log('ReliefWeb fetch failed, continuing with EONET data');
    }

    return NextResponse.json({
      success: true,
      data: {
        disasters: [...disasters, ...reliefWebData],
        metadata: {
          eonetCount: disasters.length,
          reliefWebCount: reliefWebData.length,
          lastUpdated: new Date().toISOString(),
          sources: ['NASA EONET', 'ReliefWeb']
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

