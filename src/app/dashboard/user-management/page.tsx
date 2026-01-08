import UserManagementClient from './UserManagementClient';

async function fetchUsers() {
  try {
    const response = await fetch('https://dms-rust-omega.vercel.app/api/admin/users', {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      success: false,
      data: { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } },
      error: 'Failed to fetch users',
    };
  }
}

export default async function UserManagementPage() {
  const initialData = await fetchUsers();

  return <UserManagementClient initialData={initialData} />;
}

