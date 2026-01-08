import { getServerAuth } from '@/lib/server-auth';
import { getApiUrl } from '@/lib/server-api';
import DashboardClient from './DashboardClient';

interface DashboardStats {
  overview: {
    totalUsers: number;
    totalAdmins: number;
    totalVolunteers: number;
    availableVolunteers: number;
    totalServiceProviders: number;
    verifiedServiceProviders: number;
    activeDisasters: number;
    resolvedDisasters: number;
    criticalDisasters: number;
    pendingEmergencies: number;
    inProgressEmergencies: number;
    resolvedEmergencies: number;
    totalAffectedPeople: number;
  };
  growth: { users: number; volunteers: number };
  recentDisasters: any[];
  recentEmergencies: any[];
}

interface LiveDisaster {
  id: string;
  title: string;
  type: string;
  severity: string;
  description?: string;
  category?: string;
  date?: string;
  magnitude?: number;
  magnitudeUnit?: string;
  source?: string;
  location: {
    coordinates?: { lat: number; lng: number };
    country?: string;
    state?: string;
  };
}

interface DashboardUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  city: string | null;
  state: string | null;
  country: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  isSubscriber: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface WeatherData {
  city: string;
  state?: string;
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  pressure?: number;
  visibility?: number;
  uvIndex?: number;
  feelsLike?: number;
  windDirection?: number;
  clouds?: number;
}

async function fetchDashboardStats(token: string | null): Promise<DashboardStats | null> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(getApiUrl('/api/dashboard/stats'), {
      headers,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch dashboard stats');
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
}

async function fetchLiveDisasters(): Promise<LiveDisaster[]> {
  try {
    const response = await fetch(getApiUrl('/api/live-disasters'), {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch live disasters');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) return [];
    
    const disasters = data.data.disasters || [];
    
    // Filter to only show USA-based disasters
    const transformedDisasters = disasters
      .filter((d: any) => {
        const hasCoordinates = d.location?.coordinates || (d.location?.lat && d.location?.lng);
        if (!hasCoordinates) return false;
        
        const country = d.location?.country || '';
        const isUSA = country.toLowerCase().includes('united states') || 
                     country.toLowerCase().includes('usa') || 
                     country.toLowerCase().includes('u.s.') ||
                     country.toLowerCase() === 'us';
        
        let coordinates;
        if (d.location?.coordinates) {
          coordinates = d.location.coordinates;
        } else if (d.location?.lat && d.location?.lng) {
          coordinates = { lat: d.location.lat, lng: d.location.lng };
        }
        
        const isInUSABounds = coordinates && 
          coordinates.lat >= 24 && coordinates.lat <= 49 &&
          coordinates.lng >= -125 && coordinates.lng <= -66;
        
        return isUSA || isInUSABounds;
      })
      .map((d: any) => {
        let coordinates;
        if (d.location?.coordinates) {
          coordinates = d.location.coordinates;
        } else if (d.location?.lat && d.location?.lng) {
          coordinates = { lat: d.location.lat, lng: d.location.lng };
        }
        
        return {
          id: d.id || `disaster-${Math.random()}`,
          title: d.title || 'Unknown Disaster',
          type: d.type || 'other',
          severity: d.severity || 'medium',
          description: d.description,
          category: d.category || d.type,
          date: d.date,
          magnitude: d.magnitude,
          magnitudeUnit: d.magnitudeUnit,
          source: d.source,
          location: {
            coordinates: coordinates,
            country: d.location?.country,
            state: d.location?.state,
          }
        };
      });
    
    return transformedDisasters;
  } catch (error) {
    console.error('Error fetching live disasters:', error);
    return [];
  }
}

async function fetchUsers(): Promise<DashboardUser[]> {
  try {
    const response = await fetch('https://dms-rust-omega.vercel.app/api/admin/users', {
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Failed to fetch users');
      return [];
    }
    
    const data = await response.json();
    if (data.success && data.data?.users) {
      return data.data.users.slice(0, 50).map((u: any) => ({
        id: u.id,
        fullName: u.fullName,
        username: u.username,
        email: u.email,
        phoneNumber: u.phoneNumber,
        city: u.city,
        state: u.state,
        country: u.country,
        role: u.role,
        isActive: u.isActive,
        isVerified: u.isVerified,
        isSubscriber: u.isSubscriber,
        emailVerified: u.emailVerified,
        phoneVerified: u.phoneVerified,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

async function fetchWeatherData(): Promise<WeatherData[]> {
  try {
    const response = await fetch(getApiUrl('/api/weather?type=multi'), {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch weather data');
      return [];
    }
    
    const data = await response.json();
    return data.success ? (data.data || []) : [];
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const { token } = await getServerAuth();
  
  // Fetch all data in parallel
  const [stats, liveDisasters, users, weatherData] = await Promise.all([
    fetchDashboardStats(token),
    fetchLiveDisasters(),
    fetchUsers(),
    fetchWeatherData(),
  ]);
  
  return (
    <DashboardClient
      initialStats={stats}
      initialLiveDisasters={liveDisasters}
      initialUsers={users}
      initialWeatherData={weatherData}
    />
  );
}

