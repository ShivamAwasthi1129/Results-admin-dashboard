/**
 * Converts a GeoJSON FeatureCollection (or array of features) from the disasters API
 * into the LiveDisaster shape used by the dashboard and map.
 */

/** Minimal GeoJSON geometry for Point / Polygon / MultiPolygon */
interface GeoGeometry {
  type: string;
  coordinates?: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeoDisasterFeature {
  type?: string;
  id?: string | number;
  geometry?: GeoGeometry;
  properties?: Record<string, unknown>;
}

export interface GeoFeatureCollection {
  type?: string;
  features?: GeoDisasterFeature[];
}

export interface LiveDisasterFromGeo {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  severity: string;
  status: string;
  location: {
    coordinates?: { lat: number; lng: number };
    country?: string;
    state?: string;
    region?: string;
  };
  magnitude?: number;
  magnitudeUnit?: string;
  date: string;
  source: string;
  url?: string;
  isLive: boolean;
  geometry?: { type: string; coordinates: number[] | number[][] | number[][][] | number[][][][] };
}

function extractPoint(geometry: GeoGeometry | undefined): { lat: number; lng: number } | undefined {
  if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) {
    return undefined;
  }
  const [lng, lat] = geometry.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') return undefined;
  return { lat, lng };
}

function getString(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function getNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

/**
 * Converts API raw response (GeoJSON FeatureCollection or features array) to LiveDisaster[].
 */
export function featureCollectionToDisasters(raw: unknown): LiveDisasterFromGeo[] {
  const features: GeoDisasterFeature[] = [];

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.features) && obj.features.length > 0) {
      features.push(...(obj.features as GeoDisasterFeature[]));
    } else if (Array.isArray(raw)) {
      features.push(...(raw as GeoDisasterFeature[]));
    }
  }

  return features.map((feature, index): LiveDisasterFromGeo => {
    const props = feature.properties || {};
    const id = feature.id != null ? String(feature.id) : `geo-${index}`;
    const point = extractPoint(feature.geometry);
    const geometry = feature.geometry as LiveDisasterFromGeo['geometry'] | undefined;

    return {
      id,
      title: getString(props.title ?? props.name ?? props.event_type ?? props.eventType, 'Disaster'),
      description: getString(props.description ?? props.details, ''),
      type: getString(props.type ?? props.event_type ?? props.eventType ?? props.category, 'other'),
      category: getString(props.category ?? props.type ?? props.event_type, 'other'),
      severity: getString(props.severity ?? props.magnitude_level, 'medium'),
      status: getString(props.status, 'active'),
      location: {
        coordinates: point,
        country: getString(props.country ?? props.country_code, '') || undefined,
        state: getString(props.state ?? props.region ?? props.admin1, '') || undefined,
        region: getString(props.region ?? props.area, '') || undefined,
      },
      magnitude: getNumber(props.magnitude ?? props.mag),
      magnitudeUnit: getString(props.magnitude_unit ?? props.magnitudeUnit ?? props.unit, '') || undefined,
      date: getString(props.date ?? props.start_date ?? props.startDate ?? props.timestamp, new Date().toISOString()),
      source: getString(props.source ?? props.provider, 'Disasters API'),
      url: getString(props.url ?? props.link ?? props.source_url, '') || undefined,
      isLive: true,
      ...(geometry && { geometry }),
    };
  });
}
