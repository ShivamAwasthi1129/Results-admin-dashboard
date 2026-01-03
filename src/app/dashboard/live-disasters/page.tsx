'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button } from '@/components/ui';
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
} from '@heroicons/react/24/outline';
import { USA_STATES } from '@/lib/geocoding';

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

export default function LiveDisastersPage() {
  const [disasters, setDisasters] = useState<LiveDisaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedDisaster, setSelectedDisaster] = useState<LiveDisaster | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterState, setFilterState] = useState('all');
  const [highlightedDisasterId, setHighlightedDisasterId] = useState<string | null>(null);

  const fetchLiveDisasters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/live-disasters');
      const data = await response.json();
      if (data.success) {
        setDisasters(data.data.disasters);
        setLastUpdated(new Date(data.data.metadata.lastUpdated));
      }
    } catch (error) {
      console.error('Failed to fetch live disasters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveDisasters();
    // Refresh every 5 minutes
    const interval = setInterval(fetchLiveDisasters, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredDisasters = disasters.filter(d => {
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterSeverity !== 'all' && d.severity !== filterSeverity) return false;
    if (filterCountry !== 'all' && d.location?.country !== filterCountry) return false;
    if (filterState !== 'all' && d.location?.state !== filterState) return false;
    return true;
  });

  const stats = {
    total: disasters.length,
    critical: disasters.filter(d => d.severity === 'critical').length,
    high: disasters.filter(d => d.severity === 'high').length,
    wildfires: disasters.filter(d => d.type === 'wildfire').length,
    storms: disasters.filter(d => d.type === 'cyclone').length,
  };

  const uniqueTypes = Array.from(new Set(disasters.map(d => d.type))).sort();
  const uniqueCountries = Array.from(new Set(disasters.map(d => d.location?.country).filter(Boolean))).sort();
  const uniqueStates = Array.from(new Set(
    disasters
      .filter(d => d.location?.country === 'United States' && d.location?.state)
      .map(d => d.location?.state)
      .filter(Boolean)
  )).sort();
  
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
      {/* Live Status Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-emerald-400">Live Feed Active</span>
          </div>
          {lastUpdated && (
            <span className="text-sm text-[var(--text-muted)] flex items-center gap-2">
              <ClockIcon className="w-4 h-4" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={fetchLiveDisasters}
          leftIcon={<ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

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
                disasters={filteredDisasters}
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
                {(filterType !== 'all' || filterSeverity !== 'all' || filterCountry !== 'all' || filterState !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setFilterSeverity('all');
                      setFilterCountry('all');
                      setFilterState('all');
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <XMarkIcon className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
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
                <select
                  value={filterCountry}
                  onChange={(e) => {
                    setFilterCountry(e.target.value);
                    setFilterState('all'); // Reset state when country changes
                    setSelectedDisaster(null);
                  }}
                  className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 transition-colors flex-1 min-w-[140px]"
                >
                  <option value="all">All Countries</option>
                  {uniqueCountries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {filterCountry === 'United States' && (
                  <select
                    value={filterState}
                    onChange={(e) => {
                      setFilterState(e.target.value);
                      setSelectedDisaster(null);
                    }}
                    className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:border-purple-500/50 transition-colors flex-1 min-w-[140px]"
                  >
                    <option value="all">All States</option>
                    {USA_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-muted)]">
                  Showing <span className="font-semibold text-[var(--text-primary)]">{filteredDisasters.length}</span> of <span className="font-semibold text-[var(--text-primary)]">{disasters.length}</span> events
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
                              {disaster.category}
                              {disaster.location?.country && ` • ${disaster.location.country}`}
                              {disaster.location?.state && ` • ${disaster.location.state}`}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {new Date(disaster.date).toLocaleDateString()}
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
    </DashboardLayout>
  );
}

