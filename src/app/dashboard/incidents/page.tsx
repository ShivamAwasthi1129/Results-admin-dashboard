import { getServerAuth } from '@/lib/server-auth';
import { getApiUrl } from '@/lib/server-api';
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
    if (!token) {
      console.warn('[fetchIncidents] No token provided');
      return [];
    }
    
    const apiUrl = getApiUrl('/api/incidents');
    console.log(`[fetchIncidents] Fetching from: ${apiUrl}`);
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(apiUrl, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`[fetchIncidents] Failed to fetch incidents: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[fetchIncidents] Error response: ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      console.error(`[fetchIncidents] API returned success: false`, data.error || 'Unknown error');
      return [];
    }
    
    const incidents = data.data || [];
    console.log(`[fetchIncidents] Successfully fetched ${incidents.length} incidents`);
    return incidents;
  } catch (error: any) {
    console.error('[fetchIncidents] Error fetching incidents:', error);
    if (error.name === 'AbortError') {
      console.error('[fetchIncidents] Request timed out');
    }
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
