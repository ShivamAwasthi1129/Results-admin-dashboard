import { DashboardLayout } from '@/components/layout';
import DamageReportsClient from './DamageReportsClient';
import { fetchWithTimeout } from '@/lib/server-api';
import { cookies } from 'next/headers';

interface DamageReport {
  _id: string;
  id: string;
  reportNumber: string;
  reportDate: string;
  reportedBy: {
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  propertyOwner: {
    name: string;
    phone: string;
    email?: string;
    alternateContact?: {
      name?: string;
      phone?: string;
      relation?: string;
    };
  };
  propertyAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  damageType: string;
  severity: string;
  status: string;
  description: string;
  affectedAreas?: string[];
  estimatedCost: number;
  actualCost?: number;
  fundingSources: Array<{
    source: string;
    amount: number;
    description?: string;
    receivedDate?: string;
    status?: string;
    notes?: string;
  }>;
  totalFunding?: number;
  fundingPercentage?: number;
  remainingFunding?: number;
  milestones: Array<{
    name: string;
    description?: string;
    status: string;
    completionDate?: string;
    dueDate?: string;
    notes?: string;
    order: number;
  }>;
  images: Array<{
    url: string;
    alt?: string;
    description?: string;
    uploadedAt?: string;
    isPrimary?: boolean;
  }>;
  contractor?: {
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
    estimatedTimeline?: string;
    assignedDate?: string;
  };
  notes?: string;
  tags?: string[];
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function fetchDamageReports(): Promise<DamageReport[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return [];
    }

    const apiUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/damage-reports?limit=100`
      : `http://localhost:3000/api/damage-reports?limit=100`;

    const response = await fetchWithTimeout(
      apiUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
      15000
    );

    if (!response.ok) {
      console.error('Failed to fetch damage reports:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (data.success && data.data?.damageReports) {
      return data.data.damageReports;
    }

    return [];
  } catch (error) {
    console.error('Error fetching damage reports:', error);
    return [];
  }
}

export default async function DamageReportsPage() {
  const initialReports = await fetchDamageReports();

  return (
    <DashboardLayout>
      <DamageReportsClient initialReports={initialReports} />
    </DashboardLayout>
  );
}
