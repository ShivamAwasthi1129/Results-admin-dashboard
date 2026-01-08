import { getServerAuth } from '@/lib/server-auth';
import { getApiUrl } from '@/lib/server-api';
import LiveDisastersClient from './LiveDisastersClient';

interface LiveDisaster {
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
  isLive: boolean;
}

interface AssignedVolunteer {
  volunteerId: {
    _id: string;
    volunteerId: string;
    userId?: {
      firstName?: string;
      lastName?: string;
      name?: string;
      email?: string;
      phone?: string;
    };
  };
  assignedAt: string;
  assignedBy?: string;
  status: string;
}

interface ManagedDisaster {
  _id: string;
  title: string;
  type: string;
  description: string;
  severity: string;
  status: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    coordinates?: { lat: number; lng: number } | [number, number];
  };
  affectedArea?: number;
  estimatedAffectedPeople?: number;
  assignedVolunteers?: AssignedVolunteer[];
  createdAt: string;
}

interface Volunteer {
  _id: string;
  volunteerId: string;
  userId: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  availability?: string;
  assignedDisasters?: any[];
}

async function fetchLiveDisasters(): Promise<{ disasters: LiveDisaster[]; lastUpdated: Date | null }> {
  try {
    const response = await fetch(getApiUrl('/api/live-disasters'), {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    
    if (!response.ok) {
      console.error('Failed to fetch live disasters');
      return { disasters: [], lastUpdated: null };
    }
    
    const data = await response.json();
    if (!data.success) {
      return { disasters: [], lastUpdated: null };
    }
    
    // Filter to only USA-based disasters
    const usaDisasters = data.data.disasters.filter((d: any) => {
      const country = d.location?.country || '';
      const isUSA = country.toLowerCase().includes('united states') || 
                   country.toLowerCase().includes('usa') || 
                   country.toLowerCase().includes('u.s.') ||
                   country.toLowerCase() === 'us';
      
      let coordinates;
      if (d.location?.coordinates) {
        coordinates = d.location.coordinates;
      }
      
      const isInUSABounds = coordinates && 
        coordinates.lat >= 24 && coordinates.lat <= 49 &&
        coordinates.lng >= -125 && coordinates.lng <= -66;
      
      return isUSA || isInUSABounds;
    }).map((d: any) => ({
      id: d.id || `disaster-${Math.random()}`,
      title: d.title || 'Unknown Disaster',
      description: d.description || '',
      type: d.type || 'other',
      category: d.category || d.type || 'other',
      severity: d.severity || 'medium',
      status: d.status || 'active',
      location: {
        coordinates: d.location?.coordinates,
        country: d.location?.country,
        state: d.location?.state,
        region: d.location?.region,
      },
      magnitude: d.magnitude,
      magnitudeUnit: d.magnitudeUnit,
      date: d.date || new Date().toISOString(),
      source: d.source || '',
      isLive: true,
    }));
    
    const lastUpdated = data.data.metadata?.lastUpdated 
      ? new Date(data.data.metadata.lastUpdated)
      : null;
    
    return { disasters: usaDisasters, lastUpdated };
  } catch (error) {
    console.error('Error fetching live disasters:', error);
    return { disasters: [], lastUpdated: null };
  }
}

async function fetchDatabaseDisasters(token: string | null): Promise<ManagedDisaster[]> {
  try {
    if (!token) return [];
    
    const params = new URLSearchParams();
    params.append('limit', '100');
    const response = await fetch(getApiUrl(`/api/disasters?${params.toString()}`), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    
    if (!response.ok) {
      console.error('Failed to fetch database disasters');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data.disasters || [];
  } catch (error) {
    console.error('Error fetching database disasters:', error);
    return [];
  }
}

async function fetchVolunteers(token: string | null): Promise<Volunteer[]> {
  try {
    if (!token) return [];
    
    const response = await fetch(getApiUrl('/api/volunteers?limit=100'), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    
    if (!response.ok) {
      console.error('Failed to fetch volunteers');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data.volunteers || [];
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    return [];
  }
}

export default async function LiveDisastersPage() {
  const { token } = await getServerAuth();
  
  // Fetch all data in parallel - this is already optimized
  const [liveData, databaseDisasters, volunteers] = await Promise.all([
    fetchLiveDisasters(),
    fetchDatabaseDisasters(token),
    fetchVolunteers(token),
  ]);
  
  return (
    <LiveDisastersClient
      initialLiveDisasters={liveData.disasters}
      initialLastUpdated={liveData.lastUpdated}
      initialDatabaseDisasters={databaseDisasters}
      initialVolunteers={volunteers}
    />
  );
}
