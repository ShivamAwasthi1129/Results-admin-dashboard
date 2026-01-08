import { getServerAuth } from '@/lib/server-auth';
import IncidentsClient from './IncidentsClient';

interface Note {
  content: string;
  createdBy: string;
  createdAt: string;
}

interface TimelineEvent {
  type: 'created' | 'status_updated' | 'assigned' | 'note_added' | 'priority_changed';
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

interface Incident {
  id: string;
  ticketNumber: string;
  type: 'insurance_support' | 'finance_management' | 'legal_assistance' | 'housing' | 'medical' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reportedBy: {
    name: string;
    email: string;
    phone: string;
  };
  assignedTo: string;
  attachments: string[];
  notes: Note[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

async function fetchIncidents(token: string | null): Promise<Incident[]> {
  try {
    if (!token) return [];
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/incidents`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch incidents');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return [];
  }
}

export default async function IncidentsPage() {
  const { token } = await getServerAuth();
  
  const incidents = await fetchIncidents(token);
  
  return (
    <IncidentsClient
      initialIncidents={incidents}
    />
  );
}
