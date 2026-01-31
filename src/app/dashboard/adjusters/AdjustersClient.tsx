'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Input, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentCheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import DamageReportModal from '@/components/damage-reports/DamageReportModal';

interface Certification {
  name: string;
  issuingAuthority?: string;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  photoUrl?: string;
  notes?: string;
}

interface AssignedReport {
  reportId: string;
  reportNumber: string;
  customerId?: string;
  assignedDate: string;
  status: string;
  inspectionDate?: string;
  approvalStatus?: string;
  approvalDate?: string;
}

interface Adjuster {
  _id: string;
  adjusterId: string;
  photo?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  certifications: Certification[];
  specializations: string[];
  licenseNumber?: string;
  yearsOfExperience?: number;
  status: 'active' | 'inactive' | 'suspended';
  assignedReports: AssignedReport[];
  totalReportsHandled: number;
  currentActiveReports: number;
  isAvailable: boolean;
  availabilityNotes?: string;
  averageRating?: number;
  totalRatings?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AdjustersClientProps {
  initialAdjusters: Adjuster[];
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'success',
    inactive: 'secondary',
    suspended: 'danger',
  };
  return colors[status] || 'secondary';
};

export default function AdjustersClient({ initialAdjusters }: AdjustersClientProps) {
  const { token } = useAuth();
  const [adjusters, setAdjusters] = useState<Adjuster[]>(initialAdjusters);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [selectedAdjuster, setSelectedAdjuster] = useState<Adjuster | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewOnlyModal, setViewOnlyModal] = useState(false);
  const [selectedReportForDetail, setSelectedReportForDetail] = useState<any | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);
  const [assignedReportDetails, setAssignedReportDetails] = useState<Record<string, any>>({});
  const [loadingReportDetails, setLoadingReportDetails] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    licenseNumber: '',
    yearsOfExperience: '',
    specializations: '',
    notes: '',
  });

  // Fetch adjusters
  const fetchAdjusters = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (availabilityFilter !== 'all') params.append('isAvailable', availabilityFilter);

      const response = await fetch(`/api/adjusters?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAdjusters(data.data.adjusters);
        }
      }
    } catch (error) {
      console.error('Error fetching adjusters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjusters();
  }, [searchQuery, statusFilter, availabilityFilter, token]);

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this adjuster?')) return;

    try {
      const response = await fetch(`/api/adjusters/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Adjuster deleted successfully');
        fetchAdjusters();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete adjuster');
      }
    } catch (error) {
      toast.error('Error deleting adjuster');
    }
  };

  // Handle create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        companyName: formData.companyName || undefined,
        address: {
          street: formData.street || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zipCode: formData.zipCode || undefined,
        },
        licenseNumber: formData.licenseNumber || undefined,
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : undefined,
        specializations: formData.specializations ? formData.specializations.split(',').map(s => s.trim()).filter(Boolean) : [],
        notes: formData.notes || undefined,
        status: 'active',
        isAvailable: true,
      };

      const response = await fetch('/api/adjusters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Adjuster created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchAdjusters();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create adjuster');
      }
    } catch (error) {
      toast.error('Error creating adjuster');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjuster) return;
    setIsSubmitting(true);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        companyName: formData.companyName || undefined,
        address: {
          street: formData.street || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zipCode: formData.zipCode || undefined,
        },
        licenseNumber: formData.licenseNumber || undefined,
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : undefined,
        specializations: formData.specializations ? formData.specializations.split(',').map(s => s.trim()).filter(Boolean) : [],
        notes: formData.notes || undefined,
      };

      const response = await fetch(`/api/adjusters/${selectedAdjuster._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Adjuster updated successfully');
        setShowModal(false);
        setSelectedAdjuster(null);
        resetForm();
        fetchAdjusters();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update adjuster');
      }
    } catch (error) {
      toast.error('Error updating adjuster');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Seed adjusters
  const handleSeed = async () => {
    if (!confirm('This will add premade adjusters to the database. Continue?')) return;

    try {
      const response = await fetch('/api/adjusters/seed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Adjusters seeded successfully');
        fetchAdjusters();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to seed adjusters');
      }
    } catch (error) {
      toast.error('Error seeding adjusters');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      companyName: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      licenseNumber: '',
      yearsOfExperience: '',
      specializations: '',
      notes: '',
    });
  };

  const fetchAssignedReportDetails = async (reportIds: string[]) => {
    if (reportIds.length === 0) return;
    setLoadingReportDetails(true);
    setAssignedReportDetails({});
    try {
      const results = await Promise.all(
        reportIds.map(async (reportId) => {
          const res = await fetch(`/api/damage-reports/${reportId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const report = data.data?.damageReport ?? data.data;
            return report ? { reportId, report } : null;
          }
          return null;
        })
      );
      const map: Record<string, any> = {};
      results.forEach((r) => { if (r) map[r.reportId] = r.report; });
      setAssignedReportDetails(map);
    } catch (e) {
      console.error('Error fetching report details:', e);
    } finally {
      setLoadingReportDetails(false);
    }
  };

  const openViewModal = (adjuster: Adjuster) => {
    setViewOnlyModal(true);
    setSelectedAdjuster(adjuster);
    const reportIds = adjuster.assignedReports?.map((r) => r.reportId).filter(Boolean) ?? [];
    fetchAssignedReportDetails(reportIds);
    setFormData({
      firstName: adjuster.firstName,
      lastName: adjuster.lastName,
      email: adjuster.email,
      phone: adjuster.phone || '',
      companyName: adjuster.companyName || '',
      street: adjuster.address?.street || '',
      city: adjuster.address?.city || '',
      state: adjuster.address?.state || '',
      zipCode: adjuster.address?.zipCode || '',
      licenseNumber: adjuster.licenseNumber || '',
      yearsOfExperience: adjuster.yearsOfExperience?.toString() || '',
      specializations: adjuster.specializations?.join(', ') || '',
      notes: adjuster.notes || '',
    });
    setShowModal(true);
  };

  const openEditModal = (adjuster: Adjuster) => {
    setViewOnlyModal(false);
    setSelectedAdjuster(adjuster);
    setFormData({
      firstName: adjuster.firstName,
      lastName: adjuster.lastName,
      email: adjuster.email,
      phone: adjuster.phone || '',
      companyName: adjuster.companyName || '',
      street: adjuster.address?.street || '',
      city: adjuster.address?.city || '',
      state: adjuster.address?.state || '',
      zipCode: adjuster.address?.zipCode || '',
      licenseNumber: adjuster.licenseNumber || '',
      yearsOfExperience: adjuster.yearsOfExperience?.toString() || '',
      specializations: adjuster.specializations?.join(', ') || '',
      notes: adjuster.notes || '',
    });
    setShowModal(true);
  };

  const openAssignedReport = async (reportId: string) => {
    if (loadingReportId) return;
    setLoadingReportId(reportId);
    try {
      const response = await fetch(`/api/damage-reports/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const report = data.data?.damageReport ?? data.data;
        if (data.success && report) {
          setSelectedReportForDetail(report);
          setShowReportModal(true);
        } else {
          toast.error('Report not found');
        }
      } else {
        toast.error('Failed to load report');
      }
    } catch (e) {
      toast.error('Error loading report');
    } finally {
      setLoadingReportId(null);
    }
  };

  // Filter adjusters
  const filteredAdjusters = adjusters.filter((adjuster) => {
    if (statusFilter !== 'all' && adjuster.status !== statusFilter) return false;
    if (availabilityFilter !== 'all') {
      if (availabilityFilter === 'true' && !adjuster.isAvailable) return false;
      if (availabilityFilter === 'false' && adjuster.isAvailable) return false;
    }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                <ClipboardDocumentCheckIcon className="w-6 h-6 text-[#991B1B]" />
              </span>
              Adjusters
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1.5">
              Manage insurance adjusters and their assigned damage report inspections
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {adjusters.length === 0 && (
              <Button variant="secondary" onClick={handleSeed}>
                Seed Adjusters
              </Button>
            )}
            <Button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              leftIcon={<PlusIcon className="w-5 h-5" />}
              className="bg-[#991B1B] hover:bg-[#7F1D1D] text-white"
            >
              Add Adjuster
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-5 shadow-sm border border-[var(--border-color)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="lg:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
                <Input
                  type="text"
                  label="Search"
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <Select
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
              ]}
            />
            <Select
              label="Availability"
              value={availabilityFilter}
              onChange={setAvailabilityFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'true', label: 'Available' },
                { value: 'false', label: 'Unavailable' },
              ]}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">
              Showing <span className="font-medium text-[var(--text-primary)]">{filteredAdjusters.length}</span> of {adjusters.length} adjusters
            </span>
          </div>
        </Card>

      {/* Adjusters Table - responsive, content-based column widths */}
      <Card className="p-0 overflow-hidden shadow-sm border border-[var(--border-color)]">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-10 h-10 border-2 border-transparent border-t-[#991B1B] rounded-full animate-spin" />
            <p className="mt-4 text-sm text-[var(--text-muted)]">Loading adjusters...</p>
          </div>
        ) : filteredAdjusters.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardDocumentCheckIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">
              {searchQuery || statusFilter !== 'all' || availabilityFilter !== 'all'
                ? 'No adjusters found matching your filters.'
                : 'No adjusters found. Add your first adjuster or seed premade data.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr className="bg-[var(--bg-input)] border-b border-[var(--border-color)]">
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 whitespace-nowrap w-24">ID</th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 whitespace-nowrap min-w-[120px]">Name</th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 min-w-[200px] max-w-[280px]">Email</th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 min-w-[160px] max-w-[240px]">Company</th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 whitespace-nowrap w-20">Status</th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 whitespace-nowrap w-20">Available</th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 min-w-[140px]">Assigned Reports</th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 whitespace-nowrap w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredAdjusters.map((a) => (
                  <tr key={a._id} className="bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)] whitespace-nowrap font-mono">{a.adjusterId}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">{a.fullName}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)] break-all min-w-[200px] max-w-[280px]">{a.email}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)] break-all min-w-[160px] max-w-[240px]">{a.companyName || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={getStatusColor(a.status) as any} size="sm">{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.isAvailable ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500" title="Available" />
                      ) : (
                        <XMarkIcon className="w-5 h-5 text-red-500" title="Unavailable" />
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      {a.assignedReports && a.assignedReports.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {a.assignedReports.map((r, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openAssignedReport(r.reportId); }}
                              disabled={loadingReportId === r.reportId}
                              className="text-xs px-2 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-input)] disabled:opacity-50"
                            >
                              {loadingReportId === r.reportId ? '…' : r.reportNumber}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openViewModal(a); }} title="View">
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditModal(a); }} title="Edit">
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(a._id); }} className="text-red-500 hover:text-red-600" title="Delete">
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-primary)] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add New Adjuster</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last Name *"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <Input
                label="Company Name"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Street Address"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
                <Input
                  label="Zip Code"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="License Number"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                />
                <Input
                  label="Years of Experience"
                  type="number"
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                />
              </div>
              <Input
                label="Specializations (comma-separated)"
                placeholder="Hurricane, Flood, Fire, Wind"
                value={formData.specializations}
                onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Adjuster'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View / Edit Modal */}
      {showModal && selectedAdjuster && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-primary)] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">{viewOnlyModal ? 'View Adjuster' : 'Edit Adjuster'}</h2>
                <button onClick={() => { setShowModal(false); setSelectedAdjuster(null); setViewOnlyModal(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  disabled={viewOnlyModal}
                />
                <Input
                  label="Last Name *"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  disabled={viewOnlyModal}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={viewOnlyModal}
                />
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={viewOnlyModal}
                />
              </div>
              <Input
                label="Company Name"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                disabled={viewOnlyModal}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Street Address"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  disabled={viewOnlyModal}
                />
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={viewOnlyModal}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  disabled={viewOnlyModal}
                />
                <Input
                  label="Zip Code"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  disabled={viewOnlyModal}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="License Number"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  disabled={viewOnlyModal}
                />
                <Input
                  label="Years of Experience"
                  type="number"
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                  disabled={viewOnlyModal}
                />
              </div>
              <Input
                label="Specializations (comma-separated)"
                placeholder="Hurricane, Flood, Fire, Wind"
                value={formData.specializations}
                onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                disabled={viewOnlyModal}
              />
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] disabled:opacity-70"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={viewOnlyModal}
                />
              </div>

              {viewOnlyModal && selectedAdjuster?.assignedReports && selectedAdjuster.assignedReports.length > 0 && (
                <div className="pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4" />
                    Assigned Reports ({selectedAdjuster.assignedReports.length})
                  </h3>
                  {loadingReportDetails ? (
                    <div className="flex items-center gap-2 py-4 text-[var(--text-muted)]">
                      <div className="w-5 h-5 border-2 border-transparent border-t-current rounded-full animate-spin" />
                      <span className="text-sm">Loading report details...</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedAdjuster.assignedReports.map((r) => {
                        const details = assignedReportDetails[r.reportId];
                        return (
                          <div
                            key={r.reportId}
                            className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)]/50 hover:bg-[var(--bg-input)] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-[var(--text-primary)]">{r.reportNumber}</div>
                                {details ? (
                                  <>
                                    <div className="mt-1 text-sm text-[var(--text-muted)]">
                                      Customer: {details.customerFullName || (details.customer ? `${details.customer.firstName} ${details.customer.lastName}` : '—')}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs items-center">
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                        {String(details.status || r.status).replace(/_/g, ' ')}
                                      </span>
                                      <span className="text-[var(--text-secondary)]">{details.damageType || '—'}</span>
                                      {details.severity && (
                                        <span className="text-[var(--text-muted)]"> · {details.severity}</span>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="mt-1 text-xs text-[var(--text-muted)]">Status: {r.status}</div>
                                )}
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => { setShowModal(false); setSelectedAdjuster(null); setViewOnlyModal(false); openAssignedReport(r.reportId); }}
                                leftIcon={<EyeIcon className="w-4 h-4" />}
                              >
                                View report
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                {viewOnlyModal ? (
                  <>
                    <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setSelectedAdjuster(null); setViewOnlyModal(false); }}>
                      Close
                    </Button>
                    <Button type="button" onClick={() => setViewOnlyModal(false)}>
                      Edit
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setSelectedAdjuster(null); setViewOnlyModal(false); }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Updating...' : 'Update Adjuster'}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assigned Report Detail Modal */}
      {selectedReportForDetail && (
        <DamageReportModal
          report={selectedReportForDetail}
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedReportForDetail(null);
          }}
          onUpdate={() => {}}
          viewAsAdjuster={true}
        />
      )}
      </div>
    </DashboardLayout>
  );
}
