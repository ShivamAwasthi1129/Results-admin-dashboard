import { getServerAuth } from '@/lib/server-auth';
import { getApiUrl } from '@/lib/server-api';
import SheltersClient from './SheltersClient';

// Use any type for API response since we'll pass it directly to client
// The client component will handle the proper typing
async function fetchShelters(token: string | null): Promise<any[]> {
  try {
    if (!token) return [];
    
    const response = await fetch(getApiUrl('/api/shelters'), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch shelters');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching shelters:', error);
    return [];
  }
}

export default async function SheltersPage() {
  const { token } = await getServerAuth();
  
  const shelters = await fetchShelters(token);
  
  return (
    <SheltersClient
      initialShelters={shelters}
    />
  );
}
