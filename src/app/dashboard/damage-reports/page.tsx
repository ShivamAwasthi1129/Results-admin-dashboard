import { DashboardLayout } from '@/components/layout';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import DamageReportsClient from './DamageReportsClient';
import { fetchWithTimeout } from '@/lib/server-api';
import { cookies } from 'next/headers';

interface DamageReport {
  _id: string;
  id: string;
  reportNumber: string;
  reportDate: string;
  customer: {
    customerId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };
  customerFullName?: string;
  reportedBy: {
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  propertyAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
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
  workflowSteps: Array<{
    stepNumber: number;
    name: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    completedBy?: string;
    notes?: string;
  }>;
  currentStep: number;
  assignedAdjuster?: {
    adjusterId: string;
    fullName: string;
    email?: string;
    phone?: string;
    companyName?: string;
    approvalStatus: string;
  };
  assignedVendors: Array<{
    vendorId: string;
    businessName: string;
    category?: string;
    estimatedCost: number;
    status: string;
  }>;
  totalVendorCost?: number;
  vendorWorkProgress?: number;
  images: Array<{
    url: string;
    alt?: string;
    description?: string;
    uploadedAt?: string;
    isPrimary?: boolean;
  }>;
  notes?: string;
  tags?: string[];
  priority?: string;
  insuranceCoverage?: 'uninsured' | 'partially_insured' | 'fully_insured' | null;
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
    <DashboardLayout title="Damage Reports" subtitle="View and manage damage report inspections" icon={<DocumentTextIcon className="w-7 h-7" />}>
      <DamageReportsClient initialReports={initialReports} />
    </DashboardLayout>
  );
}
