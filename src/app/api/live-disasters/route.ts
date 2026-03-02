import { NextResponse } from 'next/server';

const EONET_EVENTS_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events';

/** Map EONET category id to display type/category */
function categoryToType(categories?: { id: string; title: string }[]): string {
  if (!categories?.length) return 'other';
  const id = (categories[0]?.id || '').toLowerCase();
  const title = (categories[0]?.title || '').toLowerCase();
  if (id.includes('wildfire') || title.includes('wildfire')) return 'wildfire';
  if (id.includes('storm') || title.includes('storm')) return 'cyclone';
  if (id.includes('flood') || title.includes('flood')) return 'flood';
  if (id.includes('earthquake') || title.includes('earthquake')) return 'earthquake';
  if (id.includes('volcano') || title.includes('volcano')) return 'volcanic';
  if (id.includes('iceberg') || title.includes('iceberg')) return 'iceberg';
  if (id.includes('drought') || title.includes('drought')) return 'drought';
  if (id.includes('landslide') || title.includes('landslide')) return 'landslide';
  return id || title || 'other';
}

/** Derive severity from magnitude or default to medium */
function deriveSeverity(magnitudeValue?: number): string {
  if (magnitudeValue == null) return 'medium';
  if (magnitudeValue >= 7) return 'critical';
  if (magnitudeValue >= 5) return 'high';
  if (magnitudeValue >= 3) return 'medium';
  return 'low';
}

/** Extract first point from EONET geometry (Point, Polygon, or array of { coordinates, date }) */
function getCoordinates(geometry: any): { lat: number; lng: number } | undefined {
  if (!geometry) return undefined;
  // EONET v3: geometry can be array of { coordinates: [lon, lat], date }
  const first = Array.isArray(geometry) ? geometry[0] : geometry;
  if (first?.coordinates && Array.isArray(first.coordinates)) {
    const [lon, lat] = first.coordinates;
    if (typeof lat === 'number' && typeof lon === 'number') return { lat, lng: lon };
  }
  if (first?.type === 'Point' && Array.isArray(first.coordinates)) {
    const [lon, lat] = first.coordinates;
    return { lat, lng: lon };
  }
  if (first?.type === 'Polygon' && Array.isArray(first.coordinates?.[0]?.[0])) {
    const [lon, lat] = first.coordinates[0][0];
    return { lat, lng: lon };
  }
  return undefined;
}

export async function GET() {
  try {
    const url = `${EONET_EVENTS_URL}?status=open&limit=100`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const raw = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: raw?.message || 'EONET request failed' },
        { status: 502 }
      );
    }

    const events = raw.events || raw.features || [];
    const disasters = events.map((e: any) => {
      const props = e.properties || e;
      const geom = e.geometry || e.geometries?.[0];
      const coords = getCoordinates(geom);
      const categories = props.categories || [];
      const type = categoryToType(categories);
      const magnitudeValue = props.magnitudeValue ?? props.magnitude;
      const date = props.date || props.closed || new Date().toISOString();

      return {
        id: props.id || e.id || `eonet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: props.title || 'Untitled event',
        description: props.description || '',
        type,
        category: type,
        severity: deriveSeverity(magnitudeValue),
        status: props.closed ? 'closed' : 'open',
        location: {
          coordinates: coords,
          country: undefined,
          state: undefined,
          region: undefined,
        },
        magnitude: magnitudeValue,
        magnitudeUnit: props.magnitudeUnit,
        date,
        source: props.sources?.[0]?.title || 'NASA EONET',
        isLive: true,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        disasters,
        metadata: {
          lastUpdated: new Date().toISOString(),
          source: 'NASA EONET',
        },
      },
    });
  } catch (err) {
    console.error('[api/live-disasters] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Live disasters service error' },
      { status: 500 }
    );
  }
}
