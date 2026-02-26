'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Input, Modal, Select, Table } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDataCache } from '@/context/DataCacheContext';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';
import {
  GlobeAltIcon,
  MapPinIcon,
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
  CheckCircleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
const USA_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
];
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
  earthquake: BoltIcon,
  volcanic: FireIcon,
  iceberg: CloudIcon,
  drought: SunIcon,
  landslide: MapPinIcon,
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

export default function LiveDisastersClient() {
  const { token, hasPermission } = useAuth();
  const { getCachedData, updateCache } = useDataCache();
  const [liveDisasters, setLiveDisasters] = useState<LiveDisaster[]>([]);
  const [databaseDisasters, setDatabaseDisasters] = useState<ManagedDisaster[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [allDisasters, setAllDisasters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedDisaster, setSelectedDisaster] = useState<any | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterCountries, setFilterCountries] = useState<string[]>([]);
  const [filterState, setFilterState] = useState('all');
  const [filterSource, setFilterSource] = useState<'all' | 'database'>('all');
  const [filterFromDate, setFilterFromDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    return d.toISOString().slice(0, 10);
  });
  const [filterToDate, setFilterToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [highlightedDisasterId, setHighlightedDisasterId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedManagedDisaster, setSelectedManagedDisaster] = useState<ManagedDisaster | null>(null);
  const [showVolunteersModal, setShowVolunteersModal] = useState(false);
  const [selectedDisasterForVolunteers, setSelectedDisasterForVolunteers] = useState<ManagedDisaster | null>(null);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [isLoadingVolunteers, setIsLoadingVolunteers] = useState(false);
  const [showAssignVolunteerModal, setShowAssignVolunteerModal] = useState(false);
  const [selectedDisasterForAssign, setSelectedDisasterForAssign] = useState<ManagedDisaster | null>(null);
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState<string[]>([]);
  const [assignmentFromDate, setAssignmentFromDate] = useState<string>('');
  const [assignmentToDate, setAssignmentToDate] = useState<string>('');
  const [expandedVolunteers, setExpandedVolunteers] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    title: '',
    type: 'flood',
    description: '',
    severity: 'medium',
    status: 'active',
    address: '',
    locationType: 'local', // 'local' or 'widespread'
    range: '', // Range of disaster
    country: 'USA',
    lat: '',
    lng: '',
    estimatedAffectedPeople: '',
    selectedNasaDisasterId: '', // ID of selected NASA disaster
    useCustomDisaster: false, // Whether to use custom disaster fields
  });
  const [nasaDisasters, setNasaDisasters] = useState<LiveDisaster[]>([]);
  const [isLoadingNasaDisasters, setIsLoadingNasaDisasters] = useState(false);
  const [disasterSearchQuery, setDisasterSearchQuery] = useState('');
  const [showDisasterDropdown, setShowDisasterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listSearchQuery, setListSearchQuery] = useState('');

  const canManage = hasPermission(['super_admin', 'admin']);

  // Fetch volunteers list
  const fetchVolunteers = async () => {
    if (!token) return;
    setIsLoadingVolunteers(true);
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
    } finally {
      setIsLoadingVolunteers(false);
    }
  };

  const fetchLiveDisasters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/live-disasters');
      const data = await response.json();
      if (data.success) {
        const allLiveFromApi = data.data.disasters || [];
        setLiveDisasters(allLiveFromApi);
        updateCache('disasters', allLiveFromApi);
        setLastUpdated(new Date(data.data.metadata.lastUpdated));
      }
    } catch (error) {
      console.error('Failed to fetch live disasters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch NASA EONET disasters for the dropdown
  const fetchNasaDisasters = async () => {
    setIsLoadingNasaDisasters(true);
    try {
      const response = await fetch('/api/live-disasters');
      const data = await response.json();
      if (data.success) {
        // Get all disasters (not just USA) for selection
        setNasaDisasters(data.data.disasters || []);
      }
    } catch (error) {
      console.error('Failed to fetch NASA disasters:', error);
    } finally {
      setIsLoadingNasaDisasters(false);
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
        const allDisastersFromApi = data.data.disasters || [];
        setDatabaseDisasters(allDisastersFromApi);

        // Transform ALL database disasters for map (worldwide)
        const transformedDatabaseDisasters = allDisastersFromApi.map((d: ManagedDisaster) => {
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

        // Combine live (worldwide) and database (worldwide) for display
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
        console.log('Database disasters set:', combined.length);
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

  // Render from cache immediately, then refresh in background
  useEffect(() => {
    if (!token) return;
    const cachedLive = getCachedData('disasters');
    if (cachedLive && Array.isArray(cachedLive) && cachedLive.length > 0) {
      setLiveDisasters(cachedLive);
    }
    const loadInitialData = async () => {
      setIsInitialLoading(true);
      try {
        await Promise.all([
          fetchLiveDisasters(),
          fetchDatabaseDisasters(),
          fetchVolunteers(),
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadInitialData();
  }, [token]);

  // Update combined disasters when either live or database disasters change (current year only)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const isCurrentYear = (dateStr: string | undefined) => {
      if (!dateStr) return false;
      const y = new Date(dateStr).getFullYear();
      return !isNaN(y) && y === currentYear;
    };
    const dbCurrentYear = databaseDisasters.filter((d: ManagedDisaster) => isCurrentYear(d.createdAt));

    // Transform database disasters for map display
    const transformedDatabaseDisasters = dbCurrentYear.map((d: ManagedDisaster) => {
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

  // Close disaster dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDisasterDropdown && !target.closest('.disaster-search-container')) {
        setShowDisasterDropdown(false);
      }
    };

    if (showDisasterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDisasterDropdown]);

  // Load Google Maps Places API for autocomplete when modal opens and locationType is widespread
  useEffect(() => {
    if (showAddModal && formData.locationType === 'widespread') {
      // Load Google Maps Places API script
      const scriptId = 'google-maps-places-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
        if (apiKey) {
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            // Initialize autocomplete after script loads
            setTimeout(() => {
              const addressInput = document.getElementById('disaster-address-input') as HTMLInputElement;
              if (addressInput && (window as any).google?.maps?.places) {
                const autocomplete = new (window as any).google.maps.places.Autocomplete(addressInput, {
                  types: ['address'],
                  componentRestrictions: { country: 'us' },
                });

                autocomplete.addListener('place_changed', () => {
                  const place = autocomplete.getPlace();
                  if (place.geometry) {
                    setFormData({
                      ...formData,
                      address: place.formatted_address || formData.address,
                      lat: place.geometry.location.lat().toString(),
                      lng: place.geometry.location.lng().toString(),
                    });
                  }
                });
              }
            }, 100);
          };
          document.head.appendChild(script);
        }
      }
    }
  }, [showAddModal, formData.locationType]);

  const handleSubmitDisaster = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }
    if (!formData.address) {
      toast.error('Address is required');
      return;
    }
    if (!formData.range) {
      toast.error('Range of disaster is required');
      return;
    }

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

      // Extract city and state from address if available
      let city = '';
      let state = '';
      if (formData.address) {
        const addressParts = formData.address.split(',').map(p => p.trim());
        if (addressParts.length >= 2) {
          city = addressParts[0];
          state = addressParts[1];
        } else if (addressParts.length === 1) {
          city = addressParts[0];
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
          city: city,
          state: state,
          country: formData.country || 'USA',
          coordinates: coordinates,
        },
        affectedArea: 0, // Removed field
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
          address: '', locationType: 'local', range: '', country: 'USA',
          lat: '', lng: '', estimatedAffectedPeople: '',
          selectedNasaDisasterId: '', useCustomDisaster: false,
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
    if (!confirm('Are you sure you want to delete this disaster? This will also remove all assigned volunteers from this disaster.')) return;
    try {
      const response = await fetch(`/api/disasters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const volunteersCount = data.data?.removedVolunteersCount || 0;
        if (volunteersCount > 0) {
          toast.success(`Disaster deleted! ${volunteersCount} volunteer(s) have been removed and updated.`);
        } else {
          toast.success('Disaster deleted!');
        }
        // Refresh disasters and volunteers to update the UI
        await Promise.all([
          fetchDatabaseDisasters(),
          fetchVolunteers(),
        ]);
      } else {
        toast.error(data.error || 'Failed to delete disaster');
      }
    } catch (error) {
      console.error('Error deleting disaster:', error);
      toast.error('Delete failed. Please try again.');
    }
  };

  const getVolunteerName = (volunteer: any): string => {
    // First try to get from the volunteer object passed in
    if (typeof volunteer === 'object' && volunteer !== null) {
      if (volunteer.fullName) return volunteer.fullName;

      if (volunteer.userId) {
        if (volunteer.userId.firstName && volunteer.userId.lastName) {
          return `${volunteer.userId.firstName} ${volunteer.userId.lastName}`;
        }
        if (volunteer.userId.name) {
          return volunteer.userId.name;
        }
      }
    }

    // If not found, try to find in the fetched volunteers list
    let volId = '';
    if (typeof volunteer === 'string') {
      volId = volunteer;
    } else if (typeof volunteer === 'object' && volunteer !== null) {
      volId = volunteer.id || volunteer._id || String(volunteer.id || volunteer._id || '');
    }

    if (volId) {
      const fullVolunteer = volunteers.find(v => (v.id || v._id) === volId);
      if (fullVolunteer) {
        if (fullVolunteer.fullName) return fullVolunteer.fullName;

        if (fullVolunteer?.userId) {
          if (fullVolunteer.userId.firstName && fullVolunteer.userId.lastName) {
            return `${fullVolunteer.userId.firstName} ${fullVolunteer.userId.lastName}`;
          }
          if (fullVolunteer.userId.name) {
            return fullVolunteer.userId.name;
          }
        }
        
        return fullVolunteer.volunteerId || fullVolunteer.id || fullVolunteer._id || 'Unknown Volunteer';
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

  const filterDisasterByDate = (d: { date?: string }) => {
    const dateStr = d.date;
    if (!dateStr) return true;
    const eventDate = new Date(dateStr);
    if (isNaN(eventDate.getTime())) return true;
    const from = new Date(filterFromDate);
    const to = new Date(filterToDate);
    to.setHours(23, 59, 59, 999);
    return eventDate >= from && eventDate <= to;
  };

  const filteredDisasters = allDisasters.filter(d => {
    if (!filterDisasterByDate(d)) return false;
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterSeverity !== 'all' && d.severity !== filterSeverity) return false;
    if (filterCountry !== 'all' && (d.location?.country || '') !== filterCountry) return false;
    if (filterState !== 'all' && d.location?.state !== filterState) return false;
    if (filterCountries.length > 0 && !filterCountries.includes(d.location?.country || '')) return false;
    if (filterSource === 'database' && d.source !== 'database') return false;
    return true;
  });

  // Search within the filtered list (title, description, location, type)
  const listSearchLower = listSearchQuery.trim().toLowerCase();
  const listFilteredDisasters = listSearchLower
    ? filteredDisasters.filter(d => {
      const title = (d.title || '').toLowerCase();
      const desc = (d.description || '').toLowerCase();
      const country = (d.location?.country || '').toLowerCase();
      const state = (d.location?.state || '').toLowerCase();
      const type = (d.type || '').toLowerCase();
      const category = (d.category || '').toLowerCase();
      return (
        title.includes(listSearchLower) ||
        desc.includes(listSearchLower) ||
        country.includes(listSearchLower) ||
        state.includes(listSearchLower) ||
        type.includes(listSearchLower) ||
        category.includes(listSearchLower)
      );
    })
    : filteredDisasters;

  const currentYear = new Date().getFullYear();
  const stats = {
    total: allDisasters.length,
    volcanic: allDisasters.filter(d => d.type === 'volcanic').length,
    iceberg: allDisasters.filter(d => d.type === 'iceberg').length,
    wildfires: allDisasters.filter(d => d.type === 'wildfire').length,
    earthquakes: allDisasters.filter(d => d.type === 'earthquake').length,
    storms: allDisasters.filter(d => d.type === 'cyclone').length,
    flood: allDisasters.filter(d => d.type === 'flood').length,
    live: liveDisasters.length,
    database: databaseDisasters.filter((d: ManagedDisaster) => {
      const y = d.createdAt ? new Date(d.createdAt).getFullYear() : NaN;
      return !isNaN(y) && y === currentYear;
    }).length,
  };

  // Stable random numbers for Snow Storm and Power Outage (no real data source)
  const [snowStormCount] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [powerOutageCount] = useState(() => Math.floor(Math.random() * 15) + 1);

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

  const clearAllFilters = () => {
    setFilterType('all');
    setFilterSeverity('all');
    setFilterCountry('all');
    setFilterState('all');
    setFilterCountries([]);
    setFilterSource('all');
    setListSearchQuery('');
    const d = new Date();
    setFilterToDate(d.toISOString().slice(0, 10));
    const from = new Date();
    from.setFullYear(from.getFullYear() - 5);
    setFilterFromDate(from.toISOString().slice(0, 10));
    setSelectedDisaster(null);
  };

  const hasActiveFilters =
    filterType !== 'all' ||
    filterSeverity !== 'all' ||
    filterCountry !== 'all' ||
    filterState !== 'all' ||
    filterCountries.length > 0 ||
    filterSource !== 'all' ||
    listSearchQuery.trim() !== '';

  return (
    <DashboardLayout title="Live Disasters" subtitle="Real-time global disaster monitoring" icon={<GlobeAltIcon className="w-7 h-7" />}>
      {/* Quick Stats - clickable filter cards (order: Hurricane, Floods, Wildfires, Snow Storm, Power Outage, Earthquakes, Volcanic Eruptions) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <Card
          className={`p-3 border-l-4 border-l-blue-500 cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/30 ${filterType === 'cyclone' ? 'ring-2 ring-blue-500/40' : ''}`}
          onClick={() => { setFilterType(prev => prev === 'cyclone' ? 'all' : 'cyclone'); setFilterSeverity('all'); }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Hurricane</p>
            <CloudIcon className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400 leading-tight">{stats.storms}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Active</p>
        </Card>
        <Card
          className={`p-3 border-l-4 border-l-purple-500 cursor-pointer transition-all hover:ring-2 hover:ring-purple-500/30 ${filterType === 'flood' ? 'ring-2 ring-purple-500/40' : ''}`}
          onClick={() => { setFilterType(prev => prev === 'flood' ? 'all' : 'flood'); setFilterSeverity('all'); }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Floods</p>
            <span className="text-lg" aria-hidden>💧</span>
          </div>
          <p className="text-2xl font-bold text-purple-400 leading-tight">{stats.flood}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Active</p>
        </Card>
        <Card
          className={`p-3 border-l-4 border-l-amber-500 cursor-pointer transition-all hover:ring-2 hover:ring-amber-500/30 ${filterType === 'wildfire' ? 'ring-2 ring-amber-500/40' : ''}`}
          onClick={() => { setFilterType(prev => prev === 'wildfire' ? 'all' : 'wildfire'); setFilterSeverity('all'); }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Wildfires</p>
            <FireIcon className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 leading-tight">{stats.wildfires}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Active</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-gray-400 cursor-default">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Snow Storm</p>
            <span className="text-lg" aria-hidden>❄️</span>
          </div>
          <p className="text-2xl font-bold text-gray-400 leading-tight">{snowStormCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Active</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-gray-400 cursor-default">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Power Outage</p>
            <BoltIcon className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-400 leading-tight">{powerOutageCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Active</p>
        </Card>
        <Card
          className={`p-3 border-l-4 border-l-yellow-500 cursor-pointer transition-all hover:ring-2 hover:ring-yellow-500/30 ${filterType === 'earthquake' ? 'ring-2 ring-yellow-500/40' : ''}`}
          onClick={() => { setFilterType(prev => prev === 'earthquake' ? 'all' : 'earthquake'); setFilterSeverity('all'); }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Earthquakes</p>
            <BoltIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-400 leading-tight">{stats.earthquakes}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Active</p>
        </Card>
        <Card
          className={`p-3 border-l-4 border-l-red-600 cursor-pointer transition-all hover:ring-2 hover:ring-red-500/30 ${filterType === 'volcanic' ? 'ring-2 ring-red-500/40' : ''}`}
          onClick={() => { setFilterType(prev => prev === 'volcanic' ? 'all' : 'volcanic'); setFilterSeverity('all'); }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Volcanic Eruptions</p>
            <span className="text-lg" aria-hidden>🌋</span>
          </div>
          <p className="text-2xl font-bold text-red-400 leading-tight">{stats.volcanic}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Active</p>
        </Card>
      </div>
      {/* Top filter row: all filters in ONE line with search taking more space */}
      <div className="mb-6">
        <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-end gap-3 w-full">
            {/* Search Bar - Takes 2x width */}
            <div className="flex flex-col gap-1.5 flex-[2] min-w-0">
              {/* <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                Search
              </label> */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <Input
                  type="text"
                  placeholder="Search disasters..."
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  className="pl-12 pr-10 py-2.5 text-sm w-full bg-[var(--bg-card)] border-purple-500/30 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-lg shadow-sm transition-all duration-200"
                />
                {listSearchQuery && (
                  <button
                    onClick={() => setListSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-purple-500/10 rounded-md transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                )}
              </div>
            </div>

            {/* Type Filter - Takes 1x width */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {/* <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                Type
              </label> */}
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setSelectedDisaster(null); }}
                className="px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer w-full"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type} className="capitalize">{type}</option>
                ))}
              </select>
            </div>

            {/* Severity Filter - Takes 1x width */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {/* <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                Severity
              </label> */}
              <select
                value={filterSeverity}
                onChange={(e) => { setFilterSeverity(e.target.value); setSelectedDisaster(null); }}
                className="px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer w-full"
              >
                <option value="all">All Severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Country Filter - Takes 1x width */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {/* <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                Country
              </label> */}
              <select
                value={filterCountry}
                onChange={(e) => { setFilterCountry(e.target.value); setFilterState('all'); setSelectedDisaster(null); }}
                className="px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer w-full"
              >
                <option value="all">All Countries</option>
                {uniqueCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            {/* State Filter - Takes 1x width (only shows when country is selected) */}
            {filterCountry !== 'all' && availableStates.length > 0 && (
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {/* <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                  State
                </label> */}
                <select
                  value={filterState}
                  onChange={(e) => { setFilterState(e.target.value); setSelectedDisaster(null); }}
                  className="px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer w-full"
                >
                  <option value="all">All States</option>
                  {availableStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            )}

            {/* From Date - Takes 1x width */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {/* <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                From Date
              </label> */}
              <input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer w-full"
              />
            </div>

            {/* To Date - Takes 1x width */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {/* <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                To Date
              </label> */}
              <input
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer w-full"
              />
            </div>

            {/* Clear Filters Button - Fixed width */}
            {hasActiveFilters && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-transparent uppercase tracking-wide">
                  Clear
                </label>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2.5 text-sm font-medium text-purple-400 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Active Filters Display (Optional - below the main row) */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                  Active Filters:
                </span>
                {filterType !== 'all' && (
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                    Type: {filterType}
                  </span>
                )}
                {filterSeverity !== 'all' && (
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                    Severity: {filterSeverity}
                  </span>
                )}
                {filterCountry !== 'all' && (
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                    Country: {filterCountry}
                  </span>
                )}
                {filterState !== 'all' && (
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                    State: {filterState}
                  </span>
                )}
                {filterFromDate && (
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                    From: {filterFromDate}
                  </span>
                )}
                {filterToDate && (
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                    To: {filterToDate}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card padding="none" className="h-[600px] overflow-hidden">
            <div className="h-full">
              <LiveDisasterMap
                disasters={filteredDisasters.filter((d: any) => d.location?.coordinates).map((d: any) => ({
                  id: d.id,
                  title: d.title,
                  type: d.type,
                  severity: d.severity,
                  description: d.description,
                  date: d.date,
                  magnitude: d.magnitude,
                  magnitudeUnit: d.magnitudeUnit,
                  location: {
                    coordinates: d.location?.coordinates,
                    country: d.location?.country,
                    state: d.location?.state,
                  },
                  source: d.source === 'database' ? 'database' : 'live',
                }))}
                selectedId={selectedDisaster?.id}
                highlightedId={highlightedDisasterId}
                onSelectDisaster={(id) => {
                  const disaster = allDisasters.find(d => d.id === id) || filteredDisasters.find(d => d.id === id);
                  if (disaster) {
                    setSelectedDisaster(disaster);
                    setHighlightedDisasterId(id);
                    setTimeout(() => setHighlightedDisasterId(null), 2000);
                  }
                }}
                filterSeverity={filterSeverity}
                onSeverityClick={(severity) => setFilterSeverity(prev => prev === severity ? 'all' : severity)}
                activeFilterType={filterType !== 'all' ? filterType : undefined}
              />
            </div>
          </Card>
        </div>

        {/* Sidebar - Events List */}
        <div className="lg:col-span-1">
          <Card padding="none" className="h-[600px] flex flex-col">
            <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-input)] shrink-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--text-muted)]">
                  Showing <span className="font-semibold text-[var(--text-primary)]">{listFilteredDisasters.length}</span> of <span className="font-semibold text-[var(--text-primary)]">{allDisasters.length}</span> events
                </p>
                {selectedDisaster && (
                  <button
                    onClick={() => setSelectedDisaster(null)}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 shrink-0"
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
              ) : listFilteredDisasters.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <MagnifyingGlassIcon className="w-12 h-12 text-[var(--text-muted)] mb-3" />
                  <p className="text-[var(--text-muted)]">No disasters match your search</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)]">
                  {listFilteredDisasters.map((disaster, index) => {
                    const Icon = typeIcons[disaster.type] || typeIcons.default;
                    const colors = severityColors[disaster.severity] || severityColors.medium;
                    const disasterKey = disaster.id ?? disaster._id ?? `disaster-${index}`;
                    const isSelected = selectedDisaster && (selectedDisaster.id === disaster.id || selectedDisaster._id === disaster._id);

                    return (
                      <button
                        key={disasterKey}
                        id={`disaster-${disasterKey}`}
                        onClick={() => {
                          setSelectedDisaster(isSelected ? null : disaster);
                          setHighlightedDisasterId(disaster.id ?? disaster._id ?? null);
                          setTimeout(() => setHighlightedDisasterId(null), 2000);
                        }}
                        className={`w-full p-4 text-left hover:bg-[var(--bg-input)] transition-all duration-200 ${isSelected
                            ? 'bg-[var(--bg-input)] border-l-4 border-purple-500 shadow-lg'
                            : highlightedDisasterId === (disaster.id ?? disaster._id)
                              ? 'bg-purple-500/10 border-l-4 border-purple-400 animate-pulse'
                              : 'border-l-4 border-transparent'
                          }`}
                        onMouseEnter={() => setHighlightedDisasterId(disaster.id ?? disaster._id ?? null)}
                        onMouseLeave={() => {
                          if (highlightedDisasterId === (disaster.id ?? disaster._id) && !isSelected) {
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
              Showing {stats.live} live disasters and {stats.database} custom (worldwide)
            </p>
          </div>
          {canManage && (
            <Button
              onClick={async () => {
                try {
                  setSelectedManagedDisaster(null);
                  setFormData({
                    title: '', type: 'flood', description: '', severity: 'medium', status: 'active',
                    address: '', locationType: 'local', range: '', country: 'USA',
                    lat: '', lng: '', estimatedAffectedPeople: '',
                    selectedNasaDisasterId: '', useCustomDisaster: false,
                  });
                  // Open modal first, then fetch NASA disasters in background
                  setShowAddModal(true);
                  // Fetch NASA disasters when opening modal (non-blocking)
                  await fetchNasaDisasters();
                } catch (error) {
                  console.error('Error opening add disaster modal:', error);
                  // Still open the modal even if fetch fails
                  setShowAddModal(true);
                }
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
            rowKey={(d, i) => d.id ?? d._id ?? `db-disaster-${i}`}
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
                width: '22%',
                render: (disaster: ManagedDisaster) => {
                  const Icon = typeIcons[disaster.type] || typeIcons.default;
                  const colors = severityColors[disaster.severity] || severityColors.medium;
                  return (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[var(--text-primary)] truncate" title={disaster.title}>{disaster.title}</div>
                        <div className="text-xs text-[var(--text-muted)] truncate capitalize" title={disaster.type}>{disaster.type}</div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'location',
                label: 'Location',
                width: '18%',
                render: (disaster: ManagedDisaster) => {
                  const loc = [disaster.location?.address, disaster.location?.city, disaster.location?.state].filter(Boolean).join(', ') || 'Unknown';
                  return (
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPinIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                      <span className="text-sm truncate block min-w-0" title={loc}>{loc}</span>
                    </div>
                  );
                },
              },
              {
                key: 'severity',
                label: 'Severity',
                width: '10%',
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
                width: '10%',
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
                width: '25%',
                render: (disaster: ManagedDisaster) => {
                  const assignedCount = disaster.assignedVolunteers?.length || 0;
                  return (
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (assignedCount > 0) {
                            setSelectedDisasterForVolunteers(disaster);
                            setShowVolunteersModal(true);
                          }
                        }}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer flex-1 text-left min-w-0"
                        disabled={assignedCount === 0}
                      >
                        <UserGroupIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                        <span className="text-sm font-medium shrink-0">{assignedCount}</span>
                        {assignedCount > 0 && (
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {disaster.assignedVolunteers?.slice(0, 2).map((av, idx) => {
                                let volId = '';
                                if (typeof av === 'string') {
                                  volId = av;
                                } else if (typeof av === 'object' && av !== null) {
                                  const vId = av.volunteerId || av;
                                  if (typeof vId === 'string') volId = vId;
                                  else if (typeof vId === 'object') {
                                    volId = vId.id || vId._id || String(vId.id || vId._id || '');
                                  }
                                }
                                const fullVolunteer = volunteers.find(v => (v.id || v._id) === volId);
                                let volunteerName = 'Unknown';
                                if (fullVolunteer?.userId) {
                                  if (fullVolunteer.userId.firstName && fullVolunteer.userId.lastName) {
                                    volunteerName = `${fullVolunteer.userId.firstName} ${fullVolunteer.userId.lastName}`;
                                  } else if (fullVolunteer.userId.name) {
                                    volunteerName = fullVolunteer.userId.name;
                                  }
                                } else {
                                  volunteerName = getVolunteerName(av.volunteerId);
                                }
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1.5 px-1.5 py-0.5 bg-[var(--bg-input)] rounded-md border border-[var(--border-color)] shrink-0 max-w-[120px] min-w-0"
                                    title={volunteerName}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                      {volunteerName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs text-[var(--text-primary)] truncate block min-w-0">
                                      {volunteerName}
                                    </span>
                                  </div>
                                );
                              })}
                              {assignedCount > 2 && (
                                <span className="text-xs text-[var(--text-muted)] shrink-0">+{assignedCount - 2} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                },
              },
              {
                key: 'actions',
                label: 'Actions',
                width: '15%',
                render: (disaster: ManagedDisaster) => {
                  if (!canManage) return <span className="text-[var(--text-muted)] text-sm">—</span>;
                  const openEdit = () => {
                    const lat = Array.isArray(disaster.location?.coordinates) ? disaster.location.coordinates[1] : (disaster.location?.coordinates as any)?.lat;
                    const lng = Array.isArray(disaster.location?.coordinates) ? disaster.location.coordinates[0] : (disaster.location?.coordinates as any)?.lng;
                    setSelectedManagedDisaster(disaster);
                    setFormData({
                      title: disaster.title,
                      type: disaster.type,
                      description: disaster.description,
                      severity: disaster.severity,
                      status: disaster.status,
                      address: disaster.location?.address || '',
                      locationType: 'local',
                      range: '',
                      country: disaster.location?.country || 'USA',
                      lat: lat?.toString() || '',
                      lng: lng?.toString() || '',
                      estimatedAffectedPeople: disaster.estimatedAffectedPeople?.toString() || '',
                      selectedNasaDisasterId: '',
                      useCustomDisaster: true,
                    });
                    setShowAddModal(true);
                    fetchNasaDisasters().catch(err => console.error('Error fetching NASA disasters:', err));
                  };
                  return (
                    <div className="flex items-center justify-center gap-1">
                      {disaster.source !== 'live' ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedDisasterForAssign(disaster); setShowAssignVolunteerModal(true); }}
                            className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors"
                            title="Assign Volunteer"
                          >
                            <UserPlusIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openEdit(); }}
                            className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteDisaster(disaster.id || disaster._id); }}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] italic px-2">Managed Externally</span>
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
          {/* Combined Disaster Selection - Single Field */}
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Select Disaster <span className="text-red-400">*</span>
              </label>
              {isLoadingNasaDisasters ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="relative disaster-search-container">
                  <div className="relative">
                    <Input
                      value={formData.selectedNasaDisasterId
                        ? nasaDisasters.find(d => d.id === formData.selectedNasaDisasterId)?.title || formData.title || disasterSearchQuery
                        : formData.title || disasterSearchQuery
                      }
                      onChange={(e) => {
                        const query = e.target.value;
                        setDisasterSearchQuery(query);
                        setShowDisasterDropdown(true);
                        // If user is typing, set as custom disaster title
                        setFormData({
                          ...formData,
                          title: query,
                          selectedNasaDisasterId: '',
                          useCustomDisaster: true
                        });
                      }}
                      onFocus={() => setShowDisasterDropdown(true)}
                      onBlur={() => {
                        // Delay closing to allow click on dropdown item
                        setTimeout(() => setShowDisasterDropdown(false), 200);
                      }}
                      placeholder="Search disaster by name or location, or type custom disaster name..."
                      icon={
                        disasterSearchQuery && !formData.selectedNasaDisasterId ? (
                          <PlusIcon className="w-5 h-5 text-purple-500" />
                        ) : (
                          <MagnifyingGlassIcon className="w-5 h-5" />
                        )
                      }
                      iconPosition="right"
                    />
                    {formData.selectedNasaDisasterId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, selectedNasaDisasterId: '', useCustomDisaster: true, title: '' });
                          setDisasterSearchQuery('');
                        }}
                        className="absolute right-14 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[var(--bg-input)] transition-colors z-20"
                      >
                        <XMarkIcon className="w-4 h-4 text-[var(--text-muted)]" />
                      </button>
                    )}
                    {disasterSearchQuery && !formData.selectedNasaDisasterId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Use the typed value as custom disaster
                          setFormData({
                            ...formData,
                            title: disasterSearchQuery,
                            useCustomDisaster: true,
                            selectedNasaDisasterId: ''
                          });
                          setDisasterSearchQuery('');
                          setShowDisasterDropdown(false);
                        }}
                        className="absolute right-14 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[var(--bg-input)] transition-colors z-20"
                        title="Add custom disaster"
                      >
                        <PlusIcon className="w-5 h-5 text-purple-500" />
                      </button>
                    )}
                  </div>

                  {/* Searchable Dropdown */}
                  {showDisasterDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                      {(() => {
                        // Filter disasters by search query (name and location)
                        const filteredDisasters = nasaDisasters.filter(disaster => {
                          if (!disasterSearchQuery) return true;
                          const query = disasterSearchQuery.toLowerCase();
                          const titleMatch = disaster.title?.toLowerCase().includes(query);
                          const locationMatch =
                            disaster.location?.state?.toLowerCase().includes(query) ||
                            disaster.location?.country?.toLowerCase().includes(query) ||
                            disaster.location?.region?.toLowerCase().includes(query);
                          const typeMatch = disaster.type?.toLowerCase().includes(query);
                          return titleMatch || locationMatch || typeMatch;
                        });

                        // Check if query doesn't match any disaster
                        const hasNoMatches = disasterSearchQuery && filteredDisasters.length === 0;
                        const queryMatchesSelected = filteredDisasters.some(d =>
                          d.title?.toLowerCase() === disasterSearchQuery.toLowerCase()
                        );

                        return (
                          <>
                            {filteredDisasters.length > 0 && (
                              <>
                                {filteredDisasters.map((disaster) => {
                                  const isSelected = formData.selectedNasaDisasterId === disaster.id;
                                  const coords = disaster.location?.coordinates;
                                  const locationStr = [
                                    disaster.location?.region,
                                    disaster.location?.state,
                                    disaster.location?.country
                                  ].filter(Boolean).join(', ') || 'Unknown Location';

                                  return (
                                    <button
                                      key={disaster.id}
                                      type="button"
                                      onClick={() => {
                                        // Build address from location data
                                        let addressParts = [];
                                        if (disaster.location?.state) {
                                          addressParts.push(disaster.location.state);
                                        }
                                        if (disaster.location?.country) {
                                          addressParts.push(disaster.location.country);
                                        } else {
                                          addressParts.push('USA');
                                        }
                                        const address = addressParts.join(', ') || 'USA';

                                        setFormData({
                                          ...formData,
                                          selectedNasaDisasterId: disaster.id,
                                          useCustomDisaster: false,
                                          title: disaster.title,
                                          description: disaster.description || '',
                                          type: disaster.type,
                                          severity: disaster.severity,
                                          lat: coords?.lat?.toString() || '',
                                          lng: coords?.lng?.toString() || '',
                                          address: address,
                                        });
                                        setDisasterSearchQuery('');
                                        setShowDisasterDropdown(false);
                                      }}
                                      className={`w-full px-4 py-3 text-left hover:bg-[var(--bg-input)] transition-colors border-b border-[var(--border-color)] last:border-b-0 ${isSelected ? 'bg-purple-500/10 border-l-4 border-purple-500' : ''
                                        }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-[var(--text-primary)] mb-1">
                                            {disaster.title}
                                          </p>
                                          <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--text-muted)]">
                                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 capitalize">
                                              {disaster.type}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 capitalize">
                                              {disaster.severity}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <MapPinIcon className="w-3 h-3" />
                                              {locationStr}
                                            </span>
                                          </div>
                                        </div>
                                        {isSelected && (
                                          <CheckCircleIcon className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </>
                            )}

                            {/* Show "Add Custom Disaster" option when no matches found */}
                            {hasNoMatches && !queryMatchesSelected && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    title: disasterSearchQuery,
                                    useCustomDisaster: true,
                                    selectedNasaDisasterId: ''
                                  });
                                  setDisasterSearchQuery('');
                                  setShowDisasterDropdown(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-[var(--bg-input)] transition-colors border-t border-[var(--border-color)] flex items-center gap-3 text-purple-500"
                              >
                                <PlusIcon className="w-5 h-5" />
                                <div>
                                  <p className="font-medium">Add Custom Disaster</p>
                                  <p className="text-xs text-[var(--text-muted)]">
                                    "{disasterSearchQuery}" will be added as a custom disaster
                                  </p>
                                </div>
                              </button>
                            )}

                            {!hasNoMatches && filteredDisasters.length === 0 && !disasterSearchQuery && (
                              <div className="p-4 text-center text-sm text-[var(--text-muted)]">
                                Start typing to search disasters from NASA EONET API
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Search by disaster name or location. If not found, click the + icon to add as custom disaster.
              </p>
            </div>

            {/* Auto-filled fields when NASA disaster is selected */}
            {formData.selectedNasaDisasterId && !formData.useCustomDisaster && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-2">
                <p className="text-xs font-medium text-purple-400">Auto-filled from NASA EONET:</p>
                <div className="text-xs text-[var(--text-muted)] space-y-1">
                  <p><span className="font-medium">Title:</span> {formData.title}</p>
                  <p><span className="font-medium">Type:</span> {formData.type}</p>
                  <p><span className="font-medium">Severity:</span> {formData.severity}</p>
                  <p><span className="font-medium">Coordinates:</span> {formData.lat}, {formData.lng}</p>
                </div>
              </div>
            )}
          </div>

          {/* Type and Severity - Always visible */}
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

          {/* Description */}
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
          {/* Affected People - Removed Affected Area */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Affected People</label>
            <Input
              type="number"
              value={formData.estimatedAffectedPeople}
              onChange={(e) => setFormData({ ...formData, estimatedAffectedPeople: e.target.value })}
              placeholder="0"
            />
          </div>

          {/* Location Type: Local or Widespread */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Location Type <span className="text-red-400">*</span>
            </label>
            <Select
              value={formData.locationType}
              onChange={(value) => setFormData({ ...formData, locationType: value as 'local' | 'widespread' })}
              options={[
                { value: 'local', label: 'Local' },
                { value: 'widespread', label: 'Widespread' },
              ]}
            />
          </div>

          {/* Address Field - Always visible */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Address <span className="text-red-400">*</span>
            </label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={formData.locationType === 'widespread' ? 'Enter Address' : 'Enter address'}
              required
              id="disaster-address-input"
            />
            {/* {formData.locationType === 'widespread' && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Start typing to search for an address. Google autocomplete will be enabled if API key is configured.
              </p>
            )} */}
          </div>

          {/* Range of Disaster */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Range of Disaster <span className="text-red-400">*</span>
            </label>
            <Select
              value={formData.range}
              onChange={(value) => setFormData({ ...formData, range: value })}
              options={[
                { value: '<1', label: 'Less than 1 mile' },
                { value: '1-5', label: '1 - 5 miles' },
                { value: '5-10', label: '5 - 10 miles' },
                { value: '10-15', label: '10 - 15 miles' },
                { value: '15-20', label: '15 - 20 miles' },
                { value: '20-25', label: '20 - 25 miles' },
                { value: '25-30', label: '25 - 30 miles' },
                { value: '30-35', label: '30 - 35 miles' },
                { value: '35-40', label: '35 - 40 miles' },
                { value: '40-45', label: '40 - 45 miles' },
                { value: '45-50', label: '45 - 50 miles' },
                { value: '50+', label: 'More than 50 miles' },
              ]}
              required
            />
          </div>

          {/* Coordinates */}
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



          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setSelectedManagedDisaster(null);
                setFormData({
                  title: '', type: 'flood', description: '', severity: 'medium', status: 'active',
                  address: '', locationType: 'local', range: '', country: 'USA',
                  lat: '', lng: '', estimatedAffectedPeople: '',
                  selectedNasaDisasterId: '', useCustomDisaster: false,
                });
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
                  const volunteer = av.volunteerId || av;
                  let volId = '';
                  if (typeof volunteer === 'object' && (volunteer?.id || volunteer?._id)) {
                    volId = typeof (volunteer.id || volunteer._id) === 'string'
                      ? (volunteer.id || volunteer._id)
                      : String(volunteer.id || volunteer._id);
                  } else if (typeof volunteer === 'string') {
                    volId = volunteer;
                  }

                  // Find full volunteer data from fetched volunteers list
                  const fullVolunteer = volunteers.find(v => (v.id || v._id) === volId);

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
                                    handleRemoveVolunteerFromDisaster(selectedDisasterForVolunteers.id || selectedDisasterForVolunteers._id, volId);
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
                            const volId = typeof (volunteer?.id || volunteer?._id) === 'string'
                              ? (volunteer.id || volunteer._id)
                              : (volunteer as any)?.id?.toString() || (volunteer as any)?._id?.toString() || '';
                            const isExpanded = expandedVolunteers.has(volId);
                            const fullVolunteer = volunteers.find(v => (v.id || v._id) === volId);

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
          setSelectedVolunteerIds([]);
          setAssignmentFromDate('');
          setAssignmentToDate('');
        }}
        title={`Assign Volunteers - ${selectedDisasterForAssign?.title || 'Disaster'}`}
        size="lg"
        className="z-[10001]"
      >
        {selectedDisasterForAssign && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (selectedVolunteerIds.length === 0) {
                toast.error('Please select at least one volunteer');
                return;
              }
              if (!assignmentFromDate || !assignmentToDate) {
                toast.error('Please select both from and to dates');
                return;
              }
              if (new Date(assignmentFromDate) > new Date(assignmentToDate)) {
                toast.error('From date must be before to date');
                return;
              }

              try {
                // Assign all selected volunteers
                const assignPromises = selectedVolunteerIds.map(volunteerId =>
                  fetch(`/api/disasters/${selectedDisasterForAssign.id || selectedDisasterForAssign._id}/assign-volunteer`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      volunteerId,
                      fromDate: assignmentFromDate,
                      toDate: assignmentToDate
                    })
                  })
                );

                const responses = await Promise.all(assignPromises);
                const results = await Promise.all(responses.map(r => r.json()));

                const successCount = results.filter(r => r.success).length;
                const failCount = results.length - successCount;

                if (successCount > 0) {
                  toast.success(`${successCount} volunteer(s) assigned successfully!`);
                  if (failCount > 0) {
                    toast.warning(`${failCount} volunteer(s) failed to assign`);
                  }
                  await fetchDatabaseDisasters();
                  await fetchVolunteers();
                  setShowAssignVolunteerModal(false);
                  setSelectedDisasterForAssign(null);
                  setSelectedVolunteerIds([]);
                  setAssignmentFromDate('');
                  setAssignmentToDate('');
                } else {
                  toast.error('Failed to assign volunteers');
                }
              } catch (error) {
                console.error('Error assigning volunteers:', error);
                toast.error('Failed to assign volunteers');
              }
            }}
            className="space-y-4"
          >
            {/* Date Range Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  From Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={assignmentFromDate}
                  onChange={(e) => setAssignmentFromDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  To Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={assignmentToDate}
                  onChange={(e) => setAssignmentToDate(e.target.value)}
                  min={assignmentFromDate || new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>

            {/* Volunteers List with Checkboxes */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                Select Volunteers <span className="text-red-400">*</span>
              </label>
              <div className="max-h-[400px] overflow-y-auto border border-[var(--border-color)] rounded-lg p-4 space-y-3">
                {isLoadingVolunteers ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-sm text-[var(--text-muted)]">Loading volunteers...</p>
                  </div>
                ) : volunteers.filter(v => {
                  // Filter out already assigned volunteers
                  const assignedVolunteerIds = selectedDisasterForAssign.assignedVolunteers?.map(
                    (av: any) => {
                      const volId = av.volunteerId;
                      return typeof volId === 'string' ? volId : (volId as any)?.id?.toString() || (volId as any)?._id?.toString() || '';
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

                  return !assignedVolunteerIds.includes(v.id || v._id) && !isOnMission;
                }).length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">
                    All available volunteers are already assigned to this disaster or are currently on mission.
                  </p>
                ) : (
                  volunteers
                    .filter(v => {
                      const assignedVolunteerIds = selectedDisasterForAssign.assignedVolunteers?.map(
                        (av: any) => {
                          const volId = av.volunteerId;
                          return typeof volId === 'string' ? volId : (volId as any)?.id?.toString() || (volId as any)?._id?.toString() || '';
                        }
                      ) || [];

                      const now = new Date();
                      const hasActiveAssignments = v.assignedDisasters?.some(
                        (ad: any) => {
                          const toDate = new Date(ad.toDate);
                          const status = ad.status;
                          return toDate > now && (status === 'assigned' || status === 'active');
                        }
                      );
                      const isOnMission = v.availability === 'on_mission' || hasActiveAssignments;

                      return !assignedVolunteerIds.includes(v.id || v._id) && !isOnMission;
                    })
                    .map((volunteer) => {
                      const name = volunteer.userId?.firstName && volunteer.userId?.lastName
                        ? `${volunteer.userId.firstName} ${volunteer.userId.lastName}`
                        : volunteer.userId?.name || volunteer.volunteerId || 'Unknown';
                      const isChecked = selectedVolunteerIds.includes(volunteer.id || volunteer._id);

                      return (
                        <label
                          key={volunteer.id || volunteer._id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked
                              ? 'bg-purple-500/10 border-purple-500/50'
                              : 'bg-[var(--bg-input)] border-[var(--border-color)] hover:border-purple-500/30'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVolunteerIds([...selectedVolunteerIds, volunteer.id || volunteer._id]);
                              } else {
                                setSelectedVolunteerIds(selectedVolunteerIds.filter(id => id !== (volunteer.id || volunteer._id)));
                              }
                            }}
                            className="mt-1 w-4 h-4 text-purple-600 bg-[var(--bg-primary)] border-[var(--border-color)] rounded focus:ring-purple-500 focus:ring-2"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-[var(--text-primary)]">{name}</span>
                              <Badge variant="secondary" size="sm">
                                {volunteer.volunteerId}
                              </Badge>
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              <span>Availability: {volunteer.availability || 'N/A'}</span>
                              {volunteer.userId?.email && (
                                <span className="ml-2">• {volunteer.userId.email}</span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })
                )}
              </div>
              {selectedVolunteerIds.length > 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {selectedVolunteerIds.length} volunteer(s) selected
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowAssignVolunteerModal(false);
                  setSelectedDisasterForAssign(null);
                  setSelectedVolunteerIds([]);
                  setAssignmentFromDate('');
                  setAssignmentToDate('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                className="flex-1"
                disabled={selectedVolunteerIds.length === 0 || !assignmentFromDate || !assignmentToDate}
              >
                Assign {selectedVolunteerIds.length > 0 ? `${selectedVolunteerIds.length} ` : ''}Volunteer{selectedVolunteerIds.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
}

