/**
 * Utility functions for generating user locations and paths
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationPoint {
  coordinates: Coordinates;
  timestamp: Date;
  label?: string;
}

// City coordinates for USA (all users will be shown in USA region)
const cityCoordinates: Record<string, Coordinates> = {
  'New York': { lat: 40.7128, lng: -74.0060 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Houston': { lat: 29.7604, lng: -95.3698 },
  'Phoenix': { lat: 33.4484, lng: -112.0740 },
  'Philadelphia': { lat: 39.9526, lng: -75.1652 },
  'San Antonio': { lat: 29.4241, lng: -98.4936 },
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  'Dallas': { lat: 32.7767, lng: -96.7970 },
  'San Jose': { lat: 37.3382, lng: -121.8863 },
  'Austin': { lat: 30.2672, lng: -97.7431 },
  'Jacksonville': { lat: 30.3322, lng: -81.6557 },
  'Fort Worth': { lat: 32.7555, lng: -97.3308 },
  'Columbus': { lat: 39.9612, lng: -82.9988 },
  'Charlotte': { lat: 35.2271, lng: -80.8431 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Indianapolis': { lat: 39.7684, lng: -86.1581 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Denver': { lat: 39.7392, lng: -104.9903 },
  'Boston': { lat: 42.3601, lng: -71.0589 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Atlanta': { lat: 33.7490, lng: -84.3880 },
  'Las Vegas': { lat: 36.1699, lng: -115.1398 },
  'Portland': { lat: 45.5152, lng: -122.6784 },
  'New Orleans': { lat: 29.9511, lng: -90.0715 },
};

// State coordinates (centers) - USA states
const stateCoordinates: Record<string, Coordinates> = {
  'California': { lat: 36.7783, lng: -119.4179 },
  'Texas': { lat: 31.9686, lng: -99.9018 },
  'Florida': { lat: 27.7663, lng: -81.6868 },
  'New York': { lat: 42.1657, lng: -74.9481 },
  'Pennsylvania': { lat: 40.5908, lng: -77.2098 },
  'Illinois': { lat: 40.3495, lng: -88.9861 },
  'Ohio': { lat: 40.3888, lng: -82.7649 },
  'Georgia': { lat: 32.1656, lng: -82.9001 },
  'North Carolina': { lat: 35.5397, lng: -79.8431 },
  'Michigan': { lat: 43.3266, lng: -84.5361 },
  'New Jersey': { lat: 40.2989, lng: -74.5210 },
  'Virginia': { lat: 37.7693, lng: -78.1697 },
  'Washington': { lat: 47.4009, lng: -121.4905 },
  'Arizona': { lat: 34.0489, lng: -111.0937 },
  'Massachusetts': { lat: 42.2302, lng: -71.5301 },
  'Tennessee': { lat: 35.7478, lng: -86.6923 },
  'Indiana': { lat: 39.8494, lng: -86.2583 },
  'Missouri': { lat: 38.4561, lng: -92.2884 },
  'Maryland': { lat: 39.0639, lng: -76.8021 },
  'Wisconsin': { lat: 44.2685, lng: -89.6165 },
};

// Cache for consistent coordinates per user
const userCoordinatesCache = new Map<string, Coordinates>();

/**
 * Generate random coordinates for a user based on their location data
 * Uses consistent hashing to ensure same user always gets same coordinates
 */
export function generateUserCoordinates(
  city: string | null,
  state: string | null,
  country: string | null,
  userId: string
): Coordinates {
  // Check cache first
  if (userCoordinatesCache.has(userId)) {
    return userCoordinatesCache.get(userId)!;
  }

  let coordinates: Coordinates;

  // Generate hash from userId for consistent randomness
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed1 = (hash * 17) % 1000;
  const seed2 = (hash * 23) % 1000;

  // Use city if available
  if (city) {
    const cityKey = Object.keys(cityCoordinates).find(
      c => c.toLowerCase() === city.toLowerCase()
    );
    if (cityKey) {
      const base = cityCoordinates[cityKey];
      // Add consistent offset based on hash (within ~15km)
      const offsetLat = ((seed1 / 1000) - 0.5) * 0.15;
      const offsetLng = ((seed2 / 1000) - 0.5) * 0.15;
      coordinates = {
        lat: base.lat + offsetLat,
        lng: base.lng + offsetLng,
      };
    } else {
      // City not in list, generate near a random major city
      const cities = Object.values(cityCoordinates);
      const cityIndex = hash % cities.length;
      const base = cities[cityIndex];
      const offsetLat = ((seed1 / 1000) - 0.5) * 0.3;
      const offsetLng = ((seed2 / 1000) - 0.5) * 0.3;
      coordinates = {
        lat: base.lat + offsetLat,
        lng: base.lng + offsetLng,
      };
    }
  } else if (state) {
    // Use state if available
    const stateKey = Object.keys(stateCoordinates).find(
      s => s.toLowerCase() === state.toLowerCase()
    );
    if (stateKey) {
      const base = stateCoordinates[stateKey];
      // Add consistent offset based on hash (within ~80km)
      const offsetLat = ((seed1 / 1000) - 0.5) * 0.8;
      const offsetLng = ((seed2 / 1000) - 0.5) * 0.8;
      coordinates = {
        lat: base.lat + offsetLat,
        lng: base.lng + offsetLng,
      };
    } else {
      // State not in list, use USA center with larger offset
      const offsetLat = ((seed1 / 1000) - 0.5) * 15;
      const offsetLng = ((seed2 / 1000) - 0.5) * 25;
      coordinates = {
        lat: 39.8283 + offsetLat, // USA center latitude
        lng: -98.5795 + offsetLng, // USA center longitude
      };
    }
  } else {
    // Default: distribute across USA with consistent hashing
    // Use hash to create varied but consistent positions
    const latRange = 25; // USA latitude span (approximately)
    const lngRange = 50; // USA longitude span (approximately)
    const normalizedHash1 = (seed1 / 1000); // 0-1
    const normalizedHash2 = (seed2 / 1000); // 0-1
    
    coordinates = {
      lat: 39.8283 + (normalizedHash1 - 0.5) * latRange, // USA center
      lng: -98.5795 + (normalizedHash2 - 0.5) * lngRange, // USA center
    };
  }

  // Cache the coordinates
  userCoordinatesCache.set(userId, coordinates);
  return coordinates;
}

/**
 * Generate a path (historical locations) for a user
 * Simulates movement over time like delivery apps - creates a trail
 */
export function generateUserPath(
  currentLocation: Coordinates,
  userId: string,
  pointCount: number = 10
): LocationPoint[] {
  const path: LocationPoint[] = [];
  const now = new Date();

  // Generate hash for consistent path generation
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Create a more realistic path - simulate movement from a starting point
  // The path should look like someone is moving (not just random points)
  const startDistance = 0.5; // Start ~50km away
  const angle = (hash % 360) * (Math.PI / 180); // Direction of movement
  
  // Generate points going back in time
  for (let i = pointCount - 1; i >= 0; i--) {
    const minutesAgo = i * 30; // 30 minutes between each point (more realistic)
    const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);

    // Calculate progress (0 = start, 1 = current)
    const progress = i / (pointCount - 1);
    
    // Create a path that moves from start to current location
    // Add some variation to make it look more natural (not straight line)
    const variation = Math.sin((hash + i) * 0.5) * 0.05; // Small variation
    const distance = startDistance * (1 - progress);
    
    const offsetLat = Math.cos(angle) * distance + Math.sin((hash + i) * 0.3) * variation;
    const offsetLng = Math.sin(angle) * distance + Math.cos((hash + i) * 0.3) * variation;

    path.push({
      coordinates: {
        lat: currentLocation.lat + offsetLat,
        lng: currentLocation.lng + offsetLng,
      },
      timestamp,
      label: i === 0 ? 'Current' : minutesAgo >= 60 ? `${Math.floor(minutesAgo / 60)}h ago` : `${minutesAgo}m ago`,
    });
  }

  return path;
}

/**
 * Get color for user based on role
 */
export function getUserRoleColor(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '#ef4444'; // red
    case 'ADMIN':
      return '#f97316'; // orange
    case 'MEMBER':
      return '#10b981'; // green
    case 'GUEST':
      return '#6b7280'; // gray
    default:
      return '#8b5cf6'; // purple
  }
}

