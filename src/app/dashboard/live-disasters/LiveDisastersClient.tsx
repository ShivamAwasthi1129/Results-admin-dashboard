'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Input, Modal, Select, Table } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';
import {
  GlobeAltIcon,
  MapPinIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  FireIcon,
  CloudIcon,
  SunIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  SignalIcon,
  XMarkIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  StarIcon,
  AcademicCapIcon,
  CheckBadgeIcon,
  UserPlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { USA_STATES } from '@/lib/geocoding';
import { MultiSelect } from '@/components/ui/MultiSelect';

// Dynamic import for map to avoid SSR issues
const LiveDisasterMap = dynamic(
  () => import('@/components/dashboard/LiveDisasterMap'),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div> }
);

interface LiveDisaster {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  severity: string;
  status: string;
  location: {
    coordinates?: { lat: number; lng: number };
    country?: string;
    state?: string;
    region?: string;
  };
  magnitude?: number;
  magnitudeUnit?: string;
  date: string;
  source: string;
  isLive: boolean;
}

const typeIcons: Record<string, any> = {
  wildfire: FireIcon,
  cyclone: CloudIcon,
  flood: CloudIcon,
  earthquake: ExclamationTriangleIcon,
  volcanic: FireIcon,
  drought: SunIcon,
  default: MapPinIcon,
};

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

interface AssignedVolunteer {
  volunteerId: {
    _id: string;
    volunteerId: string;
    userId?: {
      firstName?: string;
      lastName?: string;
      name?: string;
      email?: string;
      phone?: string;
    };
  };
  assignedAt: string;
  assignedBy?: string;
  status: string;
}

interface ManagedDisaster {
  _id: string;
  title: string;
  type: string;
  description: string;
  severity: string;
  status: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    coordinates?: { lat: number; lng: number } | [number, number];
  };
  affectedArea?: number;
  estimatedAffectedPeople?: number;
  assignedVolunteers?: AssignedVolunteer[];
  createdAt: string;
}

interface Volunteer {
  _id: string;
  volunteerId: string;
  userId: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  availability?: string;
  assignedDisasters?: any[];
}

interface LiveDisastersClientProps {
  initialLiveDisasters: LiveDisaster[];
  initialLastUpdated: Date | null;
  initialDatabaseDisasters: ManagedDisaster[];
  initialVolunteers: Volunteer[];
}

export default function LiveDisastersClient({
  initialLiveDisasters,
  initialLastUpdated,
  initialDatabaseDisasters,
  initialVolunteers,
}: LiveDisastersClientProps) {
  const { token, hasPermission } = useAuth();
  const [liveDisasters, setLiveDisasters] = useState<LiveDisaster[]>(initialLiveDisasters);
  const [databaseDisasters, setDatabaseDisasters] = useState<ManagedDisaster[]>(initialDatabaseDisasters);
  const [allDisasters, setAllDisasters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialLastUpdated);
  const [selectedDisaster, setSelectedDisaster] = useState<any | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCountry, setFilterCountry] = useState<string>('USA');
  const [filterCountries, setFilterCountries] = useState<string[]>([]);
  const [filterState, setFilterState] = useState('all');
  const [highlightedDisasterId, setHighlightedDisasterId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedManagedDisaster, setSelectedManagedDisaster] = useState<ManagedDisaster | null>(null);
  const [showVolunteersModal, setShowVolunteersModal] = useState(false);
  const [selectedDisasterForVolunteers, setSelectedDisasterForVolunteers] = useState<ManagedDisaster | null>(null);
  const [volunteers, setVolunteers] = useState<any[]>(initialVolunteers);
  const [showAssignVolunteerModal, setShowAssignVolunteerModal] = useState(false);
  const [selectedDisasterForAssign, setSelectedDisasterForAssign] = useState<ManagedDisaster | null>(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>('');
  const [expandedVolunteers, setExpandedVolunteers] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    title: '',
    type: 'flood',
    description: '',
    severity: 'medium',
    status: 'active',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    lat: '',
    lng: '',
    affectedArea: '',
    estimatedAffectedPeople: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const canManage = hasPermission(['super_admin', 'admin']);

  // Fetch volunteers list
  const fetchVolunteers = async () => {
    try {
      const response = await fetch('/api/volunteers?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        console.log('Fetched volunteers:', data.data.volunteers?.length || 0);
        setVolunteers(data.data.volunteers || []);
      }
    } catch (error) {
      console.error('Failed to fetch volunteers:', error);
    }
  };

  const fetchLiveDisasters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/live-disasters');
      const data = await response.json();
      if (data.success) {
        // Filter to only USA-based disasters
        const usaDisasters = data.data.disasters.filter((d: LiveDisaster) => {
          const country = d.location?.country || '';
          const isUSA = country.toLowerCase().includes('united states') || 
                       country.toLowerCase().includes('usa') || 
                       country.toLowerCase().includes('u.s.') ||
                       country.toLowerCase() === 'us';
          
          let coordinates;
          if (d.location?.coordinates) {
            coordinates = d.location.coordinates;
          }
          
          const isInUSABounds = coordinates && 
            coordinates.lat >= 24 && coordinates.lat <= 49 &&
            coordinates.lng >= -125 && coordinates.lng <= -66;
          
          return isUSA || isInUSABounds;
        });
        setLiveDisasters(usaDisasters);
        setLastUpdated(new Date(data.data.metadata.lastUpdated));
        
        // Update combined disasters
        if (databaseDisasters.length > 0) {
          const combined = [
            ...liveDisasters.map((d: LiveDisaster) => ({
              ...d,
              id: d.id,
              isLive: true,
              source: 'live'
            })),
      ...databaseDisasters.map((d: ManagedDisaster) => {
        // Handle coordinates - database stores as [lng, lat] (GeoJSON format)
        let coordinates: { lat: number; lng: number } | undefined;
        if (d.location?.coordinates) {
          if (Array.isArray(d.location.coordinates) && d.location.coordinates.length === 2) {
            // GeoJSON format: [lng, lat]
            coordinates = {
              lat: d.location.coordinates[1],
              lng: d.location.coordinates[0]
            };
          } else if (typeof d.location.coordinates === 'object' && 'lat' in d.location.coordinates) {
            // Object format: {lat, lng}
            coordinates = d.location.coordinates as { lat: number; lng: number };
          }
        }
        
        return {
          id: d._id,
          title: d.title,
          description: d.description,
          type: d.type,
          category: d.type,
          severity: d.severity,
          status: d.status,
          location: {
            coordinates: coordinates,
            country: d.location?.country || 'USA',
            state: d.location?.state,
          },
          date: d.createdAt,
          isLive: false,
          source: 'database',
          affectedArea: d.affectedArea,
          estimatedAffectedPeople: d.estimatedAffectedPeople,
        };
      })
          ];
          setAllDisasters(combined);
        } else {
          setAllDisasters(usaDisasters.map((d: LiveDisaster) => ({
            ...d,
            id: d.id,
            isLive: true,
            source: 'live'
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch live disasters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDatabaseDisasters = async () => {
    setIsLoadingDatabase(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      // Increase limit to get all disasters
      params.append('limit', '100');
      const response = await fetch(`/api/disasters?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        console.log('Fetched disasters from API:', data.data.disasters.length);
        
        // Show ALL disasters from database, not just USA
        // The map will filter to USA, but the list shows all
        const allDisasters = data.data.disasters || [];
        setDatabaseDisasters(allDisasters);
        
        // For map display, filter to USA-based disasters only
        const usaDisasters = allDisasters.filter((d: ManagedDisaster) => {
          const country = d.location?.country || '';
          const isUSA = country.toLowerCase().includes('usa') || 
                       country.toLowerCase().includes('united states') ||
                       country.toLowerCase() === 'us';
          
          // Also check coordinates if available (handle both array and object formats)
          if (!isUSA && d.location?.coordinates) {
            let lat: number | undefined;
            let lng: number | undefined;
            
            if (Array.isArray(d.location.coordinates) && d.location.coordinates.length === 2) {
              // GeoJSON format: [lng, lat]
              lng = d.location.coordinates[0];
              lat = d.location.coordinates[1];
            } else if (typeof d.location.coordinates === 'object' && 'lat' in d.location.coordinates) {
              // Object format: {lat, lng}
              lat = (d.location.coordinates as any).lat;
              lng = (d.location.coordinates as any).lng;
            }
            
            if (lat !== undefined && lng !== undefined) {
              return lat >= 24 && lat <= 49 &&
                     lng >= -125 && lng <= -66;
            }
          }
          return isUSA;
        });
        
        // Transform database disasters for map display - handle coordinate format
        // Use usaDisasters for map (filtered to USA), but allDisasters for the list
        const transformedDatabaseDisasters = usaDisasters.map((d: ManagedDisaster) => {
          // Handle coordinates - database stores as [lng, lat] (GeoJSON format)
          let coordinates: { lat: number; lng: number } | undefined;
          if (d.location?.coordinates) {
            if (Array.isArray(d.location.coordinates) && d.location.coordinates.length === 2) {
              // GeoJSON format: [lng, lat]
              coordinates = {
                lat: d.location.coordinates[1],
                lng: d.location.coordinates[0]
              };
            } else if (typeof d.location.coordinates === 'object' && 'lat' in d.location.coordinates) {
              // Object format: {lat, lng}
              coordinates = d.location.coordinates as { lat: number; lng: number };
            }
          }
          
          return {
            id: d._id,
            title: d.title,
            description: d.description,
            type: d.type,
            category: d.type,
            severity: d.severity,
            status: d.status,
            location: {
              coordinates: coordinates,
              country: d.location?.country || 'USA',
              state: d.location?.state,
            },
            date: d.createdAt,
            isLive: false,
            source: 'database',
            affectedArea: d.affectedArea,
            estimatedAffectedPeople: d.estimatedAffectedPeople,
          };
        });
        
        // Combine live and database disasters for display
        const combined = [
          ...liveDisasters.map(d => ({
            ...d,
            id: d.id,
            isLive: true,
            source: 'live'
          })),
          ...transformedDatabaseDisasters
        ];
        setAllDisasters(combined);
        console.log('Database disasters set:', allDisasters.length);
      } else {
        console.error('Failed to fetch disasters:', data);
        toast.error(data.error || 'Failed to fetch database disasters');
      }
    } catch (error) {
      console.error('Error fetching database disasters:', error);
      toast.error('Failed to fetch database disasters');
    } finally {
      setIsLoadingDatabase(false);
    }
  };

  // Update combined disasters when either live or database disasters change
  useEffect(() => {
    // Transform database disasters for map display
    const transformedDatabaseDisasters = databaseDisasters.map((d: ManagedDisaster) => {
      let coordinates: { lat: number; lng: number } | undefined;
      if (d.location?.coordinates) {
        if (Array.isArray(d.location.coordinates)) {
          coordinates = {
            lat: d.location.coordinates[1],
            lng: d.location.coordinates[0]
          };
        } else if (typeof d.location.coordinates === 'object' && 'lat' in d.location.coordinates) {
          coordinates = d.location.coordinates as { lat: number; lng: number };
        }
      }
      
      return {
        id: d._id,
        title: d.title,
        description: d.description,
        type: d.type,
        category: d.type,
        severity: d.severity,
        status: d.status,
        location: {
          coordinates: coordinates,
          country: d.location?.country || 'USA',
          state: d.location?.state,
        },
        date: d.createdAt,
        isLive: false,
        source: 'database',
        affectedArea: d.affectedArea,
        estimatedAffectedPeople: d.estimatedAffectedPeople,
      };
    });
    
    const combined = [
      ...liveDisasters.map(d => ({
        ...d,
        id: d.id,
        isLive: true,
        source: 'live'
      })),
      ...transformedDatabaseDisasters
    ];
    setAllDisasters(combined);
  }, [liveDisasters, databaseDisasters]);

  // Refresh data periodically
  useEffect(() => {
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchLiveDisasters();
      if (token) {
        fetchDatabaseDisasters();
        fetchVolunteers();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  // Fetch database disasters when search query changes
  useEffect(() => {
    if (token) {
      fetchDatabaseDisasters();
    }
  }, [searchQuery]);

  const handleSubmitDisaster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedManagedDisaster ? `/api/disasters/${selectedManagedDisaster._id}` : '/api/disasters';
      const method = selectedManagedDisaster ? 'PUT' : 'POST';
      
      // Prepare coordinates - API expects [lng, lat] format for GeoJSON
      let coordinates: [number, number] | undefined;
      if (formData.lat && formData.lng) {
        const lat = parseFloat(formData.lat);
        const lng = parseFloat(formData.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          coordinates = [lng, lat]; // GeoJSON format: [longitude, latitude]
        }
      }
      
      const body = {
        title: formData.title,
        type: formData.type,
        description: formData.description,
        severity: formData.severity,
        status: formData.status,
        location: {
          address: formData.address || '',
          city: formData.city || '',
          state: formData.state || '',
          country: formData.country || 'USA',
          coordinates: coordinates,
        },
        affectedArea: formData.affectedArea ? parseFloat(formData.affectedArea) : 0,
        affectedPopulation: formData.estimatedAffectedPeople ? parseInt(formData.estimatedAffectedPeople) : 0,
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        toast.success(selectedManagedDisaster ? 'Disaster updated!' : 'Disaster added successfully!');
        setShowAddModal(false);
        setSelectedManagedDisaster(null);
        setFormData({
          title: '', type: 'flood', description: '', severity: 'medium', status: 'active',
          address: '', city: '', state: '', country: 'USA',
          lat: '', lng: '', affectedArea: '', estimatedAffectedPeople: '',
        });
        // Refresh both live and database disasters
        await fetchDatabaseDisasters();
        await fetchLiveDisasters();
      } else {
        toast.error(data.error || 'Failed to save disaster');
        console.error('Error response:', data);
      }
    } catch (error) {
      console.error('Error submitting disaster:', error);
      toast.error('Operation failed. Please try again.');
    }
  };

  const handleDeleteDisaster = async (id: string) => {
    if (!confirm('Are you sure you want to delete this disaster?')) return;
    try {
      const response = await fetch(`/api/disasters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Disaster deleted!');
        fetchDatabaseDisasters();
      } else toast.error(data.error);
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const getVolunteerName = (volunteer: AssignedVolunteer['volunteerId']): string => {
    // First try to get from the volunteer object passed in
    if (typeof volunteer === 'object' && volunteer?.userId) {
      if (volunteer.userId.firstName && volunteer.userId.lastName) {
        return `${volunteer.userId.firstName} ${volunteer.userId.lastName}`;
      }
      if (volunteer.userId.name) {
        return volunteer.userId.name;
      }
    }
    
    // If not found, try to find in the fetched volunteers list
    if (typeof volunteer === 'object' && volunteer?._id) {
      const volId = typeof volunteer._id === 'string' 
        ? volunteer._id 
        : (typeof volunteer._id === 'object' && volunteer._id !== null ? String(volunteer._id) : '');
      if (volId) {
        const fullVolunteer = volunteers.find(v => v._id === volId);
        if (fullVolunteer?.userId) {
          if (fullVolunteer.userId.firstName && fullVolunteer.userId.lastName) {
            return `${fullVolunteer.userId.firstName} ${fullVolunteer.userId.lastName}`;
          }
          if (fullVolunteer.userId.name) {
            return fullVolunteer.userId.name;
          }
        }
      }
    }
    
    // Fallback to volunteerId if available
    if (typeof volunteer === 'object' && volunteer?.volunteerId) {
      return volunteer.volunteerId;
    }
    
    return 'Unknown Volunteer';
  };

  const handleRemoveVolunteerFromDisaster = async (disasterId: string, volunteerId: string) => {
    if (!confirm('Are you sure you want to remove this volunteer from the disaster?')) return;
    
    try {
      const response = await fetch(`/api/disasters/${disasterId}/assign-volunteer?volunteerId=${volunteerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Volunteer removed from disaster successfully!');
        // Refresh database disasters and volunteers to update the UI
        await Promise.all([fetchDatabaseDisasters(), fetchVolunteers()]);
        // Update the modal if it's open - need to wait for state update
        setTimeout(() => {
          if (selectedDisasterForVolunteers && selectedDisasterForVolunteers._id === disasterId) {
            const updatedDisaster = databaseDisasters.find(d => d._id === disasterId);
            if (updatedDisaster && updatedDisaster.assignedVolunteers && updatedDisaster.assignedVolunteers.length > 0) {
              setSelectedDisasterForVolunteers(updatedDisaster);
            } else {
              setShowVolunteersModal(false);
              setSelectedDisasterForVolunteers(null);
            }
          }
        }, 100);
      } else {
        toast.error(data.error || 'Failed to remove volunteer');
      }
    } catch (error) {
      console.error('Error removing volunteer:', error);
      toast.error('Failed to remove volunteer from disaster');
    }
  };

  const filteredDisasters = allDisasters.filter(d => {
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterSeverity !== 'all' && d.severity !== filterSeverity) return false;
    
    // Always filter to USA only
    const country = d.location?.country || '';
    const isUSA = country.toLowerCase().includes('united states') || 
                 country.toLowerCase().includes('usa') || 
                 country.toLowerCase().includes('u.s.') ||
                 country.toLowerCase() === 'us';
    if (!isUSA) return false;
    
    if (filterState !== 'all' && d.location?.state !== filterState) return false;
    return true;
  });

  const stats = {
    total: allDisasters.length,
    critical: allDisasters.filter(d => d.severity === 'critical').length,
    high: allDisasters.filter(d => d.severity === 'high').length,
    wildfires: allDisasters.filter(d => d.type === 'wildfire').length,
    storms: allDisasters.filter(d => d.type === 'cyclone').length,
    live: liveDisasters.length,
    database: databaseDisasters.length,
  };

  const uniqueTypes = Array.from(new Set(allDisasters.map(d => d.type))).sort();
  const uniqueCountries = Array.from(new Set(allDisasters.map(d => d.location?.country).filter(Boolean))).sort();
  
  // Get states/provinces for the selected country dynamically from disaster data
  const getStatesForCountry = (country: string): string[] => {
    if (!country || country === 'all') return [];
    return Array.from(new Set(
      allDisasters
        .filter(d => d.location?.country === country && d.location?.state)
        .map(d => d.location?.state)
        .filter(Boolean) as string[]
    )).sort();
  };
  
  const availableStates = filterCountry !== 'all' ? getStatesForCountry(filterCountry) : [];
  
  // Auto-scroll to selected disaster in the list
  useEffect(() => {
    if (selectedDisaster) {
      const element = document.getElementById(`disaster-${selectedDisaster.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedDisaster]);

  return (
    <DashboardLayout title="Live Disasters" subtitle="Real-time global disaster monitoring">

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card padding="md" className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <GlobeAltIcon className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
          <p className="text-xs text-[var(--text-muted)]">Active Events</p>
        </Card>
        <Card padding="md" className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-red-500/20 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
          <p className="text-xs text-[var(--text-muted)]">Critical</p>
        </Card>
        <Card padding="md" className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-400">{stats.high}</p>
          <p className="text-xs text-[var(--text-muted)]">High Severity</p>
        </Card>
        <Card padding="md" className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <FireIcon className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{stats.wildfires}</p>
          <p className="text-xs text-[var(--text-muted)]">Wildfires</p>
        </Card>
        <Card padding="md" className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <CloudIcon className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.storms}</p>
          <p className="text-xs text-[var(--text-muted)]">Storms</p>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card padding="none" className="h-[600px] overflow-hidden">
            <div className="h-full">
              <LiveDisasterMap
                disasters={filteredDisasters.map((d: any) => ({
                  id: d.id,
                  title: d.title,
                  type: d.type,
                  severity: d.severity,
                  location: {
                    coordinates: d.location?.coordinates
                  }
                }))}
                selectedId={selectedDisaster?.id}
                highlightedId={highlightedDisasterId}
                onSelectDisaster={(id) => {
                  const disaster = filteredDisasters.find(d => d.id === id);
                  if (disaster) {
                    setSelectedDisaster(disaster);
                    setHighlightedDisasterId(id);
                    // Clear highlight after animation
                    setTimeout(() => setHighlightedDisasterId(null), 2000);
                  }
                }}
              />
            </div>
          </Card>
        </div>

        {/* Sidebar - Events List */}
        <div className="lg:col-span-1">
          <Card padding="none" className="h-[600px] flex flex-col">
            {/* Filters */}
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-input)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <FunnelIcon className="w-4 h-4" />
                  Filters
                </h3>
                {(filterType !== 'all' || filterSeverity !== 'all' || filterCountry !== 'all' || filterCountries.length > 0 || filterState !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setFilterSeverity('all');
                      setFilterCountry('all');
                      setFilterCountries([]);
                      setFilterState('all');
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <XMarkIcon className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-3 mb-3">
                <div className="flex flex-wrap gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setSelectedDisaster(null);
                    }}
                    className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 transition-colors flex-1 min-w-[120px]"
                  >
                    <option value="all">All Types</option>
                    {uniqueTypes.map(type => (
                      <option key={type} value={type} className="capitalize">{type}</option>
                    ))}
                  </select>
                  <select
                    value={filterSeverity}
                    onChange={(e) => {
                      setFilterSeverity(e.target.value);
                      setSelectedDisaster(null);
                    }}
                    className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 transition-colors flex-1 min-w-[120px]"
                  >
                    <option value="all">All Severity</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterCountry === 'all' ? (
                    <div className="flex-1 min-w-full">
                      <MultiSelect
                        label=""
                        options={uniqueCountries.filter((country): country is string => Boolean(country)).map(country => ({ value: country, label: country }))}
                        value={filterCountries}
                        onChange={(values) => {
                          setFilterCountries(values);
                          setSelectedDisaster(null);
                        }}
                        placeholder="Select countries (or choose single country below)..."
                      />
                    </div>
                  ) : (
                    <select
                      value={filterCountry}
                      onChange={(e) => {
                        setFilterCountry(e.target.value);
                        setFilterState('all'); // Reset state when country changes
                        setSelectedDisaster(null);
                      }}
                      className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 transition-colors flex-1 min-w-[140px]"
                    >
                      <option value="all">All Countries (Multi-select)</option>
                      {uniqueCountries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  )}
                  {filterCountry !== 'all' && availableStates.length > 0 && (
                    <select
                      value={filterState}
                      onChange={(e) => {
                        setFilterState(e.target.value);
                        setSelectedDisaster(null);
                      }}
                      className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 transition-colors flex-1 min-w-[140px]"
                    >
                      <option value="all">All States/Provinces</option>
                      {availableStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-muted)]">
                  Showing <span className="font-semibold text-[var(--text-primary)]">{filteredDisasters.length}</span> of <span className="font-semibold text-[var(--text-primary)]">{allDisasters.length}</span> events
                </p>
                {selectedDisaster && (
                  <button
                    onClick={() => setSelectedDisaster(null)}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <XMarkIcon className="w-3 h-3" />
                    Deselect
                  </button>
                )}
              </div>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : filteredDisasters.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <GlobeAltIcon className="w-12 h-12 text-[var(--text-muted)] mb-3" />
                  <p className="text-[var(--text-muted)]">No disasters matching filters</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)]">
                  {filteredDisasters.map((disaster) => {
                    const Icon = typeIcons[disaster.type] || typeIcons.default;
                    const colors = severityColors[disaster.severity] || severityColors.medium;
                    const isSelected = selectedDisaster?.id === disaster.id;

                    return (
                      <button
                        key={disaster.id}
                        id={`disaster-${disaster.id}`}
                        onClick={() => {
                          setSelectedDisaster(isSelected ? null : disaster);
                          setHighlightedDisasterId(disaster.id);
                          setTimeout(() => setHighlightedDisasterId(null), 2000);
                        }}
                        className={`w-full p-4 text-left hover:bg-[var(--bg-input)] transition-all duration-200 ${
                          isSelected 
                            ? 'bg-[var(--bg-input)] border-l-4 border-purple-500 shadow-lg' 
                            : highlightedDisasterId === disaster.id
                            ? 'bg-purple-500/10 border-l-4 border-purple-400 animate-pulse'
                            : 'border-l-4 border-transparent'
                        }`}
                        onMouseEnter={() => setHighlightedDisasterId(disaster.id)}
                        onMouseLeave={() => {
                          if (highlightedDisasterId === disaster.id && !isSelected) {
                            setHighlightedDisasterId(null);
                          }
                        }}
                      >
                        <div className="flex gap-3">
                          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${colors.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-medium text-[var(--text-primary)] text-sm line-clamp-1">
                                {disaster.title}
                              </h4>
                              <Badge
                                variant={disaster.severity === 'critical' ? 'danger' : disaster.severity === 'high' ? 'warning' : 'secondary'}
                                size="sm"
                              >
                                {disaster.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] line-clamp-1 mb-2">
                              {disaster.category || disaster.type}
                              {disaster.location?.country && ` • ${disaster.location.country}`}
                              {disaster.location?.state && ` • ${disaster.location.state}`}
                              {disaster.isLive && <span className="text-emerald-400 ml-1">• LIVE</span>}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {disaster.date ? new Date(disaster.date).toLocaleDateString() : 'N/A'}
                              </span>
                              {disaster.magnitude && (
                                <span className="flex items-center gap-1">
                                  <SignalIcon className="w-3 h-3" />
                                  {disaster.magnitude} {disaster.magnitudeUnit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                              {disaster.description}
                            </p>
                            {disaster.source && (
                              <a
                                href={disaster.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Source
                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Data Sources */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-input)]">
              <p className="text-xs text-[var(--text-muted)] text-center">
                Data from <span className="text-purple-400">NASA EONET</span> & <span className="text-purple-400">ReliefWeb</span>
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* All Disasters from Database Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">All Disasters</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Showing {stats.live} live disasters and {stats.database} from database (USA only)
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setSelectedManagedDisaster(null);
                setFormData({
                  title: '', type: 'flood', description: '', severity: 'medium', status: 'active',
                  address: '', city: '', state: '', country: 'USA',
                  lat: '', lng: '', affectedArea: '', estimatedAffectedPeople: '',
                });
                setShowAddModal(true);
              }}
              leftIcon={<PlusIcon className="w-4 h-4" />}
              variant="gradient"
            >
              Add Disaster
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <Input
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            placeholder="Search all disasters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* All Disasters Table - Show only database disasters */}
        {isLoadingDatabase ? (
          <Card className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          </Card>
        ) : databaseDisasters.length === 0 ? (
          <Card className="p-6">
            <div className="text-center py-12">
              <MapPinIcon className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
              <p className="text-[var(--text-secondary)]">No disasters in database</p>
              {canManage && (
                <p className="text-sm text-[var(--text-muted)] mt-2">Click "Add Disaster" to create one</p>
              )}
            </div>
          </Card>
        ) : (
          <Table
            data={databaseDisasters.filter(d => {
              // Apply search filter
              if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return d.title.toLowerCase().includes(query) ||
                       d.description?.toLowerCase().includes(query) ||
                       d.type.toLowerCase().includes(query) ||
                       d.location?.city?.toLowerCase().includes(query) ||
                       d.location?.state?.toLowerCase().includes(query);
              }
              return true;
            })}
            isLoading={isLoadingDatabase}
            emptyMessage="No disasters found"
            columns={[
              {
                key: 'title',
                label: 'Disaster',
                render: (disaster: ManagedDisaster) => {
                  const Icon = typeIcons[disaster.type] || typeIcons.default;
                  const colors = severityColors[disaster.severity] || severityColors.medium;
                  return (
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{disaster.title}</div>
                        <div className="text-xs text-[var(--text-muted)]">{disaster.type}</div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'location',
                label: 'Location',
                render: (disaster: ManagedDisaster) => (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-sm">
                      {disaster.location?.city || 'Unknown'}, {disaster.location?.state || 'Unknown'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'severity',
                label: 'Severity',
                render: (disaster: ManagedDisaster) => (
                  <Badge
                    variant={disaster.severity === 'critical' ? 'danger' : disaster.severity === 'high' ? 'warning' : 'secondary'}
                    size="sm"
                    className="capitalize"
                  >
                    {disaster.severity}
                  </Badge>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (disaster: ManagedDisaster) => (
                  <Badge
                    variant={disaster.status === 'active' ? 'danger' : disaster.status === 'resolved' ? 'success' : 'secondary'}
                    size="sm"
                  >
                    {disaster.status}
                  </Badge>
                ),
              },
              {
                key: 'assignedVolunteers',
                label: 'Assigned Volunteers',
                render: (disaster: ManagedDisaster) => {
                  const assignedCount = disaster.assignedVolunteers?.length || 0;
                  return (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (assignedCount > 0) {
                            setSelectedDisasterForVolunteers(disaster);
                            setShowVolunteersModal(true);
                          }
                        }}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer flex-1 text-left"
                        disabled={assignedCount === 0}
                      >
                      <UserGroupIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                      <span className="text-sm font-medium shrink-0">{assignedCount}</span>
                      {assignedCount > 0 && (
                        <div className="flex-1 min-w-0 ml-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {disaster.assignedVolunteers?.slice(0, 2).map((av, idx) => {
                              let volId = '';
                              if (typeof av.volunteerId === 'object' && av.volunteerId?._id) {
                                volId = typeof av.volunteerId._id === 'string' 
                                  ? av.volunteerId._id 
                                  : String(av.volunteerId._id);
                              } else if (typeof av.volunteerId === 'string') {
                                volId = av.volunteerId;
                              }
                              
                              // Find full volunteer data from fetched volunteers list
                              const fullVolunteer = volunteers.find(v => v._id === volId);
                              
                              // Get name from full volunteer data or fallback to getVolunteerName
                              let volunteerName = 'Unknown';
                              let volunteerEmail = '';
                              let volunteerPhone = '';
                              
                              if (fullVolunteer?.userId) {
                                if (fullVolunteer.userId.firstName && fullVolunteer.userId.lastName) {
                                  volunteerName = `${fullVolunteer.userId.firstName} ${fullVolunteer.userId.lastName}`;
                                } else if (fullVolunteer.userId.name) {
                                  volunteerName = fullVolunteer.userId.name;
                                }
                                volunteerEmail = fullVolunteer.userId.email || '';
                                volunteerPhone = fullVolunteer.userId.phone || '';
                              } else {
                                volunteerName = getVolunteerName(av.volunteerId);
                                volunteerEmail = av.volunteerId?.userId?.email || '';
                                volunteerPhone = av.volunteerId?.userId?.phone || '';
                              }
                              
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-input)] rounded-md border border-[var(--border-color)]"
                                  title={`${volunteerName}${volunteerEmail ? ` - ${volunteerEmail}` : ''}${volunteerPhone ? ` - ${volunteerPhone}` : ''}`}
                                >
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                    {volunteerName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-xs text-[var(--text-primary)] truncate max-w-[100px]">
                                    {volunteerName}
                                  </span>
                                </div>
                              );
                            })}
                            {assignedCount > 2 && (
                              <div className="text-xs text-[var(--text-muted)] px-2 py-1 bg-[var(--bg-input)] rounded-md border border-[var(--border-color)]">
                                +{assignedCount - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                    {canManage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDisasterForAssign(disaster);
                          setShowAssignVolunteerModal(true);
                        }}
                        className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-400/10 transition-colors shrink-0"
                        title="Assign Volunteer"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  );
                },
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (disaster: ManagedDisaster) => {
                  return (
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const lat = Array.isArray(disaster.location?.coordinates) 
                                ? disaster.location.coordinates[1]
                                : (disaster.location?.coordinates as any)?.lat;
                              const lng = Array.isArray(disaster.location?.coordinates)
                                ? disaster.location.coordinates[0]
                                : (disaster.location?.coordinates as any)?.lng;
                              setSelectedManagedDisaster(disaster);
                              setFormData({
                                title: disaster.title,
                                type: disaster.type,
                                description: disaster.description,
                                severity: disaster.severity,
                                status: disaster.status,
                                address: disaster.location?.address || '',
                                city: disaster.location?.city || '',
                                state: disaster.location?.state || '',
                                country: disaster.location?.country || 'USA',
                                lat: lat?.toString() || '',
                                lng: lng?.toString() || '',
                                affectedArea: disaster.affectedArea?.toString() || '',
                                estimatedAffectedPeople: disaster.estimatedAffectedPeople?.toString() || '',
                              });
                              setShowAddModal(true);
                            }}
                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDisaster(disaster._id);
                            }}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDisasterForAssign(disaster);
                              setShowAssignVolunteerModal(true);
                            }}
                            className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-400/10 transition-colors"
                            title="Assign Volunteer"
                          >
                            <UserPlusIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                },
              },
            ]}
            rowKey="_id"
          />
        )}
      </div>

      {/* Add/Edit Disaster Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedManagedDisaster(null);
        }}
        title={selectedManagedDisaster ? 'Edit Disaster' : 'Add New Disaster'}
        size="lg"
        className="z-[10001]"
      >
        <form onSubmit={handleSubmitDisaster} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Disaster title"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Type *</label>
              <Select
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value })}
                options={[
                  { value: 'flood', label: 'Flood' },
                  { value: 'earthquake', label: 'Earthquake' },
                  { value: 'cyclone', label: 'Cyclone' },
                  { value: 'fire', label: 'Fire' },
                  { value: 'wildfire', label: 'Wildfire' },
                  { value: 'landslide', label: 'Landslide' },
                  { value: 'drought', label: 'Drought' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Severity *</label>
              <Select
                value={formData.severity}
                onChange={(value) => setFormData({ ...formData, severity: value })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Disaster description"
              className="w-full px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">City</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">State</label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Latitude</label>
              <Input
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                placeholder="e.g., 40.7128"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Longitude</label>
              <Input
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                placeholder="e.g., -74.0060"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Affected Area (sq km)</label>
              <Input
                type="number"
                value={formData.affectedArea}
                onChange={(e) => setFormData({ ...formData, affectedArea: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Affected People</label>
              <Input
                type="number"
                value={formData.estimatedAffectedPeople}
                onChange={(e) => setFormData({ ...formData, estimatedAffectedPeople: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setSelectedManagedDisaster(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient">
              {selectedManagedDisaster ? 'Update' : 'Add'} Disaster
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assigned Volunteers Modal */}
      <Modal
        isOpen={showVolunteersModal}
        onClose={() => {
          setShowVolunteersModal(false);
          setSelectedDisasterForVolunteers(null);
        }}
        title={`Assigned Volunteers - ${selectedDisasterForVolunteers?.title || 'Disaster'}`}
        size="lg"
        className="z-[10001]"
      >
        {selectedDisasterForVolunteers && (
          <div className="space-y-4">
            {selectedDisasterForVolunteers.assignedVolunteers && selectedDisasterForVolunteers.assignedVolunteers.length > 0 ? (
              <div className="space-y-3">
                {selectedDisasterForVolunteers.assignedVolunteers.map((av, idx) => {
                  const volunteer = av.volunteerId;
                  let volId = '';
                  if (typeof volunteer === 'object' && volunteer?._id) {
                    volId = typeof volunteer._id === 'string' 
                      ? volunteer._id 
                      : String(volunteer._id);
                  } else if (typeof volunteer === 'string') {
                    volId = volunteer;
                  }
                  
                  // Find full volunteer data from fetched volunteers list
                  const fullVolunteer = volunteers.find(v => v._id === volId);
                  
                  // Get name from full volunteer data or fallback to getVolunteerName
                  let volunteerName = 'Unknown Volunteer';
                  let volunteerEmail = '';
                  let volunteerPhone = '';
                  
                  if (fullVolunteer?.userId) {
                    if (fullVolunteer.userId.firstName && fullVolunteer.userId.lastName) {
                      volunteerName = `${fullVolunteer.userId.firstName} ${fullVolunteer.userId.lastName}`;
                    } else if (fullVolunteer.userId.name) {
                      volunteerName = fullVolunteer.userId.name;
                    }
                    volunteerEmail = fullVolunteer.userId.email || '';
                    volunteerPhone = fullVolunteer.userId.phone || '';
                  } else {
                    volunteerName = getVolunteerName(av.volunteerId);
                    volunteerEmail = volunteer?.userId?.email || '';
                    volunteerPhone = volunteer?.userId?.phone || '';
                  }
                  
                  const initials = volunteerName.charAt(0).toUpperCase();
                  const isExpanded = expandedVolunteers.has(volId);
                  
                  
                  const toggleExpand = () => {
                    const newExpanded = new Set(expandedVolunteers);
                    if (isExpanded) {
                      newExpanded.delete(volId);
                    } else {
                      newExpanded.add(volId);
                    }
                    setExpandedVolunteers(newExpanded);
                  };
                  
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg hover:border-purple-500/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-semibold text-[var(--text-primary)]">{volunteerName}</h4>
                            <Badge
                              variant={av.status === 'active' ? 'success' : av.status === 'completed' ? 'primary' : 'secondary'}
                              size="sm"
                              className="capitalize"
                            >
                              {av.status}
                            </Badge>
                            {canManage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (volId) {
                                    handleRemoveVolunteerFromDisaster(selectedDisasterForVolunteers._id, volId);
                                  }
                                }}
                                className="ml-auto p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                title="Remove Volunteer"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          
                          {/* Basic Information - Always Visible */}
                          <div className="space-y-2 mb-3">
                            {/* Name - Always show */}
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--text-muted)] font-medium text-sm">Name:</span>
                              <span className="text-[var(--text-primary)] font-semibold">{volunteerName}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              {/* Volunteer ID */}
                              {volunteer?.volunteerId && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[var(--text-muted)] font-medium">ID:</span>
                                  <span className="font-mono text-xs font-bold text-[var(--primary-500)] bg-[var(--primary-500)]/10 px-2 py-1 rounded">
                                    {volunteer.volunteerId}
                                  </span>
                                </div>
                              )}
                              
                              {/* Email */}
                              {volunteerEmail && (
                                <div className="flex items-center gap-2">
                                  <EnvelopeIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                                  <span className="text-[var(--text-secondary)] truncate">
                                    {volunteerEmail}
                                  </span>
                                </div>
                              )}
                              
                              {/* Phone */}
                              {volunteerPhone && (
                                <div className="flex items-center gap-2">
                                  <PhoneIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                                  <span className="text-[var(--text-secondary)]">
                                    {volunteerPhone}
                                  </span>
                                </div>
                              )}
                              
                              {/* Blood Group */}
                              {fullVolunteer?.bloodGroup && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[var(--text-muted)] font-medium">Blood Group:</span>
                                  <span className="text-[var(--text-secondary)] font-semibold">{fullVolunteer.bloodGroup}</span>
                                </div>
                              )}
                              
                              {/* Assigned Date */}
                              {av.assignedAt && (
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                                  <span className="text-[var(--text-secondary)]">
                                    Assigned: {new Date(av.assignedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Expandable Additional Details */}
                          {(() => {
                            const volId = typeof volunteer?._id === 'string' 
                              ? volunteer._id 
                              : (volunteer as any)?._id?.toString() || '';
                            const isExpanded = expandedVolunteers.has(volId);
                            const fullVolunteer = volunteers.find(v => v._id === volId);
                            
                            if (!fullVolunteer) return null;
                            
                            const toggleExpand = () => {
                              const newExpanded = new Set(expandedVolunteers);
                              if (isExpanded) {
                                newExpanded.delete(volId);
                              } else {
                                newExpanded.add(volId);
                              }
                              setExpandedVolunteers(newExpanded);
                            };
                            
                            return (
                              <div>
                                <button
                                  onClick={toggleExpand}
                                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors mb-2"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUpIcon className="w-4 h-4" />
                                      <span>Hide Details</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDownIcon className="w-4 h-4" />
                                      <span>Show More Details</span>
                                    </>
                                  )}
                                </button>
                              
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-3">
                                  {/* Skills */}
                                  {fullVolunteer.skills && fullVolunteer.skills.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <AcademicCapIcon className="w-4 h-4 text-[var(--text-muted)]" />
                                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Skills</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {fullVolunteer.skills.slice(0, 5).map((skill: string, i: number) => (
                                          <Badge key={i} variant="primary" size="sm">{skill}</Badge>
                                        ))}
                                        {fullVolunteer.skills.length > 5 && (
                                          <Badge variant="secondary" size="sm">+{fullVolunteer.skills.length - 5} more</Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Rating & Experience */}
                                  <div className="grid grid-cols-2 gap-3">
                                    {fullVolunteer.rating !== undefined && (
                                      <div>
                                        <div className="flex items-center gap-1 mb-1">
                                          <StarSolidIcon className="w-4 h-4 text-amber-400" />
                                          <span className="text-xs font-semibold text-[var(--text-muted)]">Rating</span>
                                        </div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                          {fullVolunteer.rating.toFixed(1)} / 5.0
                                          {fullVolunteer.totalReviews && (
                                            <span className="text-xs text-[var(--text-muted)] ml-1">
                                              ({fullVolunteer.totalReviews} reviews)
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    )}
                                    {fullVolunteer.completedMissions !== undefined && (
                                      <div>
                                        <span className="text-xs font-semibold text-[var(--text-muted)]">Missions</span>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                          {fullVolunteer.completedMissions} completed
                                        </p>
                                      </div>
                                    )}
                                    {fullVolunteer.experience?.years !== undefined && (
                                      <div>
                                        <span className="text-xs font-semibold text-[var(--text-muted)]">Experience</span>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                          {fullVolunteer.experience.years} years
                                        </p>
                                      </div>
                                    )}
                                    {fullVolunteer.availability && (
                                      <div>
                                        <span className="text-xs font-semibold text-[var(--text-muted)]">Availability</span>
                                        <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                                          {fullVolunteer.availability.replace('_', ' ')}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Address */}
                                  {fullVolunteer.address && (fullVolunteer.address.city || fullVolunteer.address.state) && (
                                    <div>
                                      <span className="text-xs font-semibold text-[var(--text-muted)]">Location</span>
                                      <p className="text-sm text-[var(--text-secondary)]">
                                        {[fullVolunteer.address.city, fullVolunteer.address.state]
                                          .filter(Boolean)
                                          .join(', ')}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserGroupIcon className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
                <p className="text-[var(--text-secondary)]">No volunteers assigned to this disaster</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Assign Volunteer Modal */}
      <Modal
        isOpen={showAssignVolunteerModal}
        onClose={() => {
          setShowAssignVolunteerModal(false);
          setSelectedDisasterForAssign(null);
          setSelectedVolunteerId('');
        }}
        title={`Assign Volunteer - ${selectedDisasterForAssign?.title || 'Disaster'}`}
        size="md"
        className="z-[10001]"
      >
        {selectedDisasterForAssign && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedVolunteerId) {
                toast.error('Please select a volunteer');
                return;
              }

              try {
                const response = await fetch(`/api/disasters/${selectedDisasterForAssign._id}/assign-volunteer`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({ volunteerId: selectedVolunteerId })
                });
                const data = await response.json();
                if (data.success) {
                  toast.success('Volunteer assigned successfully!');
                  await fetchDatabaseDisasters();
                  await fetchVolunteers();
                  setShowAssignVolunteerModal(false);
                  setSelectedDisasterForAssign(null);
                  setSelectedVolunteerId('');
                  // Open volunteers modal to show updated list
                  const updatedDisaster = databaseDisasters.find(d => d._id === selectedDisasterForAssign._id);
                  if (updatedDisaster) {
                    setSelectedDisasterForVolunteers(updatedDisaster);
                    setShowVolunteersModal(true);
                  }
                } else {
                  toast.error(data.error || 'Failed to assign volunteer');
                }
              } catch (error) {
                console.error('Error assigning volunteer:', error);
                toast.error('Failed to assign volunteer');
              }
            }}
            className="space-y-4"
          >
            <div>
              <Select
                label="Select Volunteer"
                value={selectedVolunteerId}
                onChange={(value) => setSelectedVolunteerId(value)}
                required
                options={[
                  { value: '', label: 'Choose a volunteer...' },
                  ...volunteers
                    .filter(v => {
                      // Filter out already assigned volunteers
                      const assignedVolunteerIds = selectedDisasterForAssign.assignedVolunteers?.map(
                        (av: any) => {
                          const volId = av.volunteerId;
                          return typeof volId === 'string' ? volId : (volId as any)?._id?.toString() || '';
                        }
                      ) || [];
                      
                      // Filter out volunteers who are on mission
                      const now = new Date();
                      const hasActiveAssignments = v.assignedDisasters?.some(
                        (ad: any) => {
                          const toDate = new Date(ad.toDate);
                          const status = ad.status;
                          return toDate > now && (status === 'assigned' || status === 'active');
                        }
                      );
                      
                      const isOnMission = v.availability === 'on_mission' || hasActiveAssignments;
                      
                      return !assignedVolunteerIds.includes(v._id) && !isOnMission;
                    })
                    .map((volunteer) => {
                      const name = volunteer.userId?.firstName && volunteer.userId?.lastName
                        ? `${volunteer.userId.firstName} ${volunteer.userId.lastName}`
                        : volunteer.userId?.name || volunteer.volunteerId || 'Unknown';
                      return {
                        value: volunteer._id,
                        label: `${name} (${volunteer.volunteerId}) - ${volunteer.availability || 'N/A'}`
                      };
                    })
                ]}
              />
            </div>
            {volunteers.filter(v => {
              const assignedVolunteerIds = selectedDisasterForAssign.assignedVolunteers?.map(
                (av: any) => {
                  const volId = av.volunteerId;
                  return typeof volId === 'string' ? volId : (volId as any)?._id?.toString() || '';
                }
              ) || [];
              
              // Check if volunteer is on mission
              const now = new Date();
              const hasActiveAssignments = v.assignedDisasters?.some(
                (ad: any) => {
                  const toDate = new Date(ad.toDate);
                  const status = ad.status;
                  return toDate > now && (status === 'assigned' || status === 'active');
                }
              );
              const isOnMission = v.availability === 'on_mission' || hasActiveAssignments;
              
              return !assignedVolunteerIds.includes(v._id) && !isOnMission;
            }).length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">
                All available volunteers are already assigned to this disaster or are currently on mission.
              </p>
            )}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowAssignVolunteerModal(false);
                  setSelectedDisasterForAssign(null);
                  setSelectedVolunteerId('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                className="flex-1"
                disabled={!selectedVolunteerId || volunteers.filter(v => {
                  const assignedVolunteerIds = selectedDisasterForAssign.assignedVolunteers?.map(
                    (av: any) => {
                      const volId = av.volunteerId;
                      return typeof volId === 'string' ? volId : (volId as any)?._id?.toString() || '';
                    }
                  ) || [];
                  return !assignedVolunteerIds.includes(v._id);
                }).length === 0}
              >
                Assign Volunteer
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
}

