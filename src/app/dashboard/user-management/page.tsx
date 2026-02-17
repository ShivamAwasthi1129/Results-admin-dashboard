import { getServerAuth } from '@/lib/server-auth';
import UserManagementClient from './UserManagementClient';
import { fetchWithTimeout } from '@/lib/server-api';

async function fetchUsers(_token: string | null) {
  try {
    const { getExternalAdminUsersUrl } = await import('@/lib/external-api');
    const externalApiUrl = getExternalAdminUsersUrl();
    if (!externalApiUrl) {
      console.error('[fetchUsers] DOMAIN_NAME is not set. Set DOMAIN_NAME=https://r3sults-backend.vercel.app in env.');
      return {
        success: false,
        data: { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } },
        error: 'External API not configured. Set DOMAIN_NAME in env.',
      };
    }
    const externalToken = process.env.R3SULTS_ACCESS_TOKEN;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (externalToken) headers['Authorization'] = `Bearer ${externalToken}`;
    console.log(`[fetchUsers] Fetching from external API: ${externalApiUrl}`);
    
    const response = await fetchWithTimeout(
      externalApiUrl,
      {
        headers,
        cache: 'no-store',
      },
      15000
    );
    
    if (!response.ok) {
      console.error(`[fetchUsers] Failed to fetch users: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[fetchUsers] Error response: ${errorText}`);
      return {
        success: false,
        data: { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } },
        error: 'Failed to fetch users',
      };
    }
    
    const data = await response.json();
    if (!data.success) {
      console.error(`[fetchUsers] API returned success: false`, data.error || 'Unknown error');
      return {
        success: false,
        data: { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } },
        error: data.error || 'Failed to fetch users',
      };
    }
    
    // The external API already returns data in the correct format
    const users = data.data?.users || [];
    const pagination = data.data?.pagination || { page: 1, limit: 20, total: users.length, pages: 1 };
    
    console.log(`[fetchUsers] Successfully fetched ${users.length} users`);
    return {
      success: true,
      data: {
        users: users,
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 20,
          total: pagination.total || users.length,
          pages: pagination.pages || Math.ceil((pagination.total || users.length) / (pagination.limit || 20)),
        },
      },
    };
  } catch (error: any) {
    console.error('[fetchUsers] Error fetching users:', error);
    if (error.name === 'AbortError') {
      console.error('[fetchUsers] Request timed out');
    }
    return {
      success: false,
      data: { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } },
      error: 'Failed to fetch users',
    };
  }
}

export default async function UserManagementPage() {
  const { token } = await getServerAuth();
  const initialData = await fetchUsers(token);

  return <UserManagementClient initialData={initialData} />;
}

