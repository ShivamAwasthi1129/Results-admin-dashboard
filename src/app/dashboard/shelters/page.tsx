import { getServerAuth } from '@/lib/server-auth';
import { getApiUrl } from '@/lib/server-api';
import SheltersClient from './SheltersClient';

// Use any type for API response since we'll pass it directly to client
// The client component will handle the proper typing
async function fetchShelters(token: string | null): Promise<any[]> {
  try {
    if (!token) {
      console.warn('[fetchShelters] No token provided');
      return [];
    }
    
    const apiUrl = getApiUrl('/api/shelters');
    console.log(`[fetchShelters] Fetching from: ${apiUrl}`);
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(apiUrl, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`[fetchShelters] Failed to fetch shelters: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[fetchShelters] Error response: ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      console.error(`[fetchShelters] API returned success: false`, data.error || 'Unknown error');
      return [];
    }
    
    const shelters = data.data || [];
    console.log(`[fetchShelters] Successfully fetched ${shelters.length} shelters`);
    return shelters;
  } catch (error: any) {
    console.error('[fetchShelters] Error fetching shelters:', error);
    if (error.name === 'AbortError') {
      console.error('[fetchShelters] Request timed out');
    }
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
