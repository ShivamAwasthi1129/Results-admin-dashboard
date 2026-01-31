import { getServerAuth } from '@/lib/server-auth';
import { getApiUrl } from '@/lib/server-api';
import AdjustersClient from './AdjustersClient';

async function getAdjusters(token: string | null) {
  try {
    if (!token) {
      return [];
    }

    const response = await fetch(getApiUrl('/api/adjusters?limit=50'), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch adjusters:', response.status);
      return [];
    }

    const data = await response.json();
    return data.success ? data.data.adjusters : [];
  } catch (error) {
    console.error('Error fetching adjusters:', error);
    return [];
  }
}

export default async function AdjustersPage() {
  const { token } = await getServerAuth();
  const adjusters = await getAdjusters(token);

  return <AdjustersClient initialAdjusters={adjusters} />;
}
