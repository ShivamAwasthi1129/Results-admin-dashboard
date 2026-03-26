'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Input, Select, Modal } from '@/components/ui';
import { toast } from 'react-toastify';
import {
  MapPinIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useTrackingWebSocket } from '@/hooks/useTrackingWebSocket';

// Dynamic import for map to avoid SSR issues
const DynamicTrackingMap = dynamic(() => import('@/components/tracking/TrackingMap'), {
  ssr: false,
  loading: () => <div className="h-[600px] flex items-center justify-center bg-[var(--bg-input)] rounded-lg"><div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
});

/** Single point from tracking history API */
interface HistoryPoint {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

interface Location {
  id: string;
  userId: string;
  userName?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lastUpdatedAt: string;
  isActive: boolean;
}


interface TrackingClientProps {
  token: string | null;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth-token');
}

export default function TrackingClient({ token: tokenProp }: TrackingClientProps) {
  const { user, token: authToken } = useAuth();
  const token = authToken ?? (typeof window !== 'undefined' ? getAuthToken() : null) ?? tokenProp;
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationHistory, setLocationHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPagination, setHistoryPagination] = useState<{ page: number; limit: number; total: number; pages: number } | null>(null);

  // Fetch all locations (always send auth token from localStorage/context in header)
  const fetchLocations = async () => {
    const t = token ?? getAuthToken();
    if (!t) {
      toast.error('Please log in to view tracking data');
      setIsInitialLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DOMAIN_NAME}/api/tracking/location/all`,
        {
          headers: {
            Authorization: `Bearer ${t}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch locations' }));
        console.error('Failed to fetch locations:', response.status, errorData);
        setLocations([]);
        if (response.status !== 503) {
          toast.error(errorData.error || `Failed to fetch locations: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      // R3sults backend returns data.locations[] with { userId, latitude, longitude, accuracy, user: { id, fullName, phoneNumber, email, status, profilePictureUrl, isActive } }
      if (data.success && data.data && Array.isArray(data.data.locations)) {
        const locationsList = data.data.locations;
        const transformedLocations: Location[] = locationsList
          .filter((loc: { latitude?: number; longitude?: number }) => loc.latitude != null && loc.longitude != null)
          .map((loc: {
            userId: string;
            latitude: number;
            longitude: number;
            accuracy?: number;
            user?: { id?: string; fullName?: string | null; phoneNumber?: string | null; email?: string | null; isActive?: boolean };
          }) => ({
            id: loc.user?.id ?? loc.userId,
            userId: loc.userId,
            userName: loc.user?.fullName ?? loc.user?.phoneNumber ?? loc.user?.email ?? 'Unknown User',
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            lastUpdatedAt: new Date().toISOString(),
            isActive: loc.user?.isActive ?? true,
          }));
        setLocations(transformedLocations);
      } else {
        setLocations([]);
        if (data.error) {
          toast.error(data.error);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
      // Don't show toast for connection errors - service might be unavailable
      if (error instanceof Error && !error.message.includes('ECONNREFUSED')) {
        toast.error('Failed to fetch locations');
      }
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  };

  // Initial data fetch (use token from context or localStorage)
  useEffect(() => {
    const t = token ?? getAuthToken();
    if (t) {
      fetchLocations();
    } else {
      setIsInitialLoading(false);
    }
  }, [token]);

  // WebSocket for real-time updates
  const { isConnected } = useTrackingWebSocket({
    onLocationUpdate: (update) => {
      // Update location in real-time
      setLocations((prev) => {
        const existing = prev.findIndex(l => l.userId === update.userId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = {
            ...updated[existing],
            latitude: update.latitude,
            longitude: update.longitude,
            accuracy: update.accuracy,
            lastUpdatedAt: update.timestamp,
          };
          return updated;
        } else {
          return [...prev, {
            id: `temp-${update.userId}`,
            userId: update.userId,
            userName: update.userName,
            latitude: update.latitude,
            longitude: update.longitude,
            accuracy: update.accuracy,
            lastUpdatedAt: update.timestamp,
            isActive: true,
          }];
        }
      });
    },
    enabled: true,
  });

  const handleRefresh = () => {
    fetchLocations();
  };

  const handleViewLocation = (location: Location) => {
    setSelectedLocation(location);
    setLocationHistory([]);
    setHistoryError(null);
    setHistoryPagination(null);
    setIsLocationModalOpen(true);
  };

  // Fetch location history when modal opens for the selected user
  const fetchLocationHistory = async (userId: string) => {
    const t = token ?? getAuthToken();
    if (!t) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/tracking/location/history/${userId}?limit=500`, {
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        setLocationHistory([]);
        setHistoryPagination(null);
        setHistoryError(data.error || data.message || `Failed to load history: ${response.status}`);
        return;
      }
      if (data.success && data.data?.history && Array.isArray(data.data.history)) {
        setLocationHistory(data.data.history);
        setHistoryPagination(data.data.pagination ?? null);
      } else {
        setLocationHistory([]);
        setHistoryPagination(null);
      }
    } catch (err) {
      console.error('Fetch location history error:', err);
      setLocationHistory([]);
      setHistoryPagination(null);
      setHistoryError('Failed to load tracking history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isLocationModalOpen && selectedLocation?.userId) {
      fetchLocationHistory(selectedLocation.userId);
    }
  }, [isLocationModalOpen, selectedLocation?.userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Ensure locations is always an array
  const safeLocations = Array.isArray(locations) ? locations : [];
  const uniqueUsers = Array.from(new Set(safeLocations.map(l => l.userId)));

  const filteredLocations = safeLocations.filter(loc => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        loc.userName?.toLowerCase().includes(query) ||
        loc.address?.toLowerCase().includes(query) ||
        loc.city?.toLowerCase().includes(query) ||
        loc.userId.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <DashboardLayout title="Live Tracking" subtitle="Real-time location tracking and monitoring" icon={<MapPinIcon className="w-7 h-7" />}>
      {/* One row: Dashboard-style cards + Search + Refresh + Status */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Card className="p-3 border-l-4 border-l-blue-500 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Active Locations</p>
            <MapPinIcon className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{safeLocations.filter(l => l.isActive).length}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-green-500 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Tracked Users</p>
            <UsersIcon className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{uniqueUsers.length}</p>
        </Card>
        <div className="flex-1 min-w-[240px]">
          <Input
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            placeholder="Search by user, address, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          onClick={handleRefresh}
          leftIcon={<ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          disabled={isLoading}
          className="flex-shrink-0"
        >
          Refresh
        </Button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500'}`} />
          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
            {isConnected ? 'Live' : 'Polling'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden h-[600px]">
              <DynamicTrackingMap
                locations={Array.isArray(filteredLocations) ? filteredLocations : []}
                geofences={[]}
                onLocationClick={handleViewLocation}
                height="600px"
                selectedLocationId={selectedLocation?.id || selectedLocation?.userId}
              />
            </Card>
          </div>

          {/* Sidebar - Users List */}
          <div className="lg:col-span-1">
            <Card padding="none" className="h-[600px] flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-input)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" />
                    Tracked Users
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Showing <span className="font-semibold text-[var(--text-primary)]">{filteredLocations.length}</span> of <span className="font-semibold text-[var(--text-primary)]">{safeLocations.length}</span> users
                </p>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading || isInitialLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                ) : filteredLocations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <UsersIcon className="w-12 h-12 text-[var(--text-muted)] mb-3" />
                    <p className="text-[var(--text-muted)]">No users matching filters</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-color)]">
                    {filteredLocations.map((location) => {
                      const isSelected = selectedLocation?.id === location.id;

                      return (
                        <div
                          key={location.id}
                          className={`p-4 hover:bg-[var(--bg-input)] transition-all duration-200 ${
                            isSelected 
                              ? 'bg-[var(--bg-input)] border-l-4 border-purple-500' 
                              : 'border-l-4 border-transparent'
                          }`}
                          onMouseEnter={() => {
                            // Highlight on map on hover
                          }}
                        >
                          <div className="flex gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              location.isActive ? 'bg-green-500/20' : 'bg-gray-500/20'
                            }`}>
                              <span className={`text-lg font-bold ${
                                location.isActive ? 'text-green-400' : 'text-gray-400'
                              }`}>
                                {location.userName?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-medium text-[var(--text-primary)] text-sm line-clamp-1">
                                  {location.userName || 'Unknown User'}
                                </h4>
                                <Badge
                                  variant={location.isActive ? 'success' : 'secondary'}
                                  size="sm"
                                >
                                  {location.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-1 mb-2">
                                {location.address || location.city || location.state || location.country || 'No address'}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-3">
                                <span className="flex items-center gap-1">
                                  <MapPinIcon className="w-3 h-3" />
                                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                </span>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleViewLocation(location)}
                                leftIcon={<EyeIcon className="w-4 h-4" />}
                                className="w-full"
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

      {/* Location Detail Modal */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => {
          setIsLocationModalOpen(false);
          setSelectedLocation(null);
          setLocationHistory([]);
          setHistoryError(null);
          setHistoryPagination(null);
        }}
        title="User Location Details"
        size="xl"
      >
        {selectedLocation && (
          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-color)]">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white ${
                selectedLocation.isActive ? 'bg-green-500' : 'bg-gray-500'
              }`}>
                {selectedLocation.userName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                  {selectedLocation.userName || 'Unknown User'}
                </h3>
                <p className="text-sm text-[var(--text-muted)] font-mono mb-2">{selectedLocation.userId}</p>
                <Badge variant={selectedLocation.isActive ? 'success' : 'secondary'} size="sm">
                  {selectedLocation.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Tracking history map */}
            <div>
              <p className="text-sm font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                Tracking history
                {historyPagination && (
                  <span className="ml-2 font-normal normal-case text-[var(--text-primary)]">
                    ({historyPagination.total} points)
                  </span>
                )}
              </p>
              <div className="h-[320px] rounded-lg overflow-hidden border border-[var(--border-color)]">
                {historyLoading ? (
                  <div className="h-full flex items-center justify-center bg-[var(--bg-input)]">
                    <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                ) : historyError ? (
                  <div className="h-full flex flex-col items-center justify-center bg-[var(--bg-input)] p-4 text-center">
                    <p className="text-[var(--text-muted)] mb-2">{historyError}</p>
                    <Button variant="secondary" size="sm" onClick={() => selectedLocation && fetchLocationHistory(selectedLocation.userId)}>
                      Retry
                    </Button>
                  </div>
                ) : locationHistory.length > 0 ? (
                  <DynamicTrackingMap
                    locations={[]}
                    geofences={[]}
                    pathPoints={locationHistory.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))}
                    height="320px"
                  />
                ) : (
                  <DynamicTrackingMap
                    locations={[selectedLocation]}
                    geofences={[]}
                    height="320px"
                  />
                )}
              </div>
            </div>

            {/* Location Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address Section */}
              <div>
                <p className="text-sm font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Address</p>
                <div className="bg-[var(--bg-input)] p-4 rounded-lg">
                  <p className="text-[var(--text-primary)]">
                    {selectedLocation.address || 'N/A'}
                    {selectedLocation.city && (selectedLocation.address ? `, ${selectedLocation.city}` : selectedLocation.city)}
                    {selectedLocation.state && (selectedLocation.city || selectedLocation.address ? `, ${selectedLocation.state}` : selectedLocation.state)}
                    {selectedLocation.country && (selectedLocation.state || selectedLocation.city || selectedLocation.address ? `, ${selectedLocation.country}` : selectedLocation.country)}
                  </p>
                  {selectedLocation.city && (
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      <span className="font-medium">City:</span> {selectedLocation.city}
                    </div>
                  )}
                  {selectedLocation.state && (
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      <span className="font-medium">State:</span> {selectedLocation.state}
                    </div>
                  )}
                  {selectedLocation.country && (
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      <span className="font-medium">Country:</span> {selectedLocation.country}
                    </div>
                  )}
                </div>
              </div>

              {/* Coordinates Section */}
              <div>
                <p className="text-sm font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Coordinates</p>
                <div className="bg-[var(--bg-input)] p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Latitude</p>
                      <p className="text-[var(--text-primary)] font-mono font-semibold">{selectedLocation.latitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Longitude</p>
                      <p className="text-[var(--text-primary)] font-mono font-semibold">{selectedLocation.longitude.toFixed(6)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Details Grid */}
            {(selectedLocation.accuracy || selectedLocation.speed || selectedLocation.heading || selectedLocation.altitude) && (
              <div>
                <p className="text-sm font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wide">Location Details</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedLocation.accuracy !== undefined && selectedLocation.accuracy !== null && (
                    <div className="bg-[var(--bg-input)] p-4 rounded-lg">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Accuracy</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{selectedLocation.accuracy.toFixed(0)}m</p>
                    </div>
                  )}
                  {selectedLocation.speed !== undefined && selectedLocation.speed !== null && (
                    <div className="bg-[var(--bg-input)] p-4 rounded-lg">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Speed</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{(selectedLocation.speed * 3.6).toFixed(1)} km/h</p>
                    </div>
                  )}
                  {selectedLocation.heading !== undefined && selectedLocation.heading !== null && (
                    <div className="bg-[var(--bg-input)] p-4 rounded-lg">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Heading</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{selectedLocation.heading.toFixed(0)}°</p>
                    </div>
                  )}
                  {selectedLocation.altitude !== undefined && selectedLocation.altitude !== null && (
                    <div className="bg-[var(--bg-input)] p-4 rounded-lg">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Altitude</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{selectedLocation.altitude.toFixed(1)}m</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="pt-4 border-t border-[var(--border-color)]">
              <p className="text-sm font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Last Updated</p>
              <div className="bg-[var(--bg-input)] p-4 rounded-lg">
                <p className="text-[var(--text-primary)] font-medium">{formatDate(selectedLocation.lastUpdatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
