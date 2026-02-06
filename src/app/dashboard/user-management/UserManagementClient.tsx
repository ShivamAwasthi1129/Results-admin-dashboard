'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Input, Select, Modal } from '@/components/ui';
import { toast } from 'react-toastify';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  TableCellsIcon,
  GlobeAltIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

// Dynamic import for maps to avoid SSR issues
const DynamicUserMap = dynamic(() => import('@/components/user-management/UserMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center bg-[var(--bg-input)] rounded-lg"><div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
});

const DynamicAllUsersMap = dynamic(() => import('@/components/user-management/AllUsersMap'), {
  ssr: false,
  loading: () => <div className="h-[600px] flex items-center justify-center bg-[var(--bg-input)] rounded-lg"><div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
});

export interface User {
  id: string;
  _id?: string;
  phoneNumber: string;
  email: string | null;
  username: string | null;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  profilePictureUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  pincode: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bloodGroup: string | null;
  medicalConditions: string | null;
  authProvider: string;
  providerId: string | null;
  isVerified: boolean;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  planLimit: number;
  isSubscriber: boolean;
  role: string;
  roleAssignedBy: string | null;
  roleAssignedAt: string | null;
  lastLoginAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  adminGroups: any[];
  memberGroups: any[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: Pagination;
  };
  error?: string;
}

interface UserManagementClientProps {
  initialData: ApiResponse;
}

export default function UserManagementClient({ initialData }: UserManagementClientProps) {
  const [userLocations, setUserLocations] = useState<Record<string, { latitude: number; longitude: number; accuracy?: number; lastUpdatedAt?: string; isActive?: boolean }>>({});
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [users, setUsers] = useState<User[]>(initialData.data?.users || []);
  const [pagination, setPagination] = useState<Pagination>(initialData.data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(!initialData.success || initialData.data?.users?.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'map'>('table');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapUser, setMapUser] = useState<User | null>(null);
  const [showUserPath, setShowUserPath] = useState(false);
  const [showAllPaths, setShowAllPaths] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setIsInitialLoading(true);
    try {
      const response = await fetch('/api/users?limit=1000', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.data?.users || []);
        const total = data.data?.pagination?.total || (data.data?.users?.length || 0);
        setPagination({
          page: data.data?.pagination?.page || 1,
          limit: data.data?.pagination?.limit || 20,
          total: total,
          pages: Math.ceil(total / (data.data?.pagination?.limit || 20)),
        });
      } else {
        toast.error(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  };
  
  // Fetch user locations from tracking API
  const fetchUserLocations = async () => {
    setIsLoadingLocations(true);
    try {
      const response = await fetch('/api/tracking/location/all', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch user locations, using fallback coordinates');
        return;
      }

      const data = await response.json();
      if (data.success && data.data && data.data.users) {
        // Create a map of userId -> location
        const locationMap: Record<string, { latitude: number; longitude: number; accuracy?: number; lastUpdatedAt?: string; isActive?: boolean }> = {};
        data.data.users.forEach((user: any) => {
          if (user.location && user.location.latitude && user.location.longitude) {
            locationMap[user.id] = {
              latitude: user.location.latitude,
              longitude: user.location.longitude,
              accuracy: user.location.accuracy,
              lastUpdatedAt: user.location.lastUpdatedAt,
              isActive: user.location.isActive,
            };
          }
        });
        setUserLocations(locationMap);
      }
    } catch (error) {
      console.warn('Error fetching user locations, using fallback coordinates:', error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // Fetch users on mount if initial data failed
  useEffect(() => {
    if (!initialData.success || initialData.data?.users?.length === 0) {
      fetchUsers();
    } else {
      setIsInitialLoading(false);
    }
    // Fetch real location data
    fetchUserLocations();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          user.fullName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.username?.toLowerCase().includes(query) ||
          user.phoneNumber?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;

      // Status filter
      if (statusFilter === 'active' && !user.isActive) return false;
      if (statusFilter === 'inactive' && user.isActive) return false;
      if (statusFilter === 'deleted' && !user.deletedAt) return false;

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      inactive: users.filter((u) => !u.isActive).length,
      verified: users.filter((u) => u.isVerified).length,
      subscribers: users.filter((u) => u.isSubscriber).length,
      superAdmins: users.filter((u) => u.role === 'SUPER_ADMIN').length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
      members: users.filter((u) => u.role === 'MEMBER').length,
      guests: users.filter((u) => u.role === 'GUEST').length,
    };
  }, [users]);

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleViewUserMap = (user: User) => {
    setMapUser(user);
    setIsMapModalOpen(true);
  };

  const handleViewAllUsersMap = () => {
    setViewMode('map');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'danger';
      case 'ADMIN':
        return 'warning';
      case 'MEMBER':
        return 'success';
      case 'GUEST':
        return 'secondary';
      default:
        return 'info';
    }
  };

  const uniqueRoles = Array.from(new Set(users.map((u) => u.role))).sort();

  return (
    <DashboardLayout title="User Management" subtitle="Manage all users from external system">
      {/* Stats Cards Row - Dashboard style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        <Card className="p-3 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Total Users</p>
            <UsersIcon className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{stats.total}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Active</p>
            <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 leading-tight">{stats.active}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Verified</p>
            <ShieldCheckIcon className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400 leading-tight">{stats.verified}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Subscribers</p>
            <UserGroupIcon className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 leading-tight">{stats.subscribers}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Inactive</p>
            <XCircleIcon className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400 leading-tight">{stats.inactive}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 items-center">

{/* Search */}
<div className="w-full">
  <Input
    icon={<MagnifyingGlassIcon className="w-5 h-5" />}
    placeholder="Search by name, email, username, or phone..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
</div>

{/* Role Filter */}
<div className="w-full">
  <Select
    options={[
      { value: 'all', label: 'All Roles' },
      ...uniqueRoles.map((role) => ({
        value: role,
        label: role.replace('_', ' '),
      })),
    ]}
    value={roleFilter}
    onChange={setRoleFilter}
    icon={<FunnelIcon className="w-5 h-5" />}
  />
</div>

{/* Status Filter */}
<div className="w-full">
  <Select
    options={[
      { value: 'all', label: 'All Status' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'deleted', label: 'Deleted' },
    ]}
    value={statusFilter}
    onChange={setStatusFilter}
    icon={<FunnelIcon className="w-5 h-5" />}
  />
</div>

{/* View Mode Toggle */}
<div className="w-full">
  <div className="flex items-center border border-[var(--border-color)] rounded-lg overflow-hidden w-full">
    <button
      onClick={() => setViewMode('table')}
      className={`flex-1 p-2 transition-colors ${
        viewMode === 'table'
          ? 'bg-[var(--primary-500)] text-white'
          : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]'
      }`}
      title="Table View"
    >
      <TableCellsIcon className="w-4 h-4 mx-auto" />
    </button>

    <button
      onClick={() => setViewMode('grid')}
      className={`flex-1 p-2 transition-colors ${
        viewMode === 'grid'
          ? 'bg-[var(--primary-500)] text-white'
          : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]'
      }`}
      title="Grid View"
    >
      <Squares2X2Icon className="w-4 h-4 mx-auto" />
    </button>

    <button
      onClick={() => setViewMode('map')}
      className={`flex-1 p-2 transition-colors ${
        viewMode === 'map'
          ? 'bg-[var(--primary-500)] text-white'
          : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]'
      }`}
      title="Map View"
    >
      <MapIcon className="w-4 h-4 mx-auto" />
    </button>
  </div>
</div>

{/* Refresh */}
<div className="w-full">
  <Button
    variant="secondary"
    onClick={fetchUsers}
    leftIcon={
      <ArrowPathIcon
        className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
      />
    }
    disabled={isLoading}
    className="w-full"
  >
    Refresh
  </Button>
</div>

</div>


      {/* Users Display */}
      {viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-input)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    User Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    Contact Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    Role & Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    Account Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    Groups
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {isLoading || isInitialLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-12 bg-[var(--bg-input)] rounded w-48"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-10 bg-[var(--bg-input)] rounded w-56"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-10 bg-[var(--bg-input)] rounded w-40"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-8 bg-[var(--bg-input)] rounded-full w-32"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-10 bg-[var(--bg-input)] rounded w-36"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-[var(--bg-input)] rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-8 bg-[var(--bg-input)] rounded w-20 mx-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : !isInitialLoading && filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <UsersIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                      <p className="text-lg font-medium text-[var(--text-primary)] mb-2">No Users Found</p>
                      <p className="text-[var(--text-muted)]">No users match your current filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={user.id || user._id || `user-${index}`} className="hover:bg-[var(--bg-input)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            {user.profilePictureUrl ? (
                              <img
                                src={user.profilePictureUrl}
                                alt={user.fullName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-semibold text-sm">
                                {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[var(--text-primary)]">{user.fullName || 'N/A'}</p>
                            {user.username && (
                              <p className="text-xs text-[var(--text-muted)]">@{user.username}</p>
                            )}
                            {!user.username && user.email && (
                              <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                            )}
                            {user.dateOfBirth && (
                              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                                <CalendarDaysIcon className="w-3.5 h-3.5" />
                                {formatDate(user.dateOfBirth)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {user.email && (
                            <p className="text-[var(--text-primary)] flex items-center gap-2 mb-1">
                              <EnvelopeIcon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{user.email}</span>
                              {user.emailVerified && (
                                <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" title="Email Verified" />
                              )}
                            </p>
                          )}
                          <p className="text-[var(--text-secondary)] flex items-center gap-2 mb-1">
                            <PhoneIcon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                            <span>{user.phoneNumber || 'N/A'}</span>
                            {user.phoneVerified && (
                              <CheckCircleIcon className="w-4 h-4 text-blue-400 flex-shrink-0" title="Phone Verified" />
                            )}
                          </p>
                          {user.emergencyContactName && (
                            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-1">
                              <UsersIcon className="w-3.5 h-3.5" />
                              {user.emergencyContactName}
                              {user.emergencyContactPhone && ` (${user.emergencyContactPhone})`}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {user.address ? (
                            <p className="text-[var(--text-primary)] flex items-center gap-2 mb-1">
                              <MapPinIcon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{user.address}</span>
                            </p>
                          ) : null}
                          {(user.city || user.state) && (
                            <p className="text-[var(--text-secondary)] mb-1">
                              {[user.city, user.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            {user.country && <span>{user.country}</span>}
                            {user.pincode && <span>• {user.pincode}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                              {user.role.replace('_', ' ')}
                            </Badge>
                            {user.isActive ? (
                              <Badge variant="success" size="sm" dot>Active</Badge>
                            ) : (
                              <Badge variant="secondary" size="sm" dot>Inactive</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {user.isVerified && (
                              <Badge variant="info" size="sm" dot>Verified</Badge>
                            )}
                            {user.isSubscriber && (
                              <Badge variant="warning" size="sm" dot>Subscriber</Badge>
                            )}
                          </div>
                          {(user.bloodGroup || user.gender) && (
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                              {user.bloodGroup && <span>🩸 {user.bloodGroup}</span>}
                              {user.gender && <span className="capitalize">• {user.gender}</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Plan Limit:</span>
                            <span className="text-[var(--text-primary)] font-semibold">{user.planLimit}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-muted)]">Auth:</span>
                            <span className="text-[var(--text-primary)] capitalize">{user.authProvider}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>Created: {formatDate(user.createdAt)}</span>
                          </div>
                          {user.lastLoginAt && (
                            <p className="text-xs text-[var(--text-muted)]">Last Login: {formatDate(user.lastLoginAt)}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {user.adminGroups?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs text-[var(--text-muted)] mb-1">Admin ({user.adminGroups.length})</p>
                              <div className="flex flex-wrap gap-1">
                                {user.adminGroups.slice(0, 2).map((group: any, idx: number) => (
                                  <Badge key={idx} variant="warning" size="sm" className="truncate max-w-[100px] text-[10px] px-1.5 py-0.5">
                                    {group.name || 'Group'}
                                  </Badge>
                                ))}
                                {user.adminGroups.length > 2 && (
                                  <Badge variant="secondary" size="sm" className="text-[10px] px-1.5 py-0.5">+{user.adminGroups.length - 2}</Badge>
                                )}
                              </div>
                            </div>
                          )}
                          {user.memberGroups?.length > 0 && (
                            <div>
                              <p className="text-xs text-[var(--text-muted)] mb-1">Member ({user.memberGroups.length})</p>
                              <div className="flex flex-wrap gap-1">
                                {user.memberGroups.slice(0, 2).map((mg: any, idx: number) => (
                                  <Badge key={idx} variant="info" size="sm" className="truncate max-w-[100px] text-[10px] px-1.5 py-0.5">
                                    {mg.group?.name || 'Group'}
                                  </Badge>
                                ))}
                                {user.memberGroups.length > 2 && (
                                  <Badge variant="secondary" size="sm" className="text-[10px] px-1.5 py-0.5">+{user.memberGroups.length - 2}</Badge>
                                )}
                              </div>
                            </div>
                          )}
                          {(!user.adminGroups?.length && !user.memberGroups?.length) && (
                            <span className="text-xs text-[var(--text-muted)]">No groups</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                            leftIcon={<EyeIcon className="w-4 h-4" />}
                          >
                            View
                          </Button>
                          {/* <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewUserMap(user);
                            }}
                            leftIcon={<MapPinIcon className="w-4 h-4" />}
                            title="View Location on Map"
                          >
                            Location
                          </Button> */}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pagination && (
            <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-input)]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="text-sm text-[var(--text-muted)]">
                  Showing <span className="font-semibold text-[var(--text-primary)]">{filteredUsers.length}</span> of <span className="font-semibold text-[var(--text-primary)]">{pagination.total}</span> users
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Page <span className="font-semibold text-[var(--text-primary)]">{pagination.page}</span> of <span className="font-semibold text-[var(--text-primary)]">{pagination.pages}</span>
                </p>
              </div>
            </div>
          )}
        </Card>
      ) : viewMode === 'map' ? (
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">All Users Map</h3>
              <p className="text-sm text-[var(--text-muted)]">View all users locations on a single map</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllPaths}
                  onChange={(e) => setShowAllPaths(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary-500)] focus:ring-[var(--primary-500)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Show Paths</span>
              </label>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-[var(--text-muted)]">Super Admin</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-[var(--text-muted)]">Admin</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-[var(--text-muted)]">Member</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-[var(--text-muted)]">Guest</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <DynamicAllUsersMap
              users={filteredUsers}
              showPaths={showAllPaths}
              height="600px"
              userLocations={userLocations}
              onUserClick={(user) => {
                setSelectedUser(user);
                setIsViewModalOpen(true);
              }}
            />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading || isInitialLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-20 bg-[var(--bg-input)] rounded mb-3"></div>
                <div className="h-4 bg-[var(--bg-input)] rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-[var(--bg-input)] rounded w-1/2"></div>
              </Card>
            ))
          ) : !isInitialLoading && filteredUsers.length === 0 ? (
            <div className="col-span-full">
              <Card className="p-12 text-center">
                <UsersIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-lg font-medium text-[var(--text-primary)] mb-2">No Users Found</p>
                <p className="text-[var(--text-muted)]">No users match your current filters</p>
              </Card>
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <Card key={user.id || user._id || `user-${index}`} className="p-4 hover:shadow-lg transition-all cursor-pointer" onClick={() => handleViewUser(user)}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    {user.profilePictureUrl ? (
                      <img
                        src={user.profilePictureUrl}
                        alt={user.fullName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold">
                        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate mb-1">{user.fullName || 'N/A'}</p>
                    {user.username && (
                      <p className="text-xs text-[var(--text-muted)] truncate mb-2">@{user.username}</p>
                    )}
                    {!user.username && user.email && (
                      <p className="text-xs text-[var(--text-muted)] truncate mb-2">{user.email}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={getRoleBadgeVariant(user.role)} size="sm" className="text-[10px]">
                        {user.role.replace('_', ' ')}
                      </Badge>
                      {user.isActive ? (
                        <Badge variant="success" size="sm" dot className="text-[10px]">Active</Badge>
                      ) : (
                        <Badge variant="secondary" size="sm" dot className="text-[10px]">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-xs border-t border-[var(--border-color)] pt-3">
                  {user.email && (
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                      <p className="text-[var(--text-primary)] truncate">{user.email}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                    <p className="text-[var(--text-secondary)] truncate">{user.phoneNumber || 'N/A'}</p>
                  </div>
                  {(user.city || user.state) && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                      <p className="text-[var(--text-secondary)] truncate">
                        {[user.city, user.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                      {user.emailVerified && (
                        <CheckCircleIcon className="w-4 h-4 text-emerald-400" title="Email Verified" />
                      )}
                      {user.phoneVerified && (
                        <CheckCircleIcon className="w-4 h-4 text-blue-400" title="Phone Verified" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewUser(user);
                        }}
                        leftIcon={<EyeIcon className="w-3.5 h-3.5" />}
                        className="text-xs px-2 py-1"
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewUserMap(user);
                        }}
                        leftIcon={<MapPinIcon className="w-3.5 h-3.5" />}
                        className="text-xs px-2 py-1"
                        title="View Location on Map"
                      >
                        Location
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* View User Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedUser(null);
        }}
        title="User Details"
        size="lg"
        className="z-[10000]"
      >
        {selectedUser && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Profile Section */}
            <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-color)]">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                {selectedUser.profilePictureUrl ? (
                  <img
                    src={selectedUser.profilePictureUrl}
                    alt={selectedUser.fullName}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-2xl">
                    {selectedUser.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedUser.fullName}</h3>
                {selectedUser.username ? (
                  <p className="text-sm text-[var(--text-muted)]">@{selectedUser.username}</p>
                ) : selectedUser.email ? (
                  <p className="text-sm text-[var(--text-muted)]">{selectedUser.email}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant={getRoleBadgeVariant(selectedUser.role)} size="sm">
                    {selectedUser.role.replace('_', ' ')}
                  </Badge>
                  {selectedUser.isActive ? (
                    <Badge variant="success" size="sm" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm" dot>
                      Inactive
                    </Badge>
                  )}
                  {selectedUser.isVerified && (
                    <Badge variant="info" size="sm" dot>
                      Verified
                    </Badge>
                  )}
                  {selectedUser.isSubscriber && (
                    <Badge variant="warning" size="sm" dot>
                      Subscriber
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <PhoneIcon className="w-5 h-5" />
                Contact Information
              </h4>
              <div className="bg-[var(--bg-input)] p-4 rounded-lg space-y-2">
                {selectedUser.email && (
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="w-5 h-5 text-[var(--text-muted)]" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Email</p>
                      <p className="text-[var(--text-primary)]">{selectedUser.email}</p>
                      {selectedUser.emailVerified && (
                        <Badge variant="success" size="sm" className="mt-1">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <PhoneIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Phone</p>
                    <p className="text-[var(--text-primary)]">{selectedUser.phoneNumber || 'N/A'}</p>
                    {selectedUser.phoneVerified && (
                      <Badge variant="success" size="sm" className="mt-1">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
                {selectedUser.emergencyContactName && (
                  <div className="flex items-center gap-3">
                    <UsersIcon className="w-5 h-5 text-[var(--text-muted)]" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Emergency Contact</p>
                      <p className="text-[var(--text-primary)]">
                        {selectedUser.emergencyContactName}
                        {selectedUser.emergencyContactPhone && ` - ${selectedUser.emergencyContactPhone}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Information */}
            {(selectedUser.address || selectedUser.city || selectedUser.state) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5" />
                    Location
                  </h4>
                  {/* <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleViewUserMap(selectedUser);
                    }}
                    leftIcon={<MapIcon className="w-4 h-4" />}
                  >
                    View on Map
                  </Button> */}
                </div>
                <div className="bg-[var(--bg-input)] p-4 rounded-lg space-y-2">
                  {selectedUser.address && (
                    <p className="text-[var(--text-primary)]">{selectedUser.address}</p>
                  )}
                  {(selectedUser.city || selectedUser.state) && (
                    <p className="text-[var(--text-secondary)]">
                      {[selectedUser.city, selectedUser.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {selectedUser.country && (
                    <p className="text-sm text-[var(--text-muted)]">{selectedUser.country}</p>
                  )}
                  {selectedUser.pincode && (
                    <p className="text-sm text-[var(--text-muted)]">PIN Code: {selectedUser.pincode}</p>
                  )}
                </div>
                <div className="mt-3 border border-[var(--border-color)] rounded-lg overflow-hidden">
                  <DynamicUserMap 
                    user={selectedUser} 
                    showPath={false} 
                    height="300px"
                    userLocation={selectedUser ? userLocations[selectedUser.id] : undefined}
                  />
                </div>
              </div>
            )}

            {/* Personal Information */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <IdentificationIcon className="w-5 h-5" />
                Personal Information
              </h4>
              <div className="bg-[var(--bg-input)] p-4 rounded-lg grid grid-cols-2 gap-4">
                {selectedUser.dateOfBirth && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Date of Birth</p>
                    <p className="text-[var(--text-primary)]">{formatDate(selectedUser.dateOfBirth)}</p>
                  </div>
                )}
                {selectedUser.gender && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Gender</p>
                    <p className="text-[var(--text-primary)] capitalize">{selectedUser.gender}</p>
                  </div>
                )}
                {selectedUser.bloodGroup && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Blood Group</p>
                    <p className="text-[var(--text-primary)]">{selectedUser.bloodGroup}</p>
                  </div>
                )}
                {selectedUser.medicalConditions && (
                  <div className="col-span-2">
                    <p className="text-xs text-[var(--text-muted)]">Medical Conditions</p>
                    <p className="text-[var(--text-primary)]">{selectedUser.medicalConditions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Account Details */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5" />
                Account Details
              </h4>
              <div className="bg-[var(--bg-input)] p-4 rounded-lg grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">User ID</p>
                  <p className="text-[var(--text-primary)] text-xs font-mono break-all">{selectedUser.id}</p>
                </div>
                {selectedUser.username && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Username</p>
                    <p className="text-[var(--text-primary)]">@{selectedUser.username}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Auth Provider</p>
                  <p className="text-[var(--text-primary)] capitalize">{selectedUser.authProvider}</p>
                </div>
                {selectedUser.providerId && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Provider ID</p>
                    <p className="text-[var(--text-primary)] text-xs font-mono break-all">{selectedUser.providerId}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Plan Limit</p>
                  <p className="text-[var(--text-primary)]">{selectedUser.planLimit}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Verification Status</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedUser.isVerified && (
                      <Badge variant="success" size="sm">Verified</Badge>
                    )}
                    {selectedUser.emailVerified && (
                      <Badge variant="info" size="sm">Email</Badge>
                    )}
                    {selectedUser.phoneVerified && (
                      <Badge variant="info" size="sm">Phone</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Created At</p>
                  <p className="text-[var(--text-primary)] text-xs">{formatDateTime(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Updated At</p>
                  <p className="text-[var(--text-primary)] text-xs">{formatDateTime(selectedUser.updatedAt)}</p>
                </div>
                {selectedUser.lastLoginAt && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Last Login</p>
                    <p className="text-[var(--text-primary)] text-xs">{formatDateTime(selectedUser.lastLoginAt)}</p>
                  </div>
                )}
                {selectedUser.roleAssignedBy && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Role Assigned By</p>
                    <p className="text-[var(--text-primary)] text-xs font-mono break-all">{selectedUser.roleAssignedBy}</p>
                  </div>
                )}
                {selectedUser.roleAssignedAt && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Role Assigned At</p>
                    <p className="text-[var(--text-primary)] text-xs">{formatDateTime(selectedUser.roleAssignedAt)}</p>
                  </div>
                )}
                {selectedUser.deletedAt && (
                  <div className="col-span-2">
                    <p className="text-xs text-[var(--text-muted)]">Deleted At</p>
                    <p className="text-[var(--text-primary)] text-red-400 text-xs">{formatDateTime(selectedUser.deletedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Groups */}
            {(selectedUser.adminGroups?.length > 0 || selectedUser.memberGroups?.length > 0) && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5" />
                  Groups
                </h4>
                <div className="bg-[var(--bg-input)] p-4 rounded-lg space-y-4">
                  {selectedUser.adminGroups?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">
                        Admin Groups ({selectedUser.adminGroups.length})
                      </p>
                      <div className="space-y-3">
                        {selectedUser.adminGroups.map((group: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="warning" size="sm">{group.name || 'Unnamed Group'}</Badge>
                              {group.members && (
                                <span className="text-xs text-[var(--text-muted)]">
                                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {group.id && (
                              <p className="text-xs text-[var(--text-muted)] font-mono mb-2">ID: {group.id}</p>
                            )}
                            {group.createdAt && (
                              <p className="text-xs text-[var(--text-muted)]">
                                Created: {formatDate(group.createdAt)}
                              </p>
                            )}
                            {group.members && group.members.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Members:</p>
                                <div className="space-y-2">
                                  {group.members.map((member: any, mIdx: number) => (
                                    <div key={mIdx} className="p-2 rounded-md bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                                      <div className="flex items-start gap-2 mb-1.5">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                          <span className="text-white font-semibold text-[10px]">
                                            {member.user?.fullName?.charAt(0)?.toUpperCase() || member.userId?.charAt(0)?.toUpperCase() || 'M'}
                                          </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                                              {member.user?.fullName || member.userId || 'Unknown Member'}
                                            </span>
                                            {member.relation && (
                                              <Badge variant="secondary" size="sm" className="text-[10px] px-1.5 py-0.5">{member.relation}</Badge>
                                            )}
                                            {member.isActive === false && (
                                              <Badge variant="secondary" size="sm" dot className="text-[10px] px-1.5 py-0.5">Inactive</Badge>
                                            )}
                                          </div>
                                          {member.user?.email && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <EnvelopeIcon className="w-3 h-3 text-[var(--text-muted)]" />
                                              <span className="text-[10px] text-[var(--text-secondary)] truncate">{member.user.email}</span>
                                              {member.user.emailVerified && (
                                                <CheckCircleIcon className="w-3 h-3 text-emerald-400" title="Email Verified" />
                                              )}
                                            </div>
                                          )}
                                          {member.user?.phoneNumber && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <PhoneIcon className="w-3 h-3 text-[var(--text-muted)]" />
                                              <span className="text-[10px] text-[var(--text-secondary)]">{member.user.phoneNumber}</span>
                                              {member.user.phoneVerified && (
                                                <CheckCircleIcon className="w-3 h-3 text-blue-400" title="Phone Verified" />
                                              )}
                                            </div>
                                          )}
                                          {member.user?.city && member.user?.state && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <MapPinIcon className="w-3 h-3 text-[var(--text-muted)]" />
                                              <span className="text-[10px] text-[var(--text-muted)]">
                                                {member.user.city}, {member.user.state}
                                              </span>
                                            </div>
                                          )}
                                          {member.joinedAt && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <ClockIcon className="w-3 h-3 text-[var(--text-muted)]" />
                                              <span className="text-[10px] text-[var(--text-muted)]">
                                                Joined: {formatDate(member.joinedAt)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedUser.memberGroups?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">
                        Member Groups ({selectedUser.memberGroups.length})
                      </p>
                      <div className="space-y-3">
                        {selectedUser.memberGroups.map((memberGroup: any, idx: number) => {
                          const group = memberGroup.group || {};
                          return (
                            <div key={idx} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="info" size="sm">{group.name || 'Unnamed Group'}</Badge>
                                {memberGroup.relation && (
                                  <Badge variant="secondary" size="sm">{memberGroup.relation}</Badge>
                                )}
                              </div>
                              {group.id && (
                                <p className="text-xs text-[var(--text-muted)] font-mono mb-1">Group ID: {group.id}</p>
                              )}
                              {group.admin && (
                                <p className="text-xs text-[var(--text-secondary)] mb-1">
                                  Admin: {group.admin.fullName} ({group.admin.email})
                                </p>
                              )}
                              {memberGroup.joinedAt && (
                                <p className="text-xs text-[var(--text-muted)]">
                                  Joined: {formatDate(memberGroup.joinedAt)}
                                </p>
                              )}
                              {memberGroup.isActive === false && (
                                <Badge variant="secondary" size="sm" className="mt-2">Inactive Member</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

