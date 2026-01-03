// Utility to get country and state from coordinates using reverse geocoding
// Using OpenStreetMap Nominatim API (free, no API key required)

interface GeocodeResult {
  country?: string;
  state?: string;
  countryCode?: string;
}

// USA States mapping
export const USA_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
];

// Cache for geocoding results to avoid too many API calls
const geocodeCache = new Map<string, GeocodeResult>();

export async function getLocationFromCoordinates(
  lat: number,
  lng: number
): Promise<GeocodeResult> {
  // Create cache key
  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  
  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    // Use Nominatim reverse geocoding (free, rate limited)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Results-Admin-Dashboard/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    const address = data.address || {};

    const result: GeocodeResult = {
      country: address.country || address.country_code?.toUpperCase(),
      state: address.state || address.region || address.state_district,
      countryCode: address.country_code?.toUpperCase(),
    };

    // Cache the result
    geocodeCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Geocoding error:', error);
    // Return empty result on error
    return {};
  }
}

// Check if coordinates are in USA
export function isInUSA(lat: number, lng: number): boolean {
  // Rough bounding box for USA (including Alaska and Hawaii)
  return (
    (lat >= 24.396308 && lat <= 71.538800 && lng >= -179.148909 && lng <= -66.885444) ||
    // Hawaii
    (lat >= 18.9 && lat <= 22.2 && lng >= -160.3 && lng <= -154.8) ||
    // Alaska
    (lat >= 51.2 && lat <= 71.5 && lng >= -179.0 && lng <= -129.0)
  );
}

// Get approximate state from coordinates (rough estimation)
export function getApproximateUSAState(lat: number, lng: number): string | null {
  // This is a simplified mapping - for production, use proper geocoding
  // Rough state boundaries (simplified)
  const stateBounds: Record<string, { lat: [number, number]; lng: [number, number] }> = {
    'California': { lat: [32.5, 42.0], lng: [-124.5, -114.0] },
    'Texas': { lat: [25.8, 36.5], lng: [-106.6, -93.5] },
    'Florida': { lat: [24.5, 31.0], lng: [-87.6, -80.0] },
    'New York': { lat: [40.5, 45.0], lng: [-79.8, -71.8] },
    'Illinois': { lat: [36.9, 42.5], lng: [-91.5, -87.0] },
    'Pennsylvania': { lat: [39.7, 42.3], lng: [-80.5, -74.7] },
    'Ohio': { lat: [38.4, 42.0], lng: [-84.8, -80.5] },
    'Georgia': { lat: [30.3, 35.0], lng: [-85.6, -80.8] },
    'North Carolina': { lat: [33.8, 36.6], lng: [-84.3, -75.4] },
    'Michigan': { lat: [41.7, 48.3], lng: [-90.4, -82.4] },
  };

  for (const [state, bounds] of Object.entries(stateBounds)) {
    if (
      lat >= bounds.lat[0] && lat <= bounds.lat[1] &&
      lng >= bounds.lng[0] && lng <= bounds.lng[1]
    ) {
      return state;
    }
  }

  return null;
}

