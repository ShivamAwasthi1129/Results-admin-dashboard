'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, StatCard, Button, Input, Badge, Modal, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  MapPinIcon,
  UserIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

interface Emergency {
  _id: string;
  title: string;
  type: string;
  description: string;
  priority: string;
  status: string;
  location: { address?: string; city?: string; state?: string };
  contactName?: string;
  contactPhone?: string;
  numberOfPeople?: number;
  createdAt: string;
}

export default function EmergenciesPage() {
  const { token, hasPermission } = useAuth();
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);
  const [formData, setFormData] = useState({
    title: '', type: 'rescue', description: '', priority: 'medium', status: 'pending',
    city: '', state: '', address: '', contactName: '', contactPhone: '', numberOfPeople: ''
  });

  const canManage = hasPermission(['super_admin', 'admin']);

  const fetchEmergencies = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await fetch(`/api/emergencies?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setEmergencies(data.data.emergencies);
    } catch (error) {
      toast.error('Failed to fetch emergencies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchEmergencies();
  }, [token, search, priorityFilter, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedEmergency ? `/api/emergencies?id=${selectedEmergency._id}` : '/api/emergencies';
      const method = selectedEmergency ? 'PUT' : 'POST';
      const body = {
        ...formData,
        location: { city: formData.city, state: formData.state, address: formData.address },
        numberOfPeople: formData.numberOfPeople ? parseInt(formData.numberOfPeople) : undefined
      };
      const response = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        toast.success(selectedEmergency ? 'Emergency updated!' : 'Emergency added!');
        setShowModal(false);
        setSelectedEmergency(null);
        resetForm();
        fetchEmergencies();
      } else toast.error(data.error);
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', type: 'rescue', description: '', priority: 'medium', status: 'pending',
      city: '', state: '', address: '', contactName: '', contactPhone: '', numberOfPeople: ''
    });
  };

  const openEditModal = (emergency: Emergency) => {
    setSelectedEmergency(emergency);
    setFormData({
      title: emergency.title,
      type: emergency.type,
      description: emergency.description,
      priority: emergency.priority,
      status: emergency.status,
      city: emergency.location?.city || '',
      state: emergency.location?.state || '',
      address: emergency.location?.address || '',
      contactName: emergency.contactName || '',
      contactPhone: emergency.contactPhone || '',
      numberOfPeople: emergency.numberOfPeople?.toString() || ''
    });
    setShowModal(true);
  };

  const stats = {
    total: emergencies.length,
    pending: emergencies.filter(e => e.status === 'pending').length,
    inProgress: emergencies.filter(e => e.status === 'in_progress' || e.status === 'dispatched').length,
    resolved: emergencies.filter(e => e.status === 'resolved').length,
    critical: emergencies.filter(e => e.priority === 'critical').length
  };

  const typeIcons: Record<string, string> = {
    rescue: '🚁', medical: '🏥', evacuation: '🚐', supply_delivery: '📦', fire: '🔥', other: '⚠️'
  };

  const priorityConfig: Record<string, { badge: 'danger' | 'warning' | 'info' | 'success'; bg: string }> = {
    critical: { badge: 'danger', bg: 'bg-red-500/20' },
    high: { badge: 'warning', bg: 'bg-orange-500/20' },
    medium: { badge: 'info', bg: 'bg-amber-500/20' },
    low: { badge: 'success', bg: 'bg-emerald-500/20' }
  };

  return (
    <DashboardLayout title="Emergencies" subtitle="Track and respond to emergency calls">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <StatCard title="Total" value={stats.total} icon={<ExclamationTriangleIcon className="w-6 h-6" />} variant="purple" />
        <StatCard title="Pending" value={stats.pending} icon={<ClockIcon className="w-6 h-6" />} variant="orange" />
        <StatCard title="In Progress" value={stats.inProgress} icon={<TruckIcon className="w-6 h-6" />} variant="blue" />
        <StatCard title="Resolved" value={stats.resolved} icon={<CheckCircleIcon className="w-6 h-6" />} variant="green" />
        <StatCard title="Critical" value={stats.critical} icon={<ExclamationTriangleIcon className="w-6 h-6" />} variant="red" />
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <Input
              placeholder="Search emergencies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Select value={priorityFilter} onChange={(value) => setPriorityFilter(value)} options={[
              { value: 'all', label: 'All Priority' },
              { value: 'critical', label: '🔴 Critical' },
              { value: 'high', label: '🟠 High' },
              { value: 'medium', label: '🟡 Medium' },
              { value: 'low', label: '🟢 Low' }
            ]} />
            <Select value={statusFilter} onChange={(value) => setStatusFilter(value)} options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'dispatched', label: 'Dispatched' },
              { value: 'resolved', label: 'Resolved' }
            ]} />
            {canManage && (
              <Button onClick={() => { setSelectedEmergency(null); resetForm(); setShowModal(true); }} leftIcon={<PlusIcon className="w-4 h-4" />} variant="gradient">
                Add Emergency
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Emergencies Grid */}
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
              <div className="space-y-2">
                <div className="h-4 bg-[var(--bg-input)] rounded w-full" />
                <div className="h-4 bg-[var(--bg-input)] rounded w-2/3" />
              </div>
            </Card>
          ))
        ) : emergencies.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <CheckCircleIcon className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
            <p className="text-[var(--text-secondary)] text-lg">No emergencies found</p>
            <p className="text-[var(--text-muted)] text-sm mt-2">All clear!</p>
          </div>
        ) : (
          emergencies.map((emergency) => (
            <Card key={emergency._id} hover className="relative">
              {emergency.priority === 'critical' && (
                <span className="absolute top-5 right-5 w-3 h-3 bg-red-500 rounded-full animate-ping" />
              )}

              <div className="flex items-start gap-4 mb-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${priorityConfig[emergency.priority]?.bg || 'bg-[var(--bg-input)]'}`}>
                  {typeIcons[emergency.type] || '⚠️'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[var(--text-primary)] truncate">{emergency.title}</h4>
                  <p className="text-sm text-[var(--text-muted)] capitalize mt-0.5">{emergency.type.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                <Badge variant={(priorityConfig[emergency.priority]?.badge as any) || 'secondary'} size="sm" dot>
                  {emergency.priority}
                </Badge>
                <Badge 
                  variant={emergency.status === 'resolved' ? 'success' : emergency.status === 'pending' ? 'warning' : 'info'} 
                  size="sm"
                >
                  {emergency.status.replace('_', ' ')}
                </Badge>
              </div>

              <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-5">{emergency.description}</p>

              <div className="space-y-3 mb-5">
                {emergency.location?.city && (
                  <p className="text-sm text-[var(--text-muted)] flex items-center gap-2.5">
                    <MapPinIcon className="w-4 h-4 shrink-0" />
                    {emergency.location.city}, {emergency.location.state}
                  </p>
                )}
                {emergency.contactName && (
                  <p className="text-sm text-[var(--text-muted)] flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4 shrink-0" />
                    {emergency.contactName}
                  </p>
                )}
                {emergency.contactPhone && (
                  <p className="text-sm text-[var(--text-muted)] flex items-center gap-2.5">
                    <PhoneIcon className="w-4 h-4 shrink-0" />
                    {emergency.contactPhone}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-muted)]">
                  {new Date(emergency.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-3">
                  {emergency.numberOfPeople && (
                    <Badge variant="secondary" size="sm">{emergency.numberOfPeople} people</Badge>
                  )}
                  {canManage && (
                    <button
                      onClick={() => openEditModal(emergency)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--info)] hover:bg-[var(--info)]/10 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedEmergency ? 'Edit Emergency' : 'Add Emergency'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-[var(--border-color)] pb-6">
            <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Basic Information</h4>
            <Input label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            <div className="grid grid-cols-2 gap-5 mt-5">
              <Select label="Type" value={formData.type} onChange={(value) => setFormData({ ...formData, type: value })} options={[
                { value: 'rescue', label: '🚁 Rescue' }, { value: 'medical', label: '🏥 Medical' },
                { value: 'evacuation', label: '🚐 Evacuation' }, { value: 'supply_delivery', label: '📦 Supply Delivery' },
                { value: 'fire', label: '🔥 Fire' }, { value: 'other', label: '⚠️ Other' }
              ]} />
              <Select label="Priority" value={formData.priority} onChange={(value) => setFormData({ ...formData, priority: value })} options={[
                { value: 'low', label: '🟢 Low' }, { value: 'medium', label: '🟡 Medium' },
                { value: 'high', label: '🟠 High' }, { value: 'critical', label: '🔴 Critical' }
              ]} />
            </div>
          </div>

          <div className="border-b border-[var(--border-color)] pb-6">
            <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Location & Contact</h4>
            <div className="grid grid-cols-2 gap-5">
              <Input label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} icon={<MapPinIcon className="w-5 h-5" />} />
              <Input label="State" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
              <Input label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="col-span-2" />
              <Input label="Contact Name" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} icon={<UserIcon className="w-5 h-5" />} />
              <Input label="Contact Phone" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} icon={<PhoneIcon className="w-5 h-5" />} />
              <Input label="Number of People" type="number" value={formData.numberOfPeople} onChange={(e) => setFormData({ ...formData, numberOfPeople: e.target.value })} />
              <Select label="Status" value={formData.status} onChange={(value) => setFormData({ ...formData, status: value })} options={[
                { value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' },
                { value: 'dispatched', label: 'Dispatched' }, { value: 'resolved', label: 'Resolved' }
              ]} />
            </div>
          </div>

          <div className="pb-6">
            <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Description</h4>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3.5 bg-[var(--bg-input)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--primary-500)] focus:ring-4 focus:ring-[var(--primary-500)]/20 transition-all resize-none"
              placeholder="Describe the emergency situation..."
            />
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="gradient">{selectedEmergency ? 'Update' : 'Add'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
