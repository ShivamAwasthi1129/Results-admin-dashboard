'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, StatCard, Button, Input, Badge, Modal, Select, Avatar } from '@/components/ui';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  UsersIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import { US_STATES, BLOOD_GROUPS, GENDER_OPTIONS, RELATION_OPTIONS, USER_ROLES, USER_STATUS } from '@/lib/constants/usa';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  name?: string; // For backward compatibility
  email: string;
  phone?: string;
  role: string;
  status: string;
  createdAt: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  ssnNumber?: string;
  aadharNumber?: string;
  driversLicense?: {
    number?: string;
    state?: string;
    expiryDate?: string;
  };
  emergencyContact?: {
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    relation?: string;
  };
  address?: {
    street?: string;
    apartment?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export default function UsersPage() {
  const { token, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '', 
    phone: '', 
    password: '', 
    confirmPassword: '',
    role: 'admin', 
    status: 'active',
    profilePhoto: '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    dateOfBirth: '',
    gender: '',
    emergencyFirstName: '',
    emergencyLastName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    ssnNumber: '',
    bloodGroup: '',
    driversLicenseNumber: '',
    driversLicenseState: '',
    driversLicenseExpiry: '',
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const canManageUsers = hasPermission(['super_admin', 'admin']);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      const response = await fetch(`/api/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setUsers(data.data.users);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token, search, roleFilter]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData({ ...formData, profilePhoto: base64 });
        setPhotoPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password match for new users
    if (!selectedUser) {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }
    
    try {
      const url = selectedUser ? `/api/users?id=${selectedUser._id}` : '/api/users';
      const method = selectedUser ? 'PUT' : 'POST';
      
      const requestBody = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        status: formData.status,
        profilePhoto: formData.profilePhoto,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        ssnNumber: formData.ssnNumber,
        driversLicense: {
          number: formData.driversLicenseNumber,
          state: formData.driversLicenseState,
          expiryDate: formData.driversLicenseExpiry || undefined,
        },
        emergencyContact: {
          firstName: formData.emergencyFirstName,
          lastName: formData.emergencyLastName,
          phone: formData.emergencyPhone,
          relation: formData.emergencyRelation,
        },
        address: {
          street: formData.street,
          apartment: formData.apartment,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: 'United States',
        },
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      if (data.success) {
        toast.success(selectedUser ? 'User updated!' : 'User created!');
        setShowModal(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`/api/users?id=${selectedUser._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('User deleted!');
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', role: 'admin', status: 'active',
      profilePhoto: '', street: '', apartment: '', city: '', state: '', zipCode: '', dateOfBirth: '', gender: '',
      emergencyFirstName: '', emergencyLastName: '', emergencyPhone: '', emergencyRelation: '',
      ssnNumber: '', bloodGroup: '',
      driversLicenseNumber: '', driversLicenseState: '', driversLicenseExpiry: '',
    });
    setPhotoPreview(null);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    // Handle backward compatibility for name field
    let firstName = user.firstName || '';
    let lastName = user.lastName || '';
    if (!firstName && !lastName && user.name) {
      const nameParts = user.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    setFormData({
      firstName,
      lastName,
      email: user.email, 
      phone: user.phone || '',
      password: '', 
      confirmPassword: '',
      role: user.role, 
      status: user.status,
      profilePhoto: user.profilePhoto || '',
      street: user.address?.street || '', 
      apartment: user.address?.apartment || '', 
      city: user.address?.city || '', 
      state: user.address?.state || '', 
      zipCode: user.address?.zipCode || '', 
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '', 
      gender: user.gender || '',
      emergencyFirstName: user.emergencyContact?.firstName || '',
      emergencyLastName: user.emergencyContact?.lastName || '',
      emergencyPhone: user.emergencyContact?.phone || '',
      emergencyRelation: user.emergencyContact?.relation || '',
      ssnNumber: user.ssnNumber || '', 
      bloodGroup: user.bloodGroup || '',
      driversLicenseNumber: user.driversLicense?.number || '',
      driversLicenseState: user.driversLicense?.state || '',
      driversLicenseExpiry: user.driversLicense?.expiryDate ? new Date(user.driversLicense.expiryDate).toISOString().split('T')[0] : '',
    });
    setPhotoPreview(user.profilePhoto || null);
    setShowModal(true);
  };

  // Helper to get display name
  const getDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.name || 'Unknown';
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    superAdmins: users.filter(u => u.role === 'super_admin').length,
  };

  const roleConfig: Record<string, { color: string; bg: string; icon: JSX.Element }> = {
    super_admin: { color: 'text-[var(--danger)]', bg: 'bg-[var(--danger)]/20', icon: <ShieldCheckIcon className="w-4 h-4" /> },
    admin: { color: 'text-[var(--info)]', bg: 'bg-[var(--info)]/20', icon: <ShieldCheckIcon className="w-4 h-4" /> },
    volunteer: { color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/20', icon: <UserGroupIcon className="w-4 h-4" /> },
    service_provider: { color: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/20', icon: <WrenchScrewdriverIcon className="w-4 h-4" /> }
  };

  return (
    <DashboardLayout title="Users" subtitle="Manage all users in the system">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Users" value={stats.total} icon={<UsersIcon className="w-6 h-6" />} variant="purple" />
        <StatCard title="Admins" value={stats.admins} icon={<ShieldCheckIcon className="w-6 h-6" />} variant="blue" />
        <StatCard title="Super Admins" value={stats.superAdmins} icon={<ShieldCheckIcon className="w-6 h-6" />} variant="red" />
      </div>

      {/* Filters */}
      <Card padding="lg" className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1">
            <Input
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            />
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'super_admin', label: 'Super Admin' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
            {canManageUsers && (
              <Button 
                onClick={() => { setSelectedUser(null); resetForm(); setShowModal(true); }} 
                leftIcon={<PlusIcon className="w-4 h-4" />} 
                variant="gradient"
              >
                Add User
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Joined</th>
                <th className="text-right px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 skeleton rounded-full" />
                        <div className="space-y-2">
                          <div className="h-4 skeleton rounded w-32" />
                          <div className="h-3 skeleton rounded w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-7 skeleton rounded-full w-24" /></td>
                    <td className="px-6 py-5"><div className="h-7 skeleton rounded-full w-20" /></td>
                    <td className="px-6 py-5"><div className="h-4 skeleton rounded w-24" /></td>
                    <td className="px-6 py-5"><div className="h-9 skeleton rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <UsersIcon className="w-14 h-14 mx-auto text-[var(--text-muted)] mb-4" />
                    <p className="text-[var(--text-secondary)] text-lg">No users found</p>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="border-b border-[var(--border-color)] table-row transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar name={getDisplayName(user)} size="md" src={user.profilePhoto} />
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{getDisplayName(user)}</p>
                          <p className="text-sm text-[var(--text-muted)] mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${roleConfig[user.role]?.bg} ${roleConfig[user.role]?.color}`}>
                        {roleConfig[user.role]?.icon}
                        <span className="capitalize">{user.role.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant={user.status === 'active' ? 'success' : 'secondary'} dot>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-sm text-[var(--text-muted)]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5">
                      {canManageUsers && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(user)} 
                            className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--info)] hover:bg-[var(--info)]/10 transition-colors"
                            title="Edit User"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {user.role !== 'super_admin' && (
                            <button 
                              onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }} 
                              className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                              title="Delete User"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedUser ? 'Edit User' : 'Add New User'} size="lg">
        <form onSubmit={handleSubmit} className="max-h-[65vh] overflow-y-auto pr-2 space-y-6">
          {/* Profile Photo */}
          <div className="p-5 bg-gradient-to-br from-pink-500/5 to-pink-600/10 rounded-2xl border border-pink-500/20 backdrop-blur-sm">
            <h4 className="text-sm font-semibold text-pink-500 mb-4 flex items-center gap-2">
              <UsersIcon className="w-5 h-5" /> Profile Photo
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
                    <UsersIcon className="w-10 h-10 text-[var(--text-muted)]" />
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

          {/* Basic Info */}
          <div className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/10 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
            <h4 className="text-sm font-semibold text-blue-500 mb-4 flex items-center gap-2">
              <UsersIcon className="w-5 h-5" /> Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input 
                label="First Name *" 
                value={formData.firstName} 
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} 
                icon={<UsersIcon className="w-5 h-5" />}
                placeholder="John"
                required 
              />
              <Input 
                label="Last Name *" 
                value={formData.lastName} 
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} 
                icon={<UsersIcon className="w-5 h-5" />}
                placeholder="Smith"
                required 
              />
              <Input 
                label="Email *" 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                icon={<EnvelopeIcon className="w-5 h-5" />}
                placeholder="john.smith@example.com"
                required 
                disabled={!!selectedUser}
              />
              <PhoneInput 
                label="Phone" 
                value={formData.phone} 
                onChange={(val) => setFormData({ ...formData, phone: val })} 
                placeholder="(555) 123-4567"
              />
              <Input 
                label="Date of Birth" 
                type="date" 
                value={formData.dateOfBirth} 
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} 
                icon={<CalendarDaysIcon className="w-5 h-5" />}
              />
              <Select 
                label="Gender" 
                value={formData.gender} 
                onChange={(val) => setFormData({ ...formData, gender: val })} 
                options={GENDER_OPTIONS} 
              />
              <Select 
                label="Blood Group" 
                value={formData.bloodGroup} 
                onChange={(val) => setFormData({ ...formData, bloodGroup: val })} 
                options={BLOOD_GROUPS} 
              />
            </div>
          </div>

          {/* Address Info */}
          <div className="p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
            <h4 className="text-sm font-semibold text-emerald-500 mb-4 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5" /> Address Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Input 
                  label="Street Address" 
                  value={formData.street} 
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })} 
                  icon={<MapPinIcon className="w-5 h-5" />}
                  placeholder="123 Main Street"
                />
              </div>
              <Input 
                label="Apt / Suite / Unit" 
                value={formData.apartment} 
                onChange={(e) => setFormData({ ...formData, apartment: e.target.value })} 
                placeholder="Apt 4B"
              />
              <Input 
                label="City" 
                value={formData.city} 
                onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                placeholder="New York"
              />
              <Select 
                label="State" 
                value={formData.state} 
                onChange={(val) => setFormData({ ...formData, state: val })} 
                options={[{ value: '', label: 'Select State' }, ...US_STATES]} 
              />
              <Input 
                label="ZIP Code" 
                value={formData.zipCode} 
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} 
                placeholder="10001"
              />
            </div>
          </div>

          {/* Emergency Contact Info */}
          <div className="p-5 bg-gradient-to-br from-orange-500/5 to-orange-600/10 rounded-2xl border border-orange-500/20 backdrop-blur-sm">
            <h4 className="text-sm font-semibold text-orange-500 mb-4 flex items-center gap-2">
              <PhoneIcon className="w-5 h-5" /> Emergency Contact
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input 
                label="First Name" 
                value={formData.emergencyFirstName} 
                onChange={(e) => setFormData({ ...formData, emergencyFirstName: e.target.value })} 
                icon={<UsersIcon className="w-5 h-5" />}
                placeholder="Jane"
              />
              <Input 
                label="Last Name" 
                value={formData.emergencyLastName} 
                onChange={(e) => setFormData({ ...formData, emergencyLastName: e.target.value })} 
                icon={<UsersIcon className="w-5 h-5" />}
                placeholder="Smith"
              />
              <PhoneInput 
                label="Phone" 
                value={formData.emergencyPhone} 
                onChange={(val) => setFormData({ ...formData, emergencyPhone: val })} 
                placeholder="(555) 987-6543"
              />
              <Select 
                label="Relation" 
                value={formData.emergencyRelation} 
                onChange={(val) => setFormData({ ...formData, emergencyRelation: val })} 
                options={RELATION_OPTIONS}
              />
            </div>
          </div>

          {/* ID Info */}
          <div className="p-5 bg-gradient-to-br from-purple-500/5 to-purple-600/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
            <h4 className="text-sm font-semibold text-purple-500 mb-4 flex items-center gap-2">
              <IdentificationIcon className="w-5 h-5" /> Identification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input 
                label="SSN (Last 4 digits)" 
                value={formData.ssnNumber} 
                onChange={(e) => setFormData({ ...formData, ssnNumber: e.target.value })} 
                icon={<IdentificationIcon className="w-5 h-5" />}
                placeholder="XXXX"
                maxLength={4}
              />
              <Input 
                label="Driver's License #" 
                value={formData.driversLicenseNumber} 
                onChange={(e) => setFormData({ ...formData, driversLicenseNumber: e.target.value })} 
                icon={<IdentificationIcon className="w-5 h-5" />}
                placeholder="DL123456789"
              />
              <Select 
                label="DL State" 
                value={formData.driversLicenseState} 
                onChange={(val) => setFormData({ ...formData, driversLicenseState: val })} 
                options={[{ value: '', label: 'Select State' }, ...US_STATES]} 
              />
            </div>
          </div>

          {/* Role & Password */}
          <div className="p-5 bg-gradient-to-br from-[var(--primary-500)]/5 to-[var(--primary-600)]/10 rounded-2xl border border-[var(--primary-500)]/20 backdrop-blur-sm">
            <h4 className="text-sm font-semibold text-[var(--primary-500)] mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5" /> Account Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Select 
                label="Role" 
                value={formData.role} 
                onChange={(val) => setFormData({ ...formData, role: val })} 
                options={[
                  { value: 'admin', label: 'Admin' },
                  { value: 'super_admin', label: 'Super Admin' },
                ]} 
              />
              <Select 
                label="Status" 
                value={formData.status} 
                onChange={(val) => setFormData({ ...formData, status: val })} 
                options={USER_STATUS} 
              />
              {!selectedUser && (
                <>
                  <Input 
                    label="Password *" 
                    type="password" 
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    required
                    placeholder="Min 6 characters"
                  />
                  <Input 
                    label="Confirm Password *" 
                    type="password" 
                    value={formData.confirmPassword} 
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
                    required
                    placeholder="Re-enter password"
                  />
                </>
              )}
              {selectedUser && (
                <Input 
                  label="New Password (optional)" 
                  type="password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  placeholder="Leave blank to keep current"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="gradient">{selectedUser ? 'Update' : 'Create'} User</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete User" size="sm">
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--danger)]/20 flex items-center justify-center mb-5">
            <TrashIcon className="w-8 h-8 text-[var(--danger)]" />
          </div>
          <p className="text-[var(--text-muted)] mb-2">Are you sure you want to delete</p>
          <p className="font-semibold text-[var(--text-primary)] text-lg">{selectedUser ? getDisplayName(selectedUser) : ''}?</p>
        </div>
        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
