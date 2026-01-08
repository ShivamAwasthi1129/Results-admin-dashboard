import { getServerAuth } from '@/lib/server-auth';
import ResourcesClient from './ResourcesClient';

// Use any type for API response since we'll pass it directly to client
// The client component will handle the proper typing
async function fetchStockEntries(token: string | null): Promise<any[]> {
  try {
    if (!token) return [];
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/inventory/stock`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch stock entries');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching stock entries:', error);
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
