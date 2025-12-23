'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, StatCard, Button, Input, Badge, Modal, Select, Avatar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PhoneIcon,
  MapPinIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CalendarIcon,
  AcademicCapIcon,
  HeartIcon,
  TruckIcon,
  UserIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon, CheckBadgeIcon as CheckBadgeSolidIcon } from '@heroicons/react/24/solid';

interface Volunteer {
  _id: string;
  volunteerId: string;
  userId: { _id: string; name: string; email: string; phone?: string };
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  profileImage?: string;
  address?: { street?: string; city?: string; state?: string; zipCode?: string };
  skills: string[];
  specializations?: string[];
  languages?: string[];
  experience?: { years: number; description?: string };
  availability: string;
  availabilitySchedule?: { weekdays: boolean; weekends: boolean; nights: boolean; preferredShift?: string };
  preferredWorkAreas?: string[];
  willingToTravel?: boolean;
  maxTravelDistance?: number;
  rating: number;
  totalReviews?: number;
  completedMissions: number;
  totalHoursServed?: number;
  emergencyContact?: { name: string; phone: string; relation: string; email?: string };
  healthInfo?: { medicalConditions?: string[]; allergies?: string[]; physicallyFit?: boolean };
  hasOwnVehicle?: boolean;
  vehicleType?: string;
  status: string;
  verificationStatus?: string;
  joinedAt: string;
  createdAt: string;
}

export default function VolunteersPage() {
  const { token, hasPermission, user: currentUser } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState({
    // User account details
    name: '',
    email: '',
    phone: '',
    password: '',
    // Personal details
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: 'unknown',
    profileImage: '',
    // Address
    street: '',
    city: '',
    state: '',
    zipCode: '',
    // Skills
    skills: '',
    specializations: '',
    languages: '',
    experienceYears: '0',
    experienceDescription: '',
    // Availability
    availability: 'available',
    weekdays: true,
    weekends: true,
    nights: false,
    preferredShift: 'any',
    preferredWorkAreas: '',
    willingToTravel: true,
    maxTravelDistance: '50',
    // Emergency Contact
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    emergencyEmail: '',
    // Health
    medicalConditions: '',
    allergies: '',
    physicallyFit: true,
    // Vehicle
    hasOwnVehicle: false,
    vehicleType: 'none',
    // Status
    status: 'active',
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData({ ...formData, profileImage: base64 });
        setPhotoPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const canManage = hasPermission(['super_admin', 'admin']);

  const fetchVolunteers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (availabilityFilter !== 'all') params.append('availability', availabilityFilter);
      const response = await fetch(`/api/volunteers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setVolunteers(data.data.volunteers);
    } catch (error) {
      toast.error('Failed to fetch volunteers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchVolunteers();
  }, [token, search, availabilityFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedVolunteer ? `/api/volunteers?id=${selectedVolunteer._id}` : '/api/volunteers';
      const method = selectedVolunteer ? 'PUT' : 'POST';
      
      const body = {
        // User data (for creating new volunteer)
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        // Personal
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        profileImage: formData.profileImage,
        // Address - USA based
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: 'United States',
        },
        // Skills
        skills: (formData.skills || '').split(',').map(s => s.trim()).filter(Boolean),
        specializations: (formData.specializations || '').split(',').map(s => s.trim()).filter(Boolean),
        languages: (formData.languages || '').split(',').map(s => s.trim()).filter(Boolean),
        experience: {
          years: parseInt(formData.experienceYears) || 0,
          description: formData.experienceDescription,
        },
        // Availability
        availability: formData.availability,
        availabilitySchedule: {
          weekdays: formData.weekdays,
          weekends: formData.weekends,
          nights: formData.nights,
          preferredShift: formData.preferredShift,
        },
        preferredWorkAreas: (formData.preferredWorkAreas || '').split(',').map(s => s.trim()).filter(Boolean),
        willingToTravel: formData.willingToTravel,
        maxTravelDistance: parseInt(formData.maxTravelDistance) || 50,
        // Emergency Contact
        emergencyContact: {
          name: formData.emergencyName,
          phone: formData.emergencyPhone,
          relation: formData.emergencyRelation,
          email: formData.emergencyEmail,
        },
        // Health
        healthInfo: {
          medicalConditions: (formData.medicalConditions || '').split(',').map(s => s.trim()).filter(Boolean),
          allergies: (formData.allergies || '').split(',').map(s => s.trim()).filter(Boolean),
          physicallyFit: formData.physicallyFit,
        },
        // Vehicle
        hasOwnVehicle: formData.hasOwnVehicle,
        vehicleType: formData.vehicleType,
        // Status
        status: formData.status,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(selectedVolunteer ? 'Volunteer updated!' : 'Volunteer account created!');
        setShowModal(false);
        setSelectedVolunteer(null);
        resetForm();
        fetchVolunteers();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', email: '', phone: '', password: '',
      dateOfBirth: '', gender: 'male', bloodGroup: 'unknown', profileImage: '',
      street: '', city: '', state: '', zipCode: '',
      skills: '', specializations: '', languages: '',
      experienceYears: '0', experienceDescription: '',
      availability: 'available', weekdays: true, weekends: true, nights: false,
      preferredShift: 'any', preferredWorkAreas: '', willingToTravel: true, maxTravelDistance: '50',
      emergencyName: '', emergencyPhone: '', emergencyRelation: '', emergencyEmail: '',
      medicalConditions: '', allergies: '', physicallyFit: true,
      hasOwnVehicle: false, vehicleType: 'none', status: 'active',
    });
    setActiveTab('basic');
    setPhotoPreview(null);
  };

  const openEditModal = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setPhotoPreview(volunteer.profileImage || null);
    setFormData({
      name: volunteer.userId?.name || '',
      email: volunteer.userId?.email || '',
      phone: volunteer.userId?.phone || '',
      password: '',
      dateOfBirth: volunteer.dateOfBirth ? new Date(volunteer.dateOfBirth).toISOString().split('T')[0] : '',
      gender: volunteer.gender || 'male',
      bloodGroup: volunteer.bloodGroup || 'unknown',
      profileImage: volunteer.profileImage || '',
      street: volunteer.address?.street || '',
      city: volunteer.address?.city || '',
      state: volunteer.address?.state || '',
      zipCode: volunteer.address?.zipCode || '',
      skills: volunteer.skills?.join(', ') || '',
      specializations: volunteer.specializations?.join(', ') || '',
      languages: volunteer.languages?.join(', ') || '',
      experienceYears: volunteer.experience?.years?.toString() || '0',
      experienceDescription: volunteer.experience?.description || '',
      availability: volunteer.availability || 'available',
      weekdays: volunteer.availabilitySchedule?.weekdays ?? true,
      weekends: volunteer.availabilitySchedule?.weekends ?? true,
      nights: volunteer.availabilitySchedule?.nights ?? false,
      preferredShift: volunteer.availabilitySchedule?.preferredShift || 'any',
      preferredWorkAreas: volunteer.preferredWorkAreas?.join(', ') || '',
      willingToTravel: volunteer.willingToTravel ?? true,
      maxTravelDistance: volunteer.maxTravelDistance?.toString() || '50',
      emergencyName: volunteer.emergencyContact?.name || '',
      emergencyPhone: volunteer.emergencyContact?.phone || '',
      emergencyRelation: volunteer.emergencyContact?.relation || '',
      emergencyEmail: volunteer.emergencyContact?.email || '',
      medicalConditions: volunteer.healthInfo?.medicalConditions?.join(', ') || '',
      allergies: volunteer.healthInfo?.allergies?.join(', ') || '',
      physicallyFit: volunteer.healthInfo?.physicallyFit ?? true,
      hasOwnVehicle: volunteer.hasOwnVehicle || false,
      vehicleType: volunteer.vehicleType || 'none',
      status: volunteer.status || 'active',
    });
    setShowModal(true);
  };

  const openDetailModal = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setShowDetailModal(true);
  };

  const stats = {
    total: volunteers.length,
    available: volunteers.filter(v => v.availability === 'available').length,
    onMission: volunteers.filter(v => v.availability === 'on_mission').length,
    avgRating: volunteers.length > 0 ? (volunteers.reduce((acc, v) => acc + v.rating, 0) / volunteers.length).toFixed(1) : '0.0'
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        i < Math.floor(rating)
          ? <StarSolidIcon key={i} className="w-4 h-4 text-amber-400" />
          : <StarIcon key={i} className="w-4 h-4 text-[var(--border-color)]" />
      ))}
      <span className="ml-1.5 text-sm font-medium text-[var(--text-secondary)]">{rating.toFixed(1)}</span>
    </div>
  );

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: UserIcon },
    { id: 'skills', label: 'Skills & Experience', icon: AcademicCapIcon },
    { id: 'availability', label: 'Availability', icon: CalendarIcon },
    { id: 'emergency', label: 'Emergency & Health', icon: HeartIcon },
    { id: 'vehicle', label: 'Vehicle & Status', icon: TruckIcon },
  ];

  return (
    <DashboardLayout title="Volunteers" subtitle="Manage volunteer activities and registrations">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Volunteers" value={stats.total} icon={<UserGroupIcon className="w-6 h-6" />} variant="purple" />
        <StatCard title="Available" value={stats.available} icon={<CheckCircleIcon className="w-6 h-6" />} variant="green" />
        <StatCard title="On Mission" value={stats.onMission} icon={<ClockIcon className="w-6 h-6" />} variant="orange" />
        <StatCard title="Avg Rating" value={stats.avgRating} icon={<StarIcon className="w-6 h-6" />} variant="teal" />
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1">
            <Input
              placeholder="Search by name, ID, skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            />
          </div>
          <div className="flex items-center gap-4">
            <Select value={availabilityFilter} onChange={(value) => setAvailabilityFilter(value)} options={[
              { value: 'all', label: 'All Status' },
              { value: 'available', label: '🟢 Available' },
              { value: 'on_mission', label: '🟠 On Mission' },
              { value: 'unavailable', label: '🔴 Unavailable' },
              { value: 'on_leave', label: '⚪ On Leave' }
            ]} />
            {canManage && (
              <Button onClick={() => { setSelectedVolunteer(null); resetForm(); setShowModal(true); }} leftIcon={<PlusIcon className="w-4 h-4" />} variant="gradient">
                Register Volunteer
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Volunteers List View */}
      <Card>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 border-b border-[var(--border-color)] last:border-b-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--bg-input)] rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--bg-input)] rounded w-1/4" />
                    <div className="h-3 bg-[var(--bg-input)] rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : volunteers.length === 0 ? (
          <div className="text-center py-20">
            <UserGroupIcon className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-secondary)] text-lg">No volunteers found</p>
            <p className="text-[var(--text-muted)] text-sm mt-2">Try adjusting your filters or register a new volunteer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-input)]">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Volunteer</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">ID</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Contact</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Location</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Skills</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Stats</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {volunteers.map((volunteer) => (
                  <tr 
                    key={volunteer._id} 
                    className="hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
                    onClick={() => openDetailModal(volunteer)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={volunteer.userId?.name || 'Unknown'} size="md" src={volunteer.profileImage} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[var(--text-primary)]">{volunteer.userId?.name || 'Unknown'}</span>
                            {volunteer.verificationStatus === 'verified' && (
                              <CheckBadgeSolidIcon className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">{volunteer.gender || 'N/A'} • {volunteer.bloodGroup || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs font-bold text-[var(--primary-500)] bg-[var(--primary-500)]/10 px-2 py-1 rounded">
                        {volunteer.volunteerId}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                          <EnvelopeIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span className="truncate max-w-[150px]">{volunteer.userId?.email || 'N/A'}</span>
                        </p>
                        <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5">
                          <PhoneIcon className="w-3.5 h-3.5" />
                          {volunteer.userId?.phone || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-[var(--text-primary)]">
                        {volunteer.address?.city || 'N/A'}, {volunteer.address?.state || ''}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {volunteer.address?.zipCode || ''}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {volunteer.skills?.slice(0, 2).map((skill, i) => (
                          <Badge key={i} variant="primary" size="sm">{skill}</Badge>
                        ))}
                        {volunteer.skills?.length > 2 && (
                          <Badge variant="default" size="sm">+{volunteer.skills.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {renderStars(volunteer.rating)}
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {volunteer.completedMissions || 0} missions • {volunteer.totalHoursServed || 0}h
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge 
                        variant={volunteer.availability === 'available' ? 'success' : volunteer.availability === 'on_mission' ? 'warning' : 'default'} 
                        size="sm"
                        dot
                      >
                        {volunteer.availability?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openDetailModal(volunteer); }}
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--info)] hover:bg-[var(--info)]/10 transition-colors"
                          title="View Details"
                        >
                          <UserIcon className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(volunteer); }}
                            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--warning)] hover:bg-[var(--warning)]/10 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedVolunteer ? 'Edit Volunteer' : 'Register New Volunteer'} size="xl">
        <form onSubmit={handleSubmit}>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--primary-500)] text-white shadow-lg'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* Profile Photo Upload */}
                <div className="p-5 bg-gradient-to-br from-pink-500/5 to-pink-600/10 rounded-2xl border border-pink-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-pink-500 mb-4 flex items-center gap-2">
                    <UserIcon className="w-5 h-5" /> Profile Photo
                  </h4>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {photoPreview ? (
                        <img 
                          src={photoPreview} 
                          alt="Profile preview" 
                          className="w-24 h-24 rounded-full object-cover border-4 border-[var(--border-color)]"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-[var(--bg-input)] flex items-center justify-center border-4 border-[var(--border-color)]">
                          <UserIcon className="w-10 h-10 text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="cursor-pointer">
                        <span className="px-4 py-2 bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white rounded-xl text-sm font-medium transition-colors">
                          Upload Photo
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-[var(--text-muted)] mt-2">JPG, PNG or GIF. Max 2MB</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/10 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-blue-500 mb-4 flex items-center gap-2">
                    <EnvelopeIcon className="w-5 h-5" /> Account Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Full Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required icon={<UserIcon className="w-5 h-5" />} placeholder="John Smith" />
                    <Input label="Email *" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required icon={<EnvelopeIcon className="w-5 h-5" />} placeholder="john.smith@example.com" />
                    <Input label="Phone *" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required icon={<PhoneIcon className="w-5 h-5" />} placeholder="(555) 123-4567" />
                    {!selectedVolunteer && (
                      <Input label="Password *" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required placeholder="Min 6 characters" />
                    )}
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-purple-500/5 to-purple-600/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-purple-500 mb-4 flex items-center gap-2">
                    <IdentificationIcon className="w-5 h-5" /> Personal Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Input label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                    <Select label="Gender" value={formData.gender} onChange={(value) => setFormData({ ...formData, gender: value })} options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' },
                      { value: 'prefer_not_to_say', label: 'Prefer not to say' }
                    ]} />
                    <Select label="Blood Group" value={formData.bloodGroup} onChange={(value) => setFormData({ ...formData, bloodGroup: value })} options={[
                      { value: 'unknown', label: 'Unknown' },
                      { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
                      { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
                      { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
                      { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }
                    ]} />
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-emerald-500 mb-4 flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5" /> Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Street Address" value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} className="md:col-span-2" placeholder="123 Main Street" />
                    <Input label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} icon={<MapPinIcon className="w-5 h-5" />} placeholder="New York" />
                    <Input label="State" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="NY" />
                    <Input label="ZIP Code" value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} placeholder="10001" />
                  </div>
                </div>
              </div>
            )}

            {/* Skills Tab */}
            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div className="p-5 bg-gradient-to-br from-amber-500/5 to-amber-600/10 rounded-2xl border border-amber-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-amber-500 mb-4 flex items-center gap-2">
                    <AcademicCapIcon className="w-5 h-5" /> Skills & Expertise
                  </h4>
                  <Input label="Skills (comma separated)" value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} placeholder="First Aid, Rescue, Medical, Driving" helperText="Enter all skills separated by commas" />
                  <div className="mt-5">
                    <Input label="Specializations (comma separated)" value={formData.specializations} onChange={(e) => setFormData({ ...formData, specializations: e.target.value })} placeholder="Emergency Response, Water Rescue, Fire Fighting" />
                  </div>
                  <div className="mt-5">
                    <Input label="Languages Known (comma separated)" value={formData.languages} onChange={(e) => setFormData({ ...formData, languages: e.target.value })} placeholder="English, Spanish" />
                  </div>
                </div>
                
                <div className="p-5 bg-gradient-to-br from-teal-500/5 to-teal-600/10 rounded-2xl border border-teal-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-teal-500 mb-4 flex items-center gap-2">
                    <StarIcon className="w-5 h-5" /> Experience
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Years of Experience" type="number" value={formData.experienceYears} onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })} placeholder="5" />
                  </div>
                  <div className="mt-5">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Experience Description</label>
                    <textarea
                      value={formData.experienceDescription}
                      onChange={(e) => setFormData({ ...formData, experienceDescription: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3.5 bg-[var(--bg-input)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--primary-500)] focus:ring-4 focus:ring-[var(--primary-500)]/20 transition-all resize-none"
                      placeholder="Describe your relevant experience..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <div className="space-y-6">
                <div className="p-5 bg-gradient-to-br from-green-500/5 to-green-600/10 rounded-2xl border border-green-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-green-500 mb-4 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5" /> Schedule
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Select label="Current Availability" value={formData.availability} onChange={(value) => setFormData({ ...formData, availability: value })} options={[
                      { value: 'available', label: '🟢 Available' },
                      { value: 'on_mission', label: '🟠 On Mission' },
                      { value: 'unavailable', label: '🔴 Unavailable' },
                      { value: 'on_leave', label: '⚪ On Leave' }
                    ]} />
                    <Select label="Preferred Shift" value={formData.preferredShift} onChange={(value) => setFormData({ ...formData, preferredShift: value })} options={[
                      { value: 'any', label: 'Any Time' },
                      { value: 'morning', label: 'Morning (6AM - 12PM)' },
                      { value: 'afternoon', label: 'Afternoon (12PM - 6PM)' },
                      { value: 'evening', label: 'Evening (6PM - 12AM)' },
                      { value: 'night', label: 'Night (12AM - 6AM)' }
                    ]} />
                  </div>

                  <div className="mt-5">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Available Days</label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { key: 'weekdays', label: 'Weekdays' },
                        { key: 'weekends', label: 'Weekends' },
                        { key: 'nights', label: 'Night Shifts' }
                      ].map((day) => (
                        <label key={day.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData[day.key as keyof typeof formData] as boolean}
                            onChange={(e) => setFormData({ ...formData, [day.key]: e.target.checked })}
                            className="w-5 h-5 rounded-lg border-2 border-[var(--border-color)] text-[var(--primary-500)] focus:ring-[var(--primary-500)]"
                          />
                          <span className="text-[var(--text-secondary)]">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-indigo-500/5 to-indigo-600/10 rounded-2xl border border-indigo-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-indigo-500 mb-4 flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5" /> Location Preferences
                  </h4>
                  <Input label="Preferred Work Areas (comma separated)" value={formData.preferredWorkAreas} onChange={(e) => setFormData({ ...formData, preferredWorkAreas: e.target.value })} placeholder="Manhattan, Brooklyn, Queens" icon={<MapPinIcon className="w-5 h-5" />} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.willingToTravel}
                        onChange={(e) => setFormData({ ...formData, willingToTravel: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-2 border-[var(--border-color)] text-[var(--primary-500)] focus:ring-[var(--primary-500)]"
                      />
                      <span className="text-[var(--text-secondary)]">Willing to Travel</span>
                    </label>
                    <Input label="Max Travel Distance (miles)" type="number" value={formData.maxTravelDistance} onChange={(e) => setFormData({ ...formData, maxTravelDistance: e.target.value })} placeholder="50" />
                  </div>
                </div>
              </div>
            )}

            {/* Emergency & Health Tab */}
            {activeTab === 'emergency' && (
              <div className="space-y-6">
                <div className="p-5 bg-gradient-to-br from-red-500/5 to-red-600/10 rounded-2xl border border-red-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-red-500 mb-4 flex items-center gap-2">
                    <PhoneIcon className="w-5 h-5" /> Emergency Contact
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Contact Name" value={formData.emergencyName} onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })} icon={<UserIcon className="w-5 h-5" />} placeholder="Jane Smith" />
                    <Input label="Contact Phone" value={formData.emergencyPhone} onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })} icon={<PhoneIcon className="w-5 h-5" />} placeholder="(555) 987-6543" />
                    <Input label="Relationship" value={formData.emergencyRelation} onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })} placeholder="Spouse, Parent, Sibling, etc." />
                    <Input label="Contact Email" type="email" value={formData.emergencyEmail} onChange={(e) => setFormData({ ...formData, emergencyEmail: e.target.value })} icon={<EnvelopeIcon className="w-5 h-5" />} placeholder="jane.smith@example.com" />
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-rose-500/5 to-rose-600/10 rounded-2xl border border-rose-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-rose-500 mb-4 flex items-center gap-2">
                    <HeartIcon className="w-5 h-5" /> Health Information
                  </h4>
                  <Input label="Medical Conditions (comma separated)" value={formData.medicalConditions} onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })} placeholder="Leave blank if none" />
                  <div className="mt-5">
                    <Input label="Allergies (comma separated)" value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} placeholder="Leave blank if none" />
                  </div>
                  <div className="mt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.physicallyFit}
                        onChange={(e) => setFormData({ ...formData, physicallyFit: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-2 border-[var(--border-color)] text-[var(--primary-500)] focus:ring-[var(--primary-500)]"
                      />
                      <span className="text-[var(--text-secondary)]">Physically fit for field work</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle & Status Tab */}
            {activeTab === 'vehicle' && (
              <div className="space-y-6">
                <div className="p-5 bg-gradient-to-br from-cyan-500/5 to-cyan-600/10 rounded-2xl border border-cyan-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-cyan-500 mb-4 flex items-center gap-2">
                    <TruckIcon className="w-5 h-5" /> Vehicle Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasOwnVehicle}
                        onChange={(e) => setFormData({ ...formData, hasOwnVehicle: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-2 border-[var(--border-color)] text-[var(--primary-500)] focus:ring-[var(--primary-500)]"
                      />
                      <span className="text-[var(--text-secondary)]">Has Own Vehicle</span>
                    </label>
                    {formData.hasOwnVehicle && (
                      <Select label="Vehicle Type" value={formData.vehicleType} onChange={(value) => setFormData({ ...formData, vehicleType: value })} options={[
                        { value: 'none', label: 'None' },
                        { value: 'motorcycle', label: 'Motorcycle' },
                        { value: 'car', label: 'Car' },
                        { value: 'suv', label: 'SUV' },
                        { value: 'truck', label: 'Truck' },
                        { value: 'van', label: 'Van' }
                      ]} />
                    )}
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-[var(--primary-500)]/5 to-[var(--primary-600)]/10 rounded-2xl border border-[var(--primary-500)]/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-[var(--primary-500)] mb-4 flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5" /> Account Status
                  </h4>
                  <Select label="Status" value={formData.status} onChange={(value) => setFormData({ ...formData, status: value })} options={[
                    { value: 'active', label: '🟢 Active' },
                    { value: 'inactive', label: '⚪ Inactive' },
                    { value: 'suspended', label: '🔴 Suspended' },
                    { value: 'pending_verification', label: '🟡 Pending Verification' }
                  ]} />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="gradient">{selectedVolunteer ? 'Update Volunteer' : 'Create Account'}</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Volunteer Details" size="lg">
        {selectedVolunteer && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-5 p-5 bg-gradient-to-r from-[var(--primary-500)]/10 to-[var(--primary-700)]/10 rounded-2xl">
              <Avatar name={selectedVolunteer.userId?.name || 'Unknown'} size="xl" src={selectedVolunteer.profileImage} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedVolunteer.userId?.name}</h3>
                  {selectedVolunteer.verificationStatus === 'verified' && (
                    <CheckBadgeSolidIcon className="w-6 h-6 text-blue-500" />
                  )}
                </div>
                <p className="text-[var(--primary-500)] font-mono font-bold">ID: {selectedVolunteer.volunteerId}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant={selectedVolunteer.availability === 'available' ? 'success' : 'warning'} size="sm" dot>
                    {selectedVolunteer.availability?.replace('_', ' ')}
                  </Badge>
                  {renderStars(selectedVolunteer.rating)}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-5">
              <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-xl">
                <PhoneIcon className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Phone</p>
                  <p className="font-medium text-[var(--text-primary)]">{selectedVolunteer.userId?.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-xl">
                <EnvelopeIcon className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Email</p>
                  <p className="font-medium text-[var(--text-primary)] truncate">{selectedVolunteer.userId?.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-xl">
                <MapPinIcon className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Location</p>
                  <p className="font-medium text-[var(--text-primary)]">{selectedVolunteer.address?.city || 'N/A'}, {selectedVolunteer.address?.state || ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-xl">
                <CalendarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Joined</p>
                  <p className="font-medium text-[var(--text-primary)]">{new Date(selectedVolunteer.joinedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-[var(--bg-input)] rounded-xl">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedVolunteer.completedMissions || 0}</p>
                <p className="text-xs text-[var(--text-muted)]">Missions</p>
              </div>
              <div className="text-center p-4 bg-[var(--bg-input)] rounded-xl">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedVolunteer.totalHoursServed || 0}h</p>
                <p className="text-xs text-[var(--text-muted)]">Hours Served</p>
              </div>
              <div className="text-center p-4 bg-[var(--bg-input)] rounded-xl">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedVolunteer.rating?.toFixed(1) || '0.0'}</p>
                <p className="text-xs text-[var(--text-muted)]">Rating</p>
              </div>
              <div className="text-center p-4 bg-[var(--bg-input)] rounded-xl">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedVolunteer.totalReviews || 0}</p>
                <p className="text-xs text-[var(--text-muted)]">Reviews</p>
              </div>
            </div>

            {/* Skills */}
            {selectedVolunteer.skills?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedVolunteer.skills.map((skill, i) => (
                    <Badge key={i} variant="primary" size="sm">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {selectedVolunteer.emergencyContact?.name && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <h4 className="text-sm font-semibold text-red-400 mb-2">Emergency Contact</h4>
                <p className="text-[var(--text-primary)]">{selectedVolunteer.emergencyContact.name} ({selectedVolunteer.emergencyContact.relation})</p>
                <p className="text-[var(--text-muted)]">{selectedVolunteer.emergencyContact.phone}</p>
              </div>
            )}

            {canManage && (
              <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border-color)]">
                <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
                <Button variant="gradient" onClick={() => { setShowDetailModal(false); openEditModal(selectedVolunteer); }}>
                  <PencilIcon className="w-4 h-4 mr-2" /> Edit
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
