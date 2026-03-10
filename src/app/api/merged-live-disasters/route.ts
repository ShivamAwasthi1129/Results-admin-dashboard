import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EONET_WILDFIRES_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=100';
const EONET_SEVERE_STORMS_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open&limit=100';
const EONET_VOLCANOES_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes&status=open&limit=100';

/** Disaster-alert-service base URL (e.g. https://disaster-alert-service.vercel.app) – domain from env, path /api/v1/disasters */
function getDisasterAlertServiceUrl(): string {
  const raw = process.env.NEXT_PUBLIC_NGROK_DOMAIN;
  if (!raw) return '';
  return raw.replace(/\/$/, '');
}

function categoryToType(categories?: { id: string; title: string }[]): string {
  if (!categories?.length) return 'other';
  const id = (categories[0]?.id || '').toLowerCase();
  const title = (categories[0]?.title || '').toLowerCase();
  if (id.includes('wildfire') || title.includes('wildfire')) return 'wildfire';
  if (id.includes('storm') || title.includes('storm')) return 'cyclone';
  if (id.includes('volcano') || title.includes('volcano')) return 'volcanic';
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

async function fetchEonetHurricaneWildfiresAndVolcanoes(): Promise<any[]> {
  const urls = [EONET_WILDFIRES_URL, EONET_SEVERE_STORMS_URL, EONET_VOLCANOES_URL];
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
  const props = d.properties ?? {};
  const loc = d.location ?? props.location ?? {};
  const geom = d.geometry;
  let rawCoords =
    loc.coordinates ??
    props.coordinates ??
    (geom && Array.isArray(geom.coordinates) ? geom.coordinates : null) ??
    d.coordinates;
  if (geom?.type === 'Polygon' && Array.isArray(geom.coordinates?.[0]?.[0])) {
    rawCoords = geom.coordinates[0][0];
  } else if (geom?.type === 'MultiPoint' && Array.isArray(geom.coordinates?.[0])) {
    rawCoords = geom.coordinates[0];
  }
  const coords = rawCoords;
  if (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number') {
    coordinates = { lat: Number(coords[1]), lng: Number(coords[0]) };
  } else if (coords && typeof coords === 'object' && 'lat' in coords && 'lng' in coords) {
    coordinates = { lat: Number(coords.lat), lng: Number(coords.lng) };
  } else if (d.lat != null && d.lng != null) {
    coordinates = { lat: Number(d.lat), lng: Number(d.lng) };
  } else if (props.lat != null && props.lng != null) {
    coordinates = { lat: Number(props.lat), lng: Number(props.lng) };
  } else if (d.latitude != null && d.longitude != null) {
    coordinates = { lat: Number(d.latitude), lng: Number(d.longitude) };
  }
  // Prefer properties.type for GeoJSON features (d.type is "Feature"); otherwise use d.type / category
  const disasterType =
    props.type ?? (d.type === 'Feature' ? undefined : d.type) ?? loc.type ?? props.disasterType ?? props.category ?? 'other';
  const typeRaw = String(disasterType)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  return {
    id: d.id ?? props.id ?? d._id ?? `disaster-alert-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: d.title ?? props.title ?? props.name ?? 'Untitled',
    description: d.description ?? props.description ?? '',
    type: typeRaw,
    category: props.category ?? d.category ?? (d.type === 'Feature' ? typeRaw : d.type) ?? typeRaw,
    severity: d.severity ?? props.severity ?? props.alert_level ?? 'medium',
    status: d.status ?? props.status ?? (d.active === false || props.active === false ? 'closed' : 'open'),
    location: {
      coordinates,
      country: loc.country ?? props.country ?? d.country,
      state: loc.state ?? props.state ?? d.state,
      region: loc.region ?? props.region ?? d.region,
    },
    date: d.date ?? props.date ?? props.createdAt ?? d.event_date ?? props.inserted_at ?? new Date().toISOString(),
    source: d.source ?? props.source ?? 'Disaster Alert Service',
    isLive: true,
    magnitude: d.magnitude ?? props.magnitude ?? props.event_magnitude,
    magnitudeUnit: d.magnitudeUnit ?? props.magnitudeUnit,
  };
}

/** Fetch floods, snowstorm, earthquakes from disaster-alert-service: ${NEXT_PUBLIC_NGROK_DOMAIN}/api/v1/disasters */
async function fetchDisasterAlertServiceDisasters(): Promise<any[]> {
  try {
    const base = getDisasterAlertServiceUrl();
    if (!base) return [];
    const url = `${base}/api/v1/disasters`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const list =
      Array.isArray(data?.data?.disasters)
        ? data.data.disasters
        : Array.isArray(data?.disasters)
          ? data.disasters
          : Array.isArray(data?.features)
            ? data.features
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.events)
                ? data.events
                : Array.isArray(data)
                  ? data
                  : [];
    return list
      .filter((d: any) => d != null && typeof d === 'object')
      .map(normalizeBackendDisaster)
      .filter((d: any) => d.location?.coordinates);
  } catch (e) {
    console.error('[merged-live-disasters] Disaster Alert Service fetch error:', e);
    return [];
  }
}

export async function GET() {
  try {
    const [eonetDisasters, disasterAlertDisasters] = await Promise.all([
      fetchEonetHurricaneWildfiresAndVolcanoes().catch((e) => {
        console.error('[merged-live-disasters] EONET fetch error:', e);
        return [];
      }),
      fetchDisasterAlertServiceDisasters(),
    ]);
    const disasters = [...eonetDisasters, ...disasterAlertDisasters];
    return NextResponse.json({
      success: true,
      data: {
        disasters,
        metadata: {
          lastUpdated: new Date().toISOString(),
          source: 'NASA EONET (wildfires, severe storms, volcanoes) + Disaster Alert Service (floods, snowstorm, earthquakes)',
          eonetCount: eonetDisasters.length,
          disasterAlertCount: disasterAlertDisasters.length,
        },
      },
    });
  } catch (err) {
    console.error('[merged-live-disasters] Error:', err);
    return NextResponse.json({ success: false, error: 'Live disasters service error' }, { status: 500 });
  }
}
