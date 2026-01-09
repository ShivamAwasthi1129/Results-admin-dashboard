import { getServerAuth } from '@/lib/server-auth';
import { getApiUrl } from '@/lib/server-api';
import ResourcesClient from './ResourcesClient';

// Use any type for API response since we'll pass it directly to client
// The client component will handle the proper typing
async function fetchStockEntries(token: string | null): Promise<any[]> {
  try {
    if (!token) {
      console.warn('[fetchStockEntries] No token provided');
      return [];
    }
    
    const apiUrl = getApiUrl('/api/inventory/stock');
    console.log(`[fetchStockEntries] Fetching from: ${apiUrl}`);
    
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
      console.error(`[fetchStockEntries] Failed to fetch stock entries: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[fetchStockEntries] Error response: ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      console.error(`[fetchStockEntries] API returned success: false`, data.error || 'Unknown error');
      return [];
    }
    
    const stockEntries = data.data || [];
    console.log(`[fetchStockEntries] Successfully fetched ${stockEntries.length} stock entries`);
    return stockEntries;
  } catch (error: any) {
    console.error('[fetchStockEntries] Error fetching stock entries:', error);
    if (error.name === 'AbortError') {
      console.error('[fetchStockEntries] Request timed out');
    }
    return [];
  }
}

export default async function ResourcesPage() {
  const { token } = await getServerAuth();
  
  const stockEntries = await fetchStockEntries(token);
  
  return (
    <ResourcesClient
      initialStockEntries={stockEntries}
    />
  );
}
