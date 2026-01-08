import { getServerAuth } from '@/lib/server-auth';
import ServicesClient from './ServicesClient';

// Use any type for API response since we'll pass it directly to client
// The client component will handle the proper typing
async function fetchServiceProviders(token: string | null): Promise<any[]> {
  try {
    if (!token) return [];
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/service-providers?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch service providers');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data.providers || [];
  } catch (error) {
    console.error('Error fetching service providers:', error);
    return [];
  }
}

export default async function ServicesPage() {
  const { token } = await getServerAuth();
  
  const providers = await fetchServiceProviders(token);
  
  return (
    <ServicesClient
      initialProviders={providers}
    />
  );
}
