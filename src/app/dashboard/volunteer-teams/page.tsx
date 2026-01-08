import { getServerAuth } from '@/lib/server-auth';
import VolunteerTeamsClient from './VolunteerTeamsClient';

// Use any type for API response since we'll pass it directly to client
// The client component will handle the proper typing
async function fetchTeams(token: string | null): Promise<any[]> {
  try {
    if (!token) return [];
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/volunteer-teams?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch teams');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data.teams || [];
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
}

async function fetchVolunteers(token: string | null): Promise<any[]> {
  try {
    if (!token) return [];
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/volunteers?limit=1000`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
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

export default async function VolunteerTeamsPage() {
  const { token } = await getServerAuth();
  
  const [teams, volunteers] = await Promise.all([
    fetchTeams(token),
    fetchVolunteers(token),
  ]);
  
  return (
    <VolunteerTeamsClient
      initialTeams={teams}
      initialVolunteers={volunteers}
    />
  );
}
