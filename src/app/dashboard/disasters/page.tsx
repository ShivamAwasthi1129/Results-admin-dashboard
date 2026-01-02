'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, StatCard, Button, Input, Badge, Modal, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';
import {
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  MapIcon,
  ListBulletIcon,
  UsersIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const DisasterMap = dynamic(() => import('@/components/dashboard/DisasterMap'), { ssr: false });

interface Disaster {
  _id: string;
  title: string;
  type: string;
  description: string;
  severity: string;
  status: string;
  location: { address?: string; city?: string; state?: string; coordinates?: { lat: number; lng: number } };
  affectedArea: number;
  estimatedAffectedPeople: number;
  createdAt: string;
}

export default function DisastersPage() {
  const { token, hasPermission } = useAuth();
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [formData, setFormData] = useState({
    title: '', type: 'flood', description: '', severity: 'medium', status: 'active',
    address: '', city: '', state: '', country: 'India', pincode: '',
    lat: '', lng: '', affectedArea: '', estimatedAffectedPeople: '',
    startDate: '', reportedBy: '', notes: '',
  });

  const canManage = hasPermission(['super_admin', 'admin']);

  const fetchDisasters = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await fetch(`/api/disasters?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setDisasters(data.data.disasters);
    } catch (error) {
      toast.error('Failed to fetch disasters');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDisasters();
  }, [token, search, severityFilter, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedDisaster ? `/api/disasters/${selectedDisaster._id}` : '/api/disasters';
      const method = selectedDisaster ? 'PUT' : 'POST';
      const body = {
        ...formData,
        location: {
          address: formData.address, city: formData.city, state: formData.state,
          country: formData.country, pincode: formData.pincode,
          coordinates: formData.lat && formData.lng ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } : undefined
        },
        affectedArea: formData.affectedArea ? parseFloat(formData.affectedArea) : undefined,
        estimatedAffectedPeople: formData.estimatedAffectedPeople ? parseInt(formData.estimatedAffectedPeople) : undefined
      };
      const response = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        toast.success(selectedDisaster ? 'Disaster updated!' : 'Disaster added!');
        setShowModal(false);
        setSelectedDisaster(null);
        resetForm();
        fetchDisasters();
      } else toast.error(data.error);
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', type: 'flood', description: '', severity: 'medium', status: 'active',
      address: '', city: '', state: '', country: 'India', pincode: '',
      lat: '', lng: '', affectedArea: '', estimatedAffectedPeople: '',
      startDate: '', reportedBy: '', notes: '',
    });
  };

  const openEditModal = (disaster: Disaster) => {
    setSelectedDisaster(disaster);
    setFormData({
      title: disaster.title,
      type: disaster.type,
      description: disaster.description,
      severity: disaster.severity,
      status: disaster.status,
      address: disaster.location?.address || '',
      city: disaster.location?.city || '',
      state: disaster.location?.state || '',
      country: 'India',
      pincode: '',
      lat: disaster.location?.coordinates?.lat?.toString() || '',
      lng: disaster.location?.coordinates?.lng?.toString() || '',
      affectedArea: disaster.affectedArea?.toString() || '',
      estimatedAffectedPeople: disaster.estimatedAffectedPeople?.toString() || '',
      startDate: '',
      reportedBy: '',
      notes: '',
    });
    setShowModal(true);
  };

  const stats = {
    total: disasters.length,
    active: disasters.filter(d => d.status === 'active').length,
    critical: disasters.filter(d => d.severity === 'critical').length,
    resolved: disasters.filter(d => d.status === 'resolved').length,
    totalAffected: disasters.reduce((acc, d) => acc + (d.estimatedAffectedPeople || 0), 0)
  };

  const severityConfig: Record<string, { badge: 'danger' | 'warning' | 'info' | 'success'; bg: string; text: string }> = {
    low: { badge: 'success', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    medium: { badge: 'warning', bg: 'bg-amber-500/20', text: 'text-amber-400' },
    high: { badge: 'warning', bg: 'bg-orange-500/20', text: 'text-orange-400' },
    critical: { badge: 'danger', bg: 'bg-red-500/20', text: 'text-red-400' }
  };

  return (
    <DashboardLayout title="Disasters" subtitle="Track and manage disaster zones">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <StatCard title="Total" value={stats.total} icon={<MapPinIcon className="w-6 h-6" />} variant="purple" />
        <StatCard title="Active" value={stats.active} icon={<ExclamationTriangleIcon className="w-6 h-6" />} variant="red" />
        <StatCard title="Critical" value={stats.critical} icon={<ExclamationTriangleIcon className="w-6 h-6" />} variant="orange" />
        <StatCard title="Resolved" value={stats.resolved} icon={<CheckCircleIcon className="w-6 h-6" />} variant="green" />
        <StatCard title="Affected" value={stats.totalAffected.toLocaleString()} icon={<UsersIcon className="w-6 h-6" />} variant="teal" />
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <Input
              placeholder="Search disasters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Select value={severityFilter} onChange={(value) => setSeverityFilter(value)} options={[
              { value: 'all', label: 'All Severity' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' }
            ]} />
            <Select value={statusFilter} onChange={(value) => setStatusFilter(value)} options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'monitoring', label: 'Monitoring' },
              { value: 'resolved', label: 'Resolved' }
            ]} />
            <div className="flex bg-[var(--bg-input)] rounded-xl p-1.5 gap-1 border border-[var(--border-color)]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2.5 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                <MapIcon className="w-5 h-5" />
              </button>
            </div>
            {canManage && (
              <Button onClick={() => { setSelectedDisaster(null); resetForm(); setShowModal(true); }} leftIcon={<PlusIcon className="w-4 h-4" />} variant="gradient">
                Add Disaster
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Content */}
      {viewMode === 'map' ? (
        <Card padding="none" className="h-[500px] overflow-hidden">
          <DisasterMap
            disasters={disasters
              .filter((d) => typeof d.location?.coordinates?.lat === 'number' && typeof d.location?.coordinates?.lng === 'number')
              .map((d) => ({
                ...d,
                location: {
                  address: d.location?.address || '',
                  city: d.location?.city || '',
                  state: d.location?.state || '',
                  coordinates: [
                    (d.location!.coordinates as any).lng as number,
                    (d.location!.coordinates as any).lat as number,
                  ] as [number, number],
                },
              }))}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 bg-[var(--bg-input)] rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-[var(--bg-input)] rounded w-3/4" />
                    <div className="h-4 bg-[var(--bg-input)] rounded w-1/2" />
                  </div>
                </div>
                <div className="h-4 bg-[var(--bg-input)] rounded w-full mb-4" />
                <div className="h-4 bg-[var(--bg-input)] rounded w-2/3" />
              </Card>
            ))
          ) : disasters.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <CheckCircleIcon className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
              <p className="text-[var(--text-secondary)] text-lg">No disasters found</p>
              <p className="text-[var(--text-muted)] text-sm mt-2">All clear!</p>
            </div>
          ) : (
            disasters.map((disaster) => (
              <Card key={disaster._id} hover>
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${severityConfig[disaster.severity]?.bg || 'bg-[var(--bg-input)]'}`}>
                    <MapPinIcon className={`w-6 h-6 ${severityConfig[disaster.severity]?.text || 'text-[var(--text-muted)]'}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={disaster.status === 'active' ? 'danger' : disaster.status === 'resolved' ? 'success' : 'warning'} dot>
                      {disaster.status}
                    </Badge>
                    {canManage && (
                      <button
                        onClick={() => openEditModal(disaster)}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--info)] hover:bg-[var(--info)]/10 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{disaster.title}</h4>
                <p className="text-sm text-[var(--text-muted)] mb-4 flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4" />
                  {disaster.location?.city}, {disaster.location?.state}
                </p>

                <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-5">{disaster.description}</p>

                <div className="flex flex-wrap gap-2 mb-5">
                  <Badge variant="secondary" size="sm" className="capitalize">{disaster.type}</Badge>
                  <Badge variant={(severityConfig[disaster.severity]?.badge as any) || 'secondary'} size="sm" className="capitalize">
                    {disaster.severity}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-5 border-t border-[var(--border-color)]">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Area</p>
                    <p className="font-semibold text-[var(--text-primary)]">{disaster.affectedArea || '-'} km²</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Affected</p>
                    <p className="font-semibold text-[var(--text-primary)]">{disaster.estimatedAffectedPeople?.toLocaleString() || '-'}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal with More Fields */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedDisaster ? 'Edit Disaster' : 'Add Disaster'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="border-b border-[var(--border-color)] pb-6">
            <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              <Select label="Type" value={formData.type} onChange={(value) => setFormData({ ...formData, type: value })} options={[
                { value: 'flood', label: 'Flood' }, { value: 'earthquake', label: 'Earthquake' },
                { value: 'cyclone', label: 'Cyclone' }, { value: 'wildfire', label: 'Wildfire' },
                { value: 'tsunami', label: 'Tsunami' }, { value: 'landslide', label: 'Landslide' },
                { value: 'drought', label: 'Drought' }, { value: 'other', label: 'Other' }
              ]} />
              <Select label="Severity" value={formData.severity} onChange={(value) => setFormData({ ...formData, severity: value })} options={[
                { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }
              ]} />
              <Select label="Status" value={formData.status} onChange={(value) => setFormData({ ...formData, status: value })} options={[
                { value: 'active', label: 'Active' }, { value: 'monitoring', label: 'Monitoring' },
                { value: 'resolved', label: 'Resolved' }
              ]} />
              <Input label="Start Date" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} icon={<CalendarDaysIcon className="w-5 h-5" />} />
              <Input label="Reported By" value={formData.reportedBy} onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })} />
            </div>
          </div>

          {/* Location */}
          <div className="border-b border-[var(--border-color)] pb-6">
            <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Location Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Input label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} icon={<MapPinIcon className="w-5 h-5" />} />
              </div>
              <Input label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
              <Input label="State" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} required />
              <Input label="Country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} icon={<GlobeAltIcon className="w-5 h-5" />} />
              <Input label="Pincode" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
              <Input label="Latitude" type="number" step="any" value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} />
              <Input label="Longitude" type="number" step="any" value={formData.lng} onChange={(e) => setFormData({ ...formData, lng: e.target.value })} />
            </div>
          </div>

          {/* Impact */}
          <div className="border-b border-[var(--border-color)] pb-6">
            <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Impact Assessment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Affected Area (km²)" type="number" value={formData.affectedArea} onChange={(e) => setFormData({ ...formData, affectedArea: e.target.value })} />
              <Input label="Est. People Affected" type="number" value={formData.estimatedAffectedPeople} onChange={(e) => setFormData({ ...formData, estimatedAffectedPeople: e.target.value })} icon={<UsersIcon className="w-5 h-5" />} />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3.5 bg-[var(--bg-input)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--primary-500)] focus:ring-4 focus:ring-[var(--primary-500)]/20 transition-all resize-none"
                  placeholder="Describe the disaster situation..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2.5">Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3.5 bg-[var(--bg-input)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--primary-500)] focus:ring-4 focus:ring-[var(--primary-500)]/20 transition-all resize-none"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="gradient">{selectedDisaster ? 'Update' : 'Add'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
