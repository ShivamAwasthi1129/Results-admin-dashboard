'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Modal, Input, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  HomeModernIcon,
  MapPinIcon,
  UsersIcon,
  PhoneIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Shelter {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  capacity: number;
  currentOccupancy: number;
  contactPerson: string;
  contactPhone: string;
  facilities: string[];
  status: 'active' | 'full' | 'closed' | 'maintenance';
  type: 'temporary' | 'permanent' | 'emergency' | 'relief_camp';
  coordinates: { lat: number; lng: number };
  createdAt: string;
}

export default function SheltersPage() {
  const { token } = useAuth();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    capacity: '',
    contactPerson: '',
    contactPhone: '',
    type: 'temporary',
    facilities: [] as string[],
  });

  // Mock data
  useEffect(() => {
    const mockShelters: Shelter[] = [
      {
        id: '1',
        name: 'Government School Relief Camp',
        address: '123 Main Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        capacity: 500,
        currentOccupancy: 320,
        contactPerson: 'Rajesh Kumar',
        contactPhone: '+91 98765 43210',
        facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets'],
        status: 'active',
        type: 'relief_camp',
        coordinates: { lat: 19.0760, lng: 72.8777 },
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Community Hall Shelter',
        address: '45 Park Street',
        city: 'Delhi',
        state: 'Delhi',
        capacity: 200,
        currentOccupancy: 198,
        contactPerson: 'Amit Singh',
        contactPhone: '+91 87654 32109',
        facilities: ['Food', 'Water', 'Toilets'],
        status: 'full',
        type: 'temporary',
        coordinates: { lat: 28.6139, lng: 77.2090 },
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Stadium Emergency Shelter',
        address: '789 Sports Complex',
        city: 'Chennai',
        state: 'Tamil Nadu',
        capacity: 1000,
        currentOccupancy: 450,
        contactPerson: 'Priya Devi',
        contactPhone: '+91 76543 21098',
        facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'Charging Points'],
        status: 'active',
        type: 'emergency',
        coordinates: { lat: 13.0827, lng: 80.2707 },
        createdAt: new Date().toISOString(),
      },
      {
        id: '4',
        name: 'Dharamshala Permanent Shelter',
        address: '321 Temple Road',
        city: 'Kolkata',
        state: 'West Bengal',
        capacity: 150,
        currentOccupancy: 0,
        contactPerson: 'Biswas Roy',
        contactPhone: '+91 65432 10987',
        facilities: ['Food', 'Water', 'Toilets', 'Sleeping Area'],
        status: 'closed',
        type: 'permanent',
        coordinates: { lat: 22.5726, lng: 88.3639 },
        createdAt: new Date().toISOString(),
      },
    ];

    setTimeout(() => {
      setShelters(mockShelters);
      setIsLoading(false);
    }, 500);
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, { variant: 'success' | 'danger' | 'warning' | 'info'; dot: string }> = {
      active: { variant: 'success', dot: 'bg-emerald-500' },
      full: { variant: 'warning', dot: 'bg-amber-500' },
      closed: { variant: 'danger', dot: 'bg-red-500' },
      maintenance: { variant: 'info', dot: 'bg-blue-500' },
    };
    return colors[status] || colors.active;
  };

  const getOccupancyColor = (current: number, total: number) => {
    const percentage = (current / total) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedShelter) {
      setShelters(prev => prev.map(s => 
        s.id === selectedShelter.id 
          ? { ...s, ...formData, capacity: Number(formData.capacity) }
          : s
      ));
      toast.success('Shelter updated successfully');
    } else {
      const newShelter: Shelter = {
        id: Date.now().toString(),
        ...formData,
        capacity: Number(formData.capacity),
        currentOccupancy: 0,
        status: 'active',
        coordinates: { lat: 0, lng: 0 },
        createdAt: new Date().toISOString(),
      };
      setShelters(prev => [...prev, newShelter]);
      toast.success('Shelter created successfully');
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      capacity: '',
      contactPerson: '',
      contactPhone: '',
      type: 'temporary',
      facilities: [],
    });
    setIsEditing(false);
    setSelectedShelter(null);
  };

  const handleEdit = (shelter: Shelter) => {
    setSelectedShelter(shelter);
    setFormData({
      name: shelter.name,
      address: shelter.address,
      city: shelter.city,
      state: shelter.state,
      capacity: shelter.capacity.toString(),
      contactPerson: shelter.contactPerson,
      contactPhone: shelter.contactPhone,
      type: shelter.type,
      facilities: shelter.facilities,
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this shelter?')) {
      setShelters(prev => prev.filter(s => s.id !== id));
      toast.success('Shelter deleted successfully');
    }
  };

  const filteredShelters = shelters.filter(shelter => {
    if (filterStatus !== 'all' && shelter.status !== filterStatus) return false;
    if (searchQuery && 
        !shelter.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !shelter.city.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: shelters.length,
    active: shelters.filter(s => s.status === 'active').length,
    totalCapacity: shelters.reduce((sum, s) => sum + s.capacity, 0),
    currentOccupancy: shelters.reduce((sum, s) => sum + s.currentOccupancy, 0),
  };

  const availableFacilities = ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'Charging Points', 'WiFi', 'Sleeping Area', 'Childcare', 'Pet Friendly'];

  return (
    <DashboardLayout title="Shelters & Relief Camps" subtitle="Manage temporary shelters and relief camps">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">Total Shelters</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">Total Capacity</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalCapacity.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">Current Occupancy</p>
          <p className="text-2xl font-bold text-[var(--primary-500)]">{stats.currentOccupancy.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            placeholder="Search shelters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'full', label: 'Full' },
            { value: 'closed', label: 'Closed' },
            { value: 'maintenance', label: 'Maintenance' },
          ]}
          value={filterStatus}
          onChange={setFilterStatus}
          icon={<FunnelIcon className="w-5 h-5" />}
        />
        <Button 
          variant="gradient" 
          leftIcon={<PlusIcon className="w-5 h-5" />}
          onClick={() => { resetForm(); setIsModalOpen(true); }}
        >
          Add Shelter
        </Button>
      </div>

      {/* Shelters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="space-y-4">
                <div className="h-6 bg-[var(--bg-input)] rounded w-3/4" />
                <div className="h-4 bg-[var(--bg-input)] rounded w-full" />
                <div className="h-4 bg-[var(--bg-input)] rounded w-2/3" />
              </div>
            </Card>
          ))
        ) : filteredShelters.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <HomeModernIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">No Shelters Found</p>
            <p className="text-[var(--text-muted)]">No shelters match your current filters</p>
          </Card>
        ) : (
          filteredShelters.map((shelter) => (
            <Card key={shelter.id} className="p-6 hover:border-[var(--primary-500)]/50 transition-all">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-pink-500 flex items-center justify-center">
                    <HomeModernIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1">{shelter.name}</h3>
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      {shelter.city}, {shelter.state}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusColor(shelter.status).variant} size="sm" dot>
                  {shelter.status}
                </Badge>
              </div>

              {/* Occupancy Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--text-muted)]">Occupancy</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {shelter.currentOccupancy} / {shelter.capacity}
                  </span>
                </div>
                <div className="h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getOccupancyColor(shelter.currentOccupancy, shelter.capacity)} rounded-full transition-all`}
                    style={{ width: `${(shelter.currentOccupancy / shelter.capacity) * 100}%` }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-[var(--text-muted)]" />
                  {shelter.contactPerson}
                </p>
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-[var(--text-muted)]" />
                  {shelter.contactPhone}
                </p>
              </div>

              {/* Facilities */}
              <div className="flex flex-wrap gap-2 mb-4">
                {shelter.facilities.slice(0, 4).map((facility, i) => (
                  <span 
                    key={i} 
                    className="px-2 py-1 text-xs rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)]"
                  >
                    {facility}
                  </span>
                ))}
                {shelter.facilities.length > 4 && (
                  <span className="px-2 py-1 text-xs rounded-lg bg-[var(--primary-500)]/20 text-[var(--primary-500)]">
                    +{shelter.facilities.length - 4} more
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-[var(--border-color)]">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleEdit(shelter)}>
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </Button>
                <Button variant="danger" size="sm" className="flex-1" onClick={() => handleDelete(shelter.id)}>
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={isEditing ? 'Edit Shelter' : 'Add New Shelter'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Shelter Name"
            placeholder="e.g., Government School Relief Camp"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Address"
            placeholder="Full address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              placeholder="City"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              required
            />
            <Input
              label="State"
              placeholder="State"
              value={formData.state}
              onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Capacity"
              type="number"
              placeholder="Max capacity"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
              required
            />
            <Select
              label="Type"
              options={[
                { value: 'temporary', label: 'Temporary' },
                { value: 'permanent', label: 'Permanent' },
                { value: 'emergency', label: 'Emergency' },
                { value: 'relief_camp', label: 'Relief Camp' },
              ]}
              value={formData.type}
              onChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              placeholder="Name"
              value={formData.contactPerson}
              onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
              required
            />
            <Input
              label="Contact Phone"
              placeholder="+91 XXXXX XXXXX"
              value={formData.contactPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
              required
            />
          </div>

          {/* Facilities */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Facilities Available
            </label>
            <div className="flex flex-wrap gap-2">
              {availableFacilities.map((facility) => (
                <button
                  key={facility}
                  type="button"
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    formData.facilities.includes(facility)
                      ? 'bg-[var(--primary-500)] text-white'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      facilities: prev.facilities.includes(facility)
                        ? prev.facilities.filter(f => f !== facility)
                        : [...prev.facilities, facility]
                    }));
                  }}
                >
                  {facility}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" className="flex-1">
              {isEditing ? 'Update Shelter' : 'Create Shelter'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

