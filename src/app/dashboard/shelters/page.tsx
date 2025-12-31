'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Modal, Input, Select, PhoneInput } from '@/components/ui';
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
  EyeIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface Shelter {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  address?: string; // For backward compatibility
  city: string;
  state: string;
  zipCode?: string;
  country?: string;
  capacity: number;
  currentOccupancy: number;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  description?: string;
  website?: string;
  operatingHours?: string;
  notes?: string;
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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [viewShelter, setViewShelter] = useState<Shelter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customFacility, setCustomFacility] = useState('');
  const [showCustomFacility, setShowCustomFacility] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    capacity: '',
    currentOccupancy: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    description: '',
    website: '',
    operatingHours: '',
    notes: '',
    type: 'temporary',
    facilities: [] as string[],
  });

  // Reusable function to fetch shelters from API
  const fetchShelters = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/shelters', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setShelters(data.data);
        
        // Auto-seed if no shelters exist
        if (data.data.length === 0) {
          console.log('No shelters found, auto-seeding...');
          try {
            const seedResponse = await fetch('/api/shelters/init');
            const seedData = await seedResponse.json();
            if (seedData.success) {
              // Refetch shelters after seeding
              await fetchShelters();
              toast.success(`Auto-seeded ${seedData.count} shelters`);
            }
          } catch (seedError) {
            console.error('Auto-seed error:', seedError);
          }
        }
      } else {
        toast.error(data.error || 'Failed to fetch shelters');
      }
    } catch (error) {
      console.error('Error fetching shelters:', error);
      toast.error('Failed to fetch shelters');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch shelters on mount and when token changes
  useEffect(() => {
    if (token) {
      fetchShelters();
    }
  }, [token]);

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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Shelter name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Shelter name must be at least 2 characters';
    }

    if (!formData.addressLine1.trim()) {
      errors.addressLine1 = 'Address line 1 is required';
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required';
    } else if (formData.city.trim().length < 2) {
      errors.city = 'City must be at least 2 characters';
    }

    if (!formData.state.trim()) {
      errors.state = 'State is required';
    } else if (formData.state.trim().length < 2) {
      errors.state = 'State must be at least 2 characters';
    }

    // Validate capacity first
    const capacityStr = formData.capacity.toString().trim();
    const capacity = capacityStr ? Number(capacityStr) : 0;
    
    if (!capacityStr || capacity < 1) {
      errors.capacity = 'Capacity is required and must be at least 1';
    }

    // Validate occupancy (only check for negative values, not capacity comparison)
    const occupancyStr = formData.currentOccupancy.toString().trim();
    const occupancy = occupancyStr && !isNaN(Number(occupancyStr)) ? Number(occupancyStr) : null;
    
    if (occupancyStr && occupancy !== null && !isNaN(occupancy) && occupancy < 0) {
      errors.currentOccupancy = 'Occupancy cannot be negative';
    }
    
    // Validate zip code (numbers only)
    if (formData.zipCode && formData.zipCode.trim()) {
      if (!/^\d+$/.test(formData.zipCode.trim())) {
        errors.zipCode = 'Zip code must contain only numbers';
      }
    }

    if (!formData.contactPerson.trim()) {
      errors.contactPerson = 'Contact person is required';
    } else if (formData.contactPerson.trim().length < 2) {
      errors.contactPerson = 'Contact person name must be at least 2 characters';
    }

    if (!formData.contactPhone.trim()) {
      errors.contactPhone = 'Contact phone is required';
    }

    if (formData.contactEmail && formData.contactEmail.trim()) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(formData.contactEmail)) {
        errors.contactEmail = 'Please enter a valid email address';
      }
    }

    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website.startsWith('http') ? formData.website : `https://${formData.website}`);
      } catch {
        errors.website = 'Please enter a valid website URL';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const errorMessages = Object.values(formErrors).filter(Boolean);
      if (errorMessages.length > 0) {
        toast.error(errorMessages[0] || 'Please fix the form errors');
      } else {
        toast.error('Please fix the form errors');
      }
      return;
    }
    
    try {
      // Log form data before sending (for debugging)
      console.log('Submitting form data:', formData);
      if (isEditing && selectedShelter) {
        // Update shelter
        const response = await fetch('/api/shelters', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: selectedShelter.id,
            name: formData.name.trim(),
            addressLine1: formData.addressLine1.trim(),
            addressLine2: formData.addressLine2.trim() || '',
            city: formData.city.trim(),
            state: formData.state.trim(),
            zipCode: formData.zipCode.trim() || '',
            country: formData.country.trim() || 'United States',
            capacity: Number(formData.capacity),
            currentOccupancy: Number(formData.currentOccupancy) || 0,
            contactPerson: formData.contactPerson.trim(),
            contactPhone: formData.contactPhone.trim(),
            contactEmail: formData.contactEmail.trim() || '',
            description: formData.description.trim() || '',
            website: formData.website.trim() || '',
            operatingHours: formData.operatingHours.trim() || '',
            notes: formData.notes.trim() || '',
            type: formData.type,
            facilities: formData.facilities || [],
            coordinates: selectedShelter.coordinates || { lat: 0, lng: 0 },
          }),
        });
        const data = await response.json();
        if (data.success) {
          toast.success('Shelter updated successfully');
          setIsModalOpen(false);
          resetForm();
          // Refetch shelters to get latest data from database
          await fetchShelters();
        } else {
          // Show detailed error message
          const errorMsg = data.error || 'Failed to update shelter';
          if (data.missingFields) {
            toast.error(`${errorMsg}. Missing: ${data.missingFields.join(', ')}`);
          } else {
            toast.error(errorMsg);
          }
          console.error('Update shelter error:', data);
          return;
        }
      } else {
        // Create shelter
        const response = await fetch('/api/shelters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            addressLine1: formData.addressLine1.trim(),
            addressLine2: formData.addressLine2.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            zipCode: formData.zipCode.trim(),
            country: formData.country.trim(),
            capacity: Number(formData.capacity),
            currentOccupancy: Number(formData.currentOccupancy) || 0,
            contactPerson: formData.contactPerson.trim(),
            contactPhone: formData.contactPhone.trim(),
            contactEmail: formData.contactEmail.trim(),
            description: formData.description.trim(),
            website: formData.website.trim(),
            operatingHours: formData.operatingHours.trim(),
            notes: formData.notes.trim(),
            type: formData.type,
            facilities: formData.facilities,
            coordinates: { lat: 0, lng: 0 },
          }),
        });
        const data = await response.json();
        if (data.success) {
          toast.success('Shelter created successfully');
          setIsModalOpen(false);
          resetForm();
          // Refetch shelters to get latest data from database
          await fetchShelters();
        } else {
          // Show detailed error message
          const errorMsg = data.error || 'Failed to create shelter';
          if (data.missingFields) {
            toast.error(`${errorMsg}. Missing: ${data.missingFields.join(', ')}`);
          } else {
            toast.error(errorMsg);
          }
          console.error('Create shelter error:', data);
          return;
        }
      }
    } catch (error) {
      console.error('Error saving shelter:', error);
      toast.error('Failed to save shelter');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States',
      capacity: '',
      currentOccupancy: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      description: '',
      website: '',
      operatingHours: '',
      notes: '',
      type: 'temporary',
      facilities: [],
    });
    setFormErrors({});
    setCustomFacility('');
    setShowCustomFacility(false);
    setIsEditing(false);
    setSelectedShelter(null);
  };

  const handleEdit = (shelter: Shelter) => {
    console.log('Editing shelter:', shelter); // Debug log
    setSelectedShelter(shelter);
    setFormData({
      name: shelter.name || '',
      addressLine1: shelter.addressLine1 || shelter.address || '',
      addressLine2: shelter.addressLine2 || '',
      city: shelter.city || '',
      state: shelter.state || '',
      zipCode: shelter.zipCode || '',
      country: shelter.country || 'United States',
      capacity: shelter.capacity ? shelter.capacity.toString() : '',
      currentOccupancy: shelter.currentOccupancy !== undefined ? shelter.currentOccupancy.toString() : '0',
      contactPerson: shelter.contactPerson || '',
      contactPhone: shelter.contactPhone || '',
      contactEmail: shelter.contactEmail || '',
      description: shelter.description || '',
      website: shelter.website || '',
      operatingHours: shelter.operatingHours || '',
      notes: shelter.notes || '',
      type: shelter.type || 'temporary',
      facilities: Array.isArray(shelter.facilities) ? shelter.facilities : [],
    });
    setFormErrors({}); // Clear any previous errors
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleView = (shelter: Shelter) => {
    setViewShelter(shelter);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this shelter?')) {
      return;
    }
    try {
      const response = await fetch(`/api/shelters?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Shelter deleted successfully');
        // Refetch shelters to get latest data from database
        await fetchShelters();
      } else {
        toast.error(data.error || 'Failed to delete shelter');
      }
    } catch (error) {
      console.error('Error deleting shelter:', error);
      toast.error('Failed to delete shelter');
    }
  };

  const filteredShelters = shelters.filter(shelter => {
    if (filterStatus !== 'all' && shelter.status !== filterStatus) return false;
    if (searchQuery && 
        !shelter.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !shelter.city.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !shelter.state.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: shelters.length,
    active: shelters.filter(s => s.status === 'active').length,
    totalCapacity: shelters.reduce((sum, s) => sum + s.capacity, 0),
    currentOccupancy: shelters.reduce((sum, s) => sum + s.currentOccupancy, 0),
  };

  const availableFacilities = ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'Charging Points', 'WiFi', 'Sleeping Area', 'Childcare', 'Pet Friendly'];

  const addCustomFacility = () => {
    if (customFacility.trim() && !formData.facilities.includes(customFacility.trim())) {
      setFormData(prev => ({
        ...prev,
        facilities: [...prev.facilities, customFacility.trim()],
      }));
      setCustomFacility('');
      setShowCustomFacility(false);
    }
  };

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
        <div className="">
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

      {/* Shelters List View */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse mb-4 pb-4 border-b border-[var(--border-color)] last:border-b-0">
                <div className="h-6 bg-[var(--bg-input)] rounded w-1/4 mb-2" />
                <div className="h-4 bg-[var(--bg-input)] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredShelters.length === 0 ? (
          <div className="p-12 text-center">
            <HomeModernIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">No Shelters Found</p>
            <p className="text-[var(--text-muted)]">No shelters match your current filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-input)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Shelter Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Occupancy</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredShelters.map((shelter) => (
                  <tr key={shelter.id} className="hover:bg-[var(--bg-input)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary-500)] to-pink-500 flex items-center justify-center flex-shrink-0">
                          <HomeModernIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{shelter.name}</p>
                          <p className="text-sm text-[var(--text-muted)]">{shelter.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPinIcon className="w-4 h-4 text-[var(--text-muted)]" />
                        <div>
                          <p className="text-[var(--text-primary)]">{shelter.city}, {shelter.state}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {shelter.addressLine1 || shelter.address}
                            {shelter.addressLine2 && `, ${shelter.addressLine2}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{shelter.capacity}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {shelter.currentOccupancy} / {shelter.capacity}
                        </p>
                        <div className="w-24 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden mt-1">
                          <div 
                            className={`h-full ${getOccupancyColor(shelter.currentOccupancy, shelter.capacity)} rounded-full transition-all`}
                            style={{ width: `${Math.min((shelter.currentOccupancy / shelter.capacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-[var(--text-primary)] flex items-center gap-2">
                          <UsersIcon className="w-4 h-4 text-[var(--text-muted)]" />
                          {shelter.contactPerson}
                        </p>
                        <p className="text-[var(--text-secondary)] flex items-center gap-2 mt-1">
                          <PhoneIcon className="w-4 h-4 text-[var(--text-muted)]" />
                          {shelter.contactPhone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusColor(shelter.status).variant} size="sm" dot>
                        {shelter.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleView(shelter)}
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleEdit(shelter)}
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => handleDelete(shelter.id)}
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => { setIsViewModalOpen(false); setViewShelter(null); }}
        title="Shelter Details"
        size="lg"
      >
        {viewShelter && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-pink-500 flex items-center justify-center">
                  <HomeModernIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{viewShelter.name}</h3>
                  <p className="text-sm text-[var(--text-muted)] capitalize">{viewShelter.type.replace('_', ' ')}</p>
                </div>
              </div>
              <Badge variant={getStatusColor(viewShelter.status).variant} size="sm" dot>
                {viewShelter.status}
              </Badge>
            </div>

            {/* Location */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <MapPinIcon className="w-5 h-5" />
                Location
              </h4>
              <div className="bg-[var(--bg-input)] p-4 rounded-lg space-y-2">
                <p className="text-[var(--text-primary)]">{viewShelter.addressLine1 || viewShelter.address}</p>
                {viewShelter.addressLine2 && (
                  <p className="text-[var(--text-primary)]">{viewShelter.addressLine2}</p>
                )}
                <p className="text-[var(--text-secondary)]">
                  {viewShelter.city}, {viewShelter.state}
                  {viewShelter.zipCode && ` ${viewShelter.zipCode}`}
                </p>
                {viewShelter.country && (
                  <p className="text-[var(--text-muted)] text-sm">{viewShelter.country}</p>
                )}
              </div>
            </div>

            {/* Capacity & Occupancy */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Capacity</h4>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{viewShelter.capacity}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Current Occupancy</h4>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{viewShelter.currentOccupancy}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[var(--text-muted)]">Occupancy Percentage</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {Math.round((viewShelter.currentOccupancy / viewShelter.capacity) * 100)}%
                </span>
              </div>
              <div className="h-3 bg-[var(--bg-input)] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getOccupancyColor(viewShelter.currentOccupancy, viewShelter.capacity)} rounded-full transition-all`}
                  style={{ width: `${Math.min((viewShelter.currentOccupancy / viewShelter.capacity) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <UsersIcon className="w-5 h-5" />
                Contact Information
              </h4>
              <div className="bg-[var(--bg-input)] p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <UsersIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Contact Person</p>
                    <p className="text-[var(--text-primary)] font-medium">{viewShelter.contactPerson}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PhoneIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Phone</p>
                    <p className="text-[var(--text-primary)] font-medium">{viewShelter.contactPhone}</p>
                  </div>
                </div>
                {viewShelter.contactEmail && (
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="w-5 h-5 text-[var(--text-muted)]" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Email</p>
                      <p className="text-[var(--text-primary)] font-medium">{viewShelter.contactEmail}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            {(viewShelter.description || viewShelter.website || viewShelter.operatingHours) && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Additional Information</h4>
                <div className="bg-[var(--bg-input)] p-4 rounded-lg space-y-3">
                  {viewShelter.description && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Description</p>
                      <p className="text-[var(--text-primary)]">{viewShelter.description}</p>
                    </div>
                  )}
                  {viewShelter.website && (
                    <div className="flex items-center gap-3">
                      <GlobeAltIcon className="w-5 h-5 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Website</p>
                        <a 
                          href={viewShelter.website.startsWith('http') ? viewShelter.website : `https://${viewShelter.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--primary-500)] hover:underline"
                        >
                          {viewShelter.website}
                        </a>
                      </div>
                    </div>
                  )}
                  {viewShelter.operatingHours && (
                    <div className="flex items-center gap-3">
                      <ClockIcon className="w-5 h-5 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Operating Hours</p>
                        <p className="text-[var(--text-primary)]">{viewShelter.operatingHours}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Facilities */}
            {viewShelter.facilities && viewShelter.facilities.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Facilities Available</h4>
                <div className="flex flex-wrap gap-2">
                  {viewShelter.facilities.map((facility, i) => (
                    <span 
                      key={i} 
                      className="px-3 py-1.5 text-sm rounded-lg bg-[var(--primary-500)]/20 text-[var(--primary-500)]"
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {viewShelter.notes && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5" />
                  Notes
                </h4>
                <div className="bg-[var(--bg-input)] p-4 rounded-lg">
                  <p className="text-[var(--text-primary)] whitespace-pre-wrap">{viewShelter.notes}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
              <Button 
                variant="secondary" 
                className="flex-1" 
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEdit(viewShelter);
                }}
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit Shelter
              </Button>
              <Button 
                variant="danger" 
                className="flex-1" 
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleDelete(viewShelter.id);
                }}
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete Shelter
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={isEditing ? 'Edit Shelter' : 'Add New Shelter'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Basic Information</h4>
            <div className="space-y-4">
              <Input
                label="Shelter Name *"
                placeholder="e.g., Government School Relief Camp"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                }}
                error={formErrors.name}
                required
              />
              <Input
                label="Address Line 1 *"
                placeholder="Street address, building number"
                value={formData.addressLine1}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, addressLine1: e.target.value }));
                  if (formErrors.addressLine1) setFormErrors(prev => ({ ...prev, addressLine1: '' }));
                }}
                error={formErrors.addressLine1}
                required
              />
              <Input
                label="Address Line 2"
                placeholder="Apartment, suite, unit, etc. (optional)"
                value={formData.addressLine2}
                onChange={(e) => setFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City *"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, city: e.target.value }));
                    if (formErrors.city) setFormErrors(prev => ({ ...prev, city: '' }));
                  }}
                  error={formErrors.city}
                  required
                />
                <Input
                  label="State *"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, state: e.target.value }));
                    if (formErrors.state) setFormErrors(prev => ({ ...prev, state: '' }));
                  }}
                  error={formErrors.state}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Zip Code"
                  placeholder="Zip/Postal code (numbers only)"
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setFormData(prev => ({ ...prev, zipCode: value }));
                    if (formErrors.zipCode) setFormErrors(prev => ({ ...prev, zipCode: '' }));
                  }}
                  error={formErrors.zipCode}
                  maxLength={20}
                />
                <Input
                  label="Country"
                  placeholder="Country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Capacity & Occupancy */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Capacity & Occupancy</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Capacity *"
                type="number"
                placeholder="Max capacity"
                value={formData.capacity}
                onChange={(e) => {
                  const value = e.target.value;
                  
                  setFormData(prev => ({ ...prev, capacity: value }));
                  
                  // Convert to numbers properly
                  const capacityStr = value.trim();
                  const capacity = capacityStr && !isNaN(Number(capacityStr)) ? Number(capacityStr) : null;
                  
                  const occupancyStr = formData.currentOccupancy.toString().trim();
                  const occupancy = occupancyStr && !isNaN(Number(occupancyStr)) ? Number(occupancyStr) : null;
                  
                  // Clear capacity error if valid
                  if (formErrors.capacity) {
                    if (capacity !== null && capacity >= 1) {
                      setFormErrors(prev => ({ ...prev, capacity: '' }));
                    }
                  }
                }}
                error={formErrors.capacity}
                required
                min="1"
              />
              <Input
                label="Current Occupancy *"
                type="number"
                placeholder="Current occupancy"
                value={formData.currentOccupancy}
                onChange={(e) => {
                  const value = e.target.value;
                  
                  setFormData(prev => ({ ...prev, currentOccupancy: value }));
                  
                  // Convert to numbers properly - handle empty strings
                  const capacityStr = formData.capacity.toString().trim();
                  const capacity = capacityStr && !isNaN(Number(capacityStr)) ? Number(capacityStr) : null;
                  
                  const occupancyStr = value.trim();
                  const occupancy = occupancyStr && !isNaN(Number(occupancyStr)) ? Number(occupancyStr) : null;
                  
                  // Real-time validation - only check for negative values
                  if (occupancyStr) {
                    if (occupancy === null || isNaN(occupancy)) {
                      // Invalid number format - clear error, let user continue typing
                      setFormErrors(prev => ({ ...prev, currentOccupancy: '' }));
                    } else if (occupancy < 0) {
                      setFormErrors(prev => ({ 
                        ...prev, 
                        currentOccupancy: 'Occupancy cannot be negative' 
                      }));
                    } else {
                      // Clear error if valid (non-negative)
                      setFormErrors(prev => ({ ...prev, currentOccupancy: '' }));
                    }
                  } else {
                    // Empty value - clear error
                    setFormErrors(prev => ({ ...prev, currentOccupancy: '' }));
                  }
                }}
                error={formErrors.currentOccupancy}
                required
                min="0"
              />
            </div>
            <Select
              label="Type *"
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

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Contact Information</h4>
            <div className="space-y-4">
              <Input
                label="Contact Person *"
                placeholder="Full name"
                value={formData.contactPerson}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, contactPerson: e.target.value }));
                  if (formErrors.contactPerson) setFormErrors(prev => ({ ...prev, contactPerson: '' }));
                }}
                error={formErrors.contactPerson}
                required
              />
              <PhoneInput
                label="Contact Phone *"
                value={formData.contactPhone}
                onChange={(val) => {
                  setFormData(prev => ({ ...prev, contactPhone: val || '' }));
                  if (formErrors.contactPhone) setFormErrors(prev => ({ ...prev, contactPhone: '' }));
                }}
                error={formErrors.contactPhone}
                required
                placeholder="Enter phone number"
              />
              <Input
                label="Contact Email"
                type="email"
                placeholder="email@example.com"
                value={formData.contactEmail}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, contactEmail: e.target.value }));
                  if (formErrors.contactEmail) setFormErrors(prev => ({ ...prev, contactEmail: '' }));
                }}
                error={formErrors.contactEmail}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Additional Information</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Brief description of the shelter..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={1000}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">{formData.description.length}/1000 characters</p>
              </div>
              <Input
                label="Website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, website: e.target.value }));
                  if (formErrors.website) setFormErrors(prev => ({ ...prev, website: '' }));
                }}
                error={formErrors.website}
              />
              <Input
                label="Operating Hours"
                placeholder="e.g., 24/7 or 8 AM - 8 PM"
                value={formData.operatingHours}
                onChange={(e) => setFormData(prev => ({ ...prev, operatingHours: e.target.value }))}
              />
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Notes
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Additional notes or special instructions..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  maxLength={2000}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">{formData.notes.length}/2000 characters</p>
              </div>
            </div>
          </div>

          {/* Facilities */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Facilities Available *
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
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
            {!showCustomFacility ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCustomFacility(true)}
              >
                + Add Custom Facility
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter custom facility name"
                  value={customFacility}
                  onChange={(e) => setCustomFacility(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomFacility();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="gradient"
                  size="sm"
                  onClick={addCustomFacility}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowCustomFacility(false);
                    setCustomFacility('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
            {formData.facilities.length > 0 && (
              <div className="mt-3 p-3 bg-[var(--bg-input)] rounded-lg">
                <p className="text-xs text-[var(--text-muted)] mb-2">Selected Facilities:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.facilities.map((facility, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs rounded bg-[var(--primary-500)]/20 text-[var(--primary-500)] flex items-center gap-1"
                    >
                      {facility}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            facilities: prev.facilities.filter((_, idx) => idx !== i)
                          }));
                        }}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}>
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
