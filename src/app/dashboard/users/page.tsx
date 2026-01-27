import { getServerAuth } from '@/lib/server-auth';
import { getApiUrl } from '@/lib/server-api';
import UsersClient from './UsersClient';

// Use any type for API response since we'll pass it directly to client
// The client component will handle the proper typing
async function fetchUsers(token: string | null): Promise<any[]> {
  try {
    if (!token) return [];
    
    const response = await fetch(getApiUrl('/api/ops-users?limit=100'), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch users');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      console.error('[fetchUsers] API returned success: false', data.error || 'Unknown error');
      return [];
    }
    
    // Handle response structure - API returns { success: true, data: { users: [...], pagination: {...} } }
    if (data.data) {
      if (data.data.users && Array.isArray(data.data.users)) {
        return data.data.users;
      } else if (Array.isArray(data.data)) {
        return data.data;
      }
    }
    
    console.warn('[fetchUsers] Unexpected data structure:', data);
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export default async function UsersPage() {
  const { token } = await getServerAuth();
  
  const users = await fetchUsers(token);
  
  return (
    <UsersClient
      initialUsers={users}
    />
  );
}
