import { getServerAuth } from '@/lib/server-auth';
import { getApiUrl } from '@/lib/server-api';
import EmergenciesClient from './EmergenciesClient';

interface Emergency {
  _id: string;
  title: string;
  type: string;
  description: string;
  priority: string;
  status: string;
  location: {
    city?: string;
    state?: string;
    address?: string;
  };
  contactName?: string;
  contactPhone?: string;
  numberOfPeople?: number;
  createdAt: string;
}

async function fetchEmergencies(token: string | null): Promise<Emergency[]> {
  try {
    if (!token) return [];
    
    const response = await fetch(getApiUrl('/api/emergencies?limit=100'), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch emergencies');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data.emergencies || [];
  } catch (error) {
    console.error('Error fetching emergencies:', error);
    return [];
  }
}

export default async function EmergenciesPage() {
  const { token } = await getServerAuth();
  
  const emergencies = await fetchEmergencies(token);
  
  return (
    <EmergenciesClient
      initialEmergencies={emergencies}
    />
  );
}
