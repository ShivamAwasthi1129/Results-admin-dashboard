import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EONET_WILDFIRES_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=100';
const EONET_SEVERE_STORMS_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open&limit=100';

function getBackendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_NGROK_DOMAIN || process.env.DOMAIN_NAME || 'https://r3sults-backend.vercel.app';
  return raw.replace(/\/$/, '');
}

function categoryToType(categories?: { id: string; title: string }[]): string {
  if (!categories?.length) return 'other';
  const id = (categories[0]?.id || '').toLowerCase();
  const title = (categories[0]?.title || '').toLowerCase();
  if (id.includes('wildfire') || title.includes('wildfire')) return 'wildfire';
  if (id.includes('storm') || title.includes('storm')) return 'cyclone';
  return id || title || 'other';
}

function deriveSeverity(magnitudeValue?: number): string {
  if (magnitudeValue == null) return 'medium';
  if (magnitudeValue >= 7) return 'critical';
  if (magnitudeValue >= 5) return 'high';
  if (magnitudeValue >= 3) return 'medium';
  return 'low';
}

function getCoordinates(geometry: any): { lat: number; lng: number } | undefined {
  if (!geometry) return undefined;
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

async function fetchEonetHurricaneAndWildfires(): Promise<any[]> {
  const urls = [EONET_WILDFIRES_URL, EONET_SEVERE_STORMS_URL];
  const allEvents: any[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const raw = await res.json();
      const events = raw.events ?? raw.features ?? [];
      if (Array.isArray(events)) allEvents.push(...events);
    } catch {
      /* skip */
    }
  }
  return allEvents.map((e: any) => {
    const props = e.properties ?? e;
    const geom = e.geometry ?? e.geometries?.[0];
    const coords = getCoordinates(geom);
    const categories = props.categories ?? e.categories ?? [];
    const type = categoryToType(categories);
    const firstGeom = Array.isArray(geom) ? geom[0] : geom;
    const magnitudeValue = props.magnitudeValue ?? props.magnitude ?? firstGeom?.magnitudeValue ?? firstGeom?.magnitude;
    const date = props.date ?? props.closed ?? e.closed ?? firstGeom?.date ?? new Date().toISOString();
    const sourceName = (props.sources?.[0] ?? e.sources?.[0])?.title ?? 'NASA EONET';
    return {
      id: props.id ?? e.id ?? `eonet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: props.title ?? e.title ?? 'Untitled event',
      description: props.description ?? e.description ?? '',
      type,
      category: type,
      severity: deriveSeverity(magnitudeValue),
      status: (props.closed ?? e.closed) ? 'closed' : 'open',
      location: { coordinates: coords, country: undefined, state: undefined, region: undefined },
      magnitude: magnitudeValue,
      magnitudeUnit: props.magnitudeUnit ?? firstGeom?.magnitudeUnit,
      date,
      source: sourceName,
      isLive: true,
    };
  });
}

function normalizeBackendDisaster(d: any): any {
  let coordinates: { lat: number; lng: number } | undefined;
  const loc = d.location ?? {};
  const coords = loc.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    coordinates = { lat: Number(coords[1]), lng: Number(coords[0]) };
  } else if (coords && typeof coords === 'object' && 'lat' in coords && 'lng' in coords) {
    coordinates = { lat: Number(coords.lat), lng: Number(coords.lng) };
  }
  return {
    id: d.id ?? d._id ?? `backend-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: d.title ?? 'Untitled',
    description: d.description ?? '',
    type: (d.type || d.category || 'other').toLowerCase().replace(/\s+/g, '_'),
    category: d.category ?? d.type ?? 'other',
    severity: d.severity ?? 'medium',
    status: d.status ?? 'active',
    location: { coordinates, country: loc.country, state: loc.state, region: loc.region },
    date: d.date ?? d.createdAt ?? new Date().toISOString(),
    source: d.source ?? 'Backend',
    isLive: true,
    magnitude: d.magnitude,
    magnitudeUnit: d.magnitudeUnit,
  };
}

async function fetchBackendOtherDisasters(): Promise<any[]> {
  try {
    const backend = getBackendUrl();
    const url = `${backend}/api/live-disasters`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data?.data?.disasters) ? data.data.disasters : Array.isArray(data?.disasters) ? data.disasters : [];
    const excludeTypes = ['wildfire', 'cyclone', 'hurricane'];
    const filtered = list.filter((d: any) => {
      const t = (d.type || d.category || '').toLowerCase();
      return !excludeTypes.some((ex) => t.includes(ex));
    });
    return filtered.map(normalizeBackendDisaster);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [eonetDisasters, backendDisasters] = await Promise.all([
      fetchEonetHurricaneAndWildfires().catch(() => []),
      fetchBackendOtherDisasters(),
    ]);
    const disasters = [...eonetDisasters, ...backendDisasters];
    return NextResponse.json({
      success: true,
      data: {
        disasters,
        metadata: {
          lastUpdated: new Date().toISOString(),
          source: 'NASA EONET (hurricane, wildfire) + Backend (other)',
          eonetCount: eonetDisasters.length,
          backendCount: backendDisasters.length,
        },
      },
    });
  } catch (err) {
    console.error('[merged-live-disasters] Error:', err);
    return NextResponse.json({ success: false, error: 'Live disasters service error' }, { status: 500 });
  }
}
