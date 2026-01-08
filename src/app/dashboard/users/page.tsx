import { getServerAuth } from '@/lib/server-auth';
import UsersClient from './UsersClient';

// Use any type for API response since we'll pass it directly to client
// The client component will handle the proper typing
async function fetchUsers(token: string | null): Promise<any[]> {
  try {
    if (!token) return [];
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/users?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch users');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data.users || [];
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
