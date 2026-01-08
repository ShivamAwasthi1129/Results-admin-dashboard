import { getServerAuth } from '@/lib/server-auth';
import VolunteersClient from './VolunteersClient';

interface DisasterAssignment {
  disasterId: string;
  assignedAt: string;
  assignedBy?: string;
  fromDate: string;
  toDate: string;
  status: string;
  disaster?: {
    _id: string;
    title: string;
    type: string;
    severity: string;
    status: string;
  };
}

interface Volunteer {
  _id: string;
  volunteerId: string;
  userId: { _id: string; firstName?: string; lastName?: string; name?: string; email: string; phone?: string };
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  profileImage?: string;
  address?: { street?: string; city?: string; state?: string; zipCode?: string };
  skills: string[];
  specializations?: string[];
  languages?: string[];
  experience?: { years: number; description?: string };
  availability: string;
  availabilitySchedule?: { weekdays: boolean; weekends: boolean; nights: boolean; preferredShift?: string };
  preferredWorkAreas?: string[];
  willingToTravel?: boolean;
  maxTravelDistance?: number;
  rating: number;
  totalReviews?: number;
  completedMissions: number;
  totalHoursServed?: number;
  emergencyContact?: { name: string; phone: string; relation: string; email?: string };
  healthInfo?: { medicalConditions?: string[]; allergies?: string[]; physicallyFit?: boolean };
  hasOwnVehicle?: boolean;
  vehicleType?: string;
  status: string;
  verificationStatus?: string;
  teamId?: string;
  team?: { _id: string; name: string; teamId: string };
  assignedDisasters?: DisasterAssignment[];
  joinedAt: string;
  createdAt: string;
}

interface Disaster {
  _id: string;
  title: string;
  type: string;
  severity: string;
  status: string;
}

async function fetchVolunteers(token: string | null): Promise<Volunteer[]> {
  try {
    if (!token) return [];
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/volunteers?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch volunteers');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data.volunteers || [];
    } catch (error) {
    console.error('Error fetching volunteers:', error);
    return [];
  }
}

async function fetchDisasters(token: string | null): Promise<Disaster[]> {
  try {
    if (!token) return [];
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/disasters?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch disasters');
      return [];
    }
    
      const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data.disasters || [];
    } catch (error) {
    console.error('Error fetching disasters:', error);
    return [];
  }
}

export default async function VolunteersPage() {
  const { token } = await getServerAuth();
  
  // Fetch all data in parallel
  const [volunteers, disasters] = await Promise.all([
    fetchVolunteers(token),
    fetchDisasters(token),
  ]);

  return (
    <VolunteersClient
      initialVolunteers={volunteers}
      initialDisasters={disasters}
    />
  );
}
