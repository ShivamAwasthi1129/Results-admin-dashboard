'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Input, Select, PhoneInput } from '@/components/ui';
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
  PhotoIcon,
} from '@heroicons/react/24/outline';
import DamageReportModal from '@/components/damage-reports/DamageReportModal';

const MAX_DOCUMENT_SIZE = 500 * 1024; // 500KB
const ALLOWED_DOCUMENT_EXT = ['image/jpeg', 'image/jpg', 'image/png'];

interface Certification {
  name: string;
  issuingAuthority?: string;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  photoUrl?: string;
  notes?: string;
}

export interface AdjusterDocument {
  documentNumber: string;
  documentType: string;
  photoUrl: string;
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
  id: string;
  _id?: string;
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
  documents?: AdjusterDocument[];
  states?: string[];
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

const DOCUMENT_TYPES = [
  { value: 'driving_license', label: 'Driving License' },
  { value: 'insurance_card', label: 'Insurance Card' },
  { value: 'id_card', label: 'ID Card' },
  { value: 'professional_certification', label: 'Professional Certification' },
  { value: 'w9_form', label: 'W-9 Form' },
  { value: 'adjuster_license', label: 'Adjuster License' },
  { value: 'bond_certificate', label: 'Bond Certificate' },
  { value: 'e_o_insurance', label: 'E&O Insurance' },
  { value: 'other', label: 'Other' },
];

const USA_STATES_WITH_NAMES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' }, { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
];

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
  const { token, hasAction } = useAuth();
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

  const canCreate = hasAction('adjusters.create');
  const canUpdate = hasAction('adjusters.update');
  const canDelete = hasAction('adjusters.delete');

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
    documents: [] as AdjusterDocument[],
    states: [] as string[],
  });
  const [documentUploadingIdx, setDocumentUploadingIdx] = useState<number | null>(null);
  const [statesDropdownOpen, setStatesDropdownOpen] = useState(false);
  const statesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statesDropdownRef.current && !statesDropdownRef.current.contains(e.target as Node)) {
        setStatesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        documents: formData.documents.filter((d) => d.documentNumber && d.photoUrl),
        states: formData.states,
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
        documents: formData.documents.filter((d) => d.documentNumber && d.photoUrl),
        states: formData.states,
      };

      const response = await fetch(`/api/adjusters/${selectedAdjuster.id || selectedAdjuster._id}`, {
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
      documents: [],
      states: [],
    });
  };

  const uploadDocumentFile = async (file: File, documentType: string, documentNumber: string): Promise<string | null> => {
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_DOCUMENT_EXT.includes(mime)) {
      toast.error('Only PNG, JPG, and JPEG images are allowed.');
      return null;
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
      toast.error('File size must not exceed 500KB.');
      return null;
    }
    const baseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DOMAIN_NAME) ? process.env.NEXT_PUBLIC_DOMAIN_NAME.replace(/\/$/, '') : '';
    if (!baseUrl) {
      toast.error('Upload URL is not configured (NEXT_PUBLIC_DOMAIN_NAME).');
      return null;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'adjuster-docs');
    const safeName = [documentType, documentNumber].filter(Boolean).join('-').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80) || undefined;
    if (safeName) form.append('fileName', safeName);
    const res = await fetch(`${baseUrl}/api/upload/file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || data.message || 'Upload failed.');
      return null;
    }
    const url = data.url ?? data.data?.url ?? data.link ?? data.photoUrl ?? data.fileUrl ?? null;
    if (!url) {
      toast.error('Upload did not return a file URL.');
      return null;
    }
    return url;
  };

  const addDocument = () => {
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, { documentNumber: '', documentType: DOCUMENT_TYPES[0].value, photoUrl: '' }],
    }));
  };

  const updateDocument = (idx: number, field: keyof AdjusterDocument, value: string) => {
    setFormData((prev) => {
      const docs = [...prev.documents];
      docs[idx] = { ...docs[idx], [field]: value };
      return { ...prev, documents: docs };
    });
  };

  const removeDocument = (idx: number) => {
    setFormData((prev) => ({ ...prev, documents: prev.documents.filter((_, i) => i !== idx) }));
  };

  const handleDocumentFileChange = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_DOCUMENT_EXT.includes(mime)) {
      toast.error('Only PNG, JPG, and JPEG images are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
      toast.error('File size must not exceed 500KB.');
      e.target.value = '';
      return;
    }
    setDocumentUploadingIdx(idx);
    const doc = formData.documents[idx];
    const url = await uploadDocumentFile(file, doc.documentType, doc.documentNumber);
    if (url) {
      updateDocument(idx, 'photoUrl', url);
    }
    setDocumentUploadingIdx(null);
    e.target.value = '';
  };

  const toggleState = (stateCode: string) => {
    setFormData((prev) => {
      const has = prev.states.includes(stateCode);
      const states = has ? prev.states.filter((s) => s !== stateCode) : [...prev.states, stateCode];
      return { ...prev, states };
    });
  };

  const selectedStatesLabel = formData.states.length
    ? formData.states.map((code) => { const s = USA_STATES_WITH_NAMES.find((x) => x.code === code); return s ? `${s.name} (${s.code})` : code; }).join(', ')
    : 'Select states...';

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
      documents: adjuster.documents || [],
      states: adjuster.states || [],
    });
    setStatesDropdownOpen(false);
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
      documents: adjuster.documents || [],
      states: adjuster.states || [],
    });
    setStatesDropdownOpen(false);
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
    <DashboardLayout
      title="Adjusters"
      subtitle="Manage insurance adjusters and their assigned damage report inspections"
      icon={<ClipboardDocumentCheckIcon className="w-7 h-7" />}
    >
      <div className="space-y-6">
        {/* Filters + Add Adjuster */}
        <div className="p-5 shadow-sm border border-[var(--border-color)] rounded-lg">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none z-10" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] z-10"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-[150px]">
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
            </div>

            <div className="min-w-[150px]">
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

            <div className="flex gap-2">
              {adjusters.length === 0 && (
                <Button variant="secondary" onClick={handleSeed} className="whitespace-nowrap">
                  Seed
                </Button>
              )}
              {canCreate && (
                <Button
                  onClick={() => { resetForm(); setStatesDropdownOpen(false); setShowCreateModal(true); }}
                  leftIcon={<PlusIcon className="w-5 h-5" />}
                  className="bg-[#991B1B] hover:bg-[#7F1D1D] text-white whitespace-nowrap"
                >
                  Add Adjuster
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Adjusters Table - responsive, content-based column widths */}
        <div className="overflow-hidden shadow-sm border border-[var(--border-color)] rounded-lg">
  {isLoading ? (
    <div className="p-8 text-center">
      <div className="inline-block w-8 h-8 border-2 border-transparent border-t-[#991B1B] rounded-full animate-spin" />
      <p className="mt-3 text-sm text-[var(--text-muted)]">Loading adjusters...</p>
    </div>
  ) : filteredAdjusters.length === 0 ? (
    <div className="p-8 text-center">
      <ClipboardDocumentCheckIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
      <p className="text-sm text-[var(--text-muted)]">
        {searchQuery || statusFilter !== 'all' || availabilityFilter !== 'all'
          ? 'No adjusters found matching your filters.'
          : 'No adjusters found. Add your first adjuster or seed premade data.'}
      </p>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="bg-[var(--bg-input)] border-b border-[var(--border-color)]">
            <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 py-2.5">ID</th>
            <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 py-2.5">Name</th>
            <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 py-2.5">Email</th>
            <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 py-2.5">Company</th>
            <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 py-2.5">Status</th>
            <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 py-2.5">Available</th>
            <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 py-2.5">Reports</th>
            <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 py-2.5">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {filteredAdjusters.map((a) => (
            <tr key={a.id || a._id} className="bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]/50 transition-colors">
              <td className="px-3 py-2.5 text-sm text-[var(--text-primary)] whitespace-nowrap font-mono">{a.adjusterId}</td>
              <td className="px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">{a.fullName}</td>
              <td className="px-3 py-2.5 text-sm text-[var(--text-primary)]">
                <div className="max-w-[200px] truncate" title={a.email}>{a.email}</div>
              </td>
              <td className="px-3 py-2.5 text-sm text-[var(--text-primary)]">
                <div className="max-w-[180px] truncate" title={a.companyName || '—'}>{a.companyName || '—'}</div>
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <Badge variant={getStatusColor(a.status) as any} size="sm">{a.status}</Badge>
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                {a.isAvailable ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" title="Available" />
                ) : (
                  <XMarkIcon className="w-5 h-5 text-red-500" title="Unavailable" />
                )}
              </td>
              <td className="px-3 py-2.5">
                {a.assignedReports && a.assignedReports.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-w-[140px]">
                    {a.assignedReports.map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openAssignedReport(r.reportId); }}
                        disabled={loadingReportId === r.reportId}
                        className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-input)] disabled:opacity-50"
                      >
                        {loadingReportId === r.reportId ? '…' : r.reportNumber}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openViewModal(a); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="View">
                    <EyeIcon className="w-4 h-4 text-gray-500" />
                  </button>
                  {canUpdate && (
                    <button onClick={(e) => { e.stopPropagation(); openEditModal(a); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Edit">
                      <PencilIcon className="w-4 h-4 text-blue-500" />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(a.id || a._id || ''); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Delete">
                      <TrashIcon className="w-4 h-4 text-red-500" />
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
</div>

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
                  <div className="col-span-2">
                    <PhoneInput
                      label="Phone"
                      value={formData.phone}
                      onChange={(v) => setFormData({ ...formData, phone: v || '' })}
                      placeholder="Enter phone number"
                    />
                  </div>
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

                {/* States (USA) - multi-select dropdown */}
                <div ref={statesDropdownRef}>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">States (where adjuster works)</label>
                  <button
                    type="button"
                    onClick={() => setStatesDropdownOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/50"
                  >
                    <span className={formData.states.length ? '' : 'text-[var(--text-muted)]'}>{selectedStatesLabel}</span>
                    <svg className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${statesDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {statesDropdownOpen && (
                    <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg z-10">
                      {USA_STATES_WITH_NAMES.map((s) => (
                        <button
                          key={s.code}
                          type="button"
                          onClick={() => toggleState(s.code)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-input)] ${formData.states.includes(s.code) ? 'bg-[var(--bg-input)] text-[#991B1B] font-medium' : 'text-[var(--text-primary)]'}`}
                        >
                          {s.name} ({s.code})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div className="border-t border-[var(--border-color)] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <DocumentTextIcon className="w-5 h-5" />
                      Documents
                    </h3>
                    <Button type="button" variant="secondary" size="sm" onClick={addDocument} leftIcon={<PlusIcon className="w-4 h-4" />}>
                      Add Document
                    </Button>
                  </div>
                  {formData.documents.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No documents added. Add driving license, insurance card, etc.</p>
                  ) : (
                    <div className="space-y-4">
                      {formData.documents.map((doc, idx) => (
                        <div key={idx} className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-[var(--text-primary)]">Document {idx + 1}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeDocument(idx)} className="text-red-500 hover:text-red-600">
                              <XMarkIcon className="w-5 h-5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Select
                              label="Document Type"
                              value={doc.documentType}
                              onChange={(value) => updateDocument(idx, 'documentType', value)}
                              options={DOCUMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                            />
                            <Input
                              label="Document Number"
                              value={doc.documentNumber}
                              onChange={(e) => updateDocument(idx, 'documentNumber', e.target.value)}
                              placeholder="e.g. DL-12345"
                            />
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Document photo (PNG, JPG, JPEG only, max 500KB)</label>
                              <div className="flex flex-col sm:flex-row gap-3 items-start">
                                <label className="cursor-pointer shrink-0">
                                  <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,image/jpeg,image/jpg,image/png"
                                    className="hidden"
                                    onChange={(e) => handleDocumentFileChange(idx, e)}
                                    disabled={documentUploadingIdx !== null}
                                  />
                                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-input)]">
                                    {documentUploadingIdx === idx ? 'Uploading...' : doc.photoUrl ? 'Change photo' : <><PhotoIcon className="w-4 h-4" /> Upload</>}
                                  </span>
                                </label>
                                {doc.photoUrl && (
                                  <div className="flex items-center gap-3">
                                    <div className="w-24 h-24 rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-primary)] shrink-0">
                                      <img src={doc.photoUrl} alt="Document preview" className="w-full h-full object-cover" />
                                    </div>
                                    <a href={doc.photoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#991B1B] hover:underline">Open in new tab</a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
                  <div className="col-span-2">
                    <PhoneInput
                      label="Phone"
                      value={formData.phone}
                      onChange={(v) => setFormData({ ...formData, phone: v || '' })}
                      placeholder="Enter phone number"
                      disabled={viewOnlyModal}
                    />
                  </div>
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

                {/* States (USA) - multi-select dropdown */}
                <div ref={viewOnlyModal ? undefined : statesDropdownRef}>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">States (where adjuster works)</label>
                  {viewOnlyModal ? (
                    <p className="text-sm text-[var(--text-primary)]">
                      {formData.states.length
                        ? formData.states.map((code) => { const s = USA_STATES_WITH_NAMES.find((x) => x.code === code); return s ? `${s.name} (${s.code})` : code; }).join(', ')
                        : '—'}
                    </p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setStatesDropdownOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/50"
                      >
                        <span className={formData.states.length ? '' : 'text-[var(--text-muted)]'}>{selectedStatesLabel}</span>
                        <svg className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${statesDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {statesDropdownOpen && (
                        <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg z-10">
                          {USA_STATES_WITH_NAMES.map((s) => (
                            <button
                              key={s.code}
                              type="button"
                              onClick={() => toggleState(s.code)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-input)] ${formData.states.includes(s.code) ? 'bg-[var(--bg-input)] text-[#991B1B] font-medium' : 'text-[var(--text-primary)]'}`}
                            >
                              {s.name} ({s.code})
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Documents */}
                <div className="border-t border-[var(--border-color)] pt-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5" />
                    Documents ({formData.documents.length})
                  </h3>
                  {formData.documents.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No documents added.</p>
                  ) : viewOnlyModal ? (
                    <div className="space-y-3">
                      {formData.documents.map((doc, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] flex flex-wrap items-center gap-3">
                          {doc.photoUrl && (
                            <div className="w-16 h-16 rounded border border-[var(--border-color)] overflow-hidden bg-[var(--bg-primary)] shrink-0">
                              <img src={doc.photoUrl} alt="Document" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-medium text-[var(--text-primary)]">{DOCUMENT_TYPES.find((t) => t.value === doc.documentType)?.label ?? doc.documentType}</span>
                            <span className="text-sm text-[var(--text-muted)] ml-2">{doc.documentNumber}</span>
                            {doc.photoUrl && (
                              <a href={doc.photoUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#991B1B] hover:underline mt-1">View full size</a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <Button type="button" variant="secondary" size="sm" onClick={addDocument} className="mb-3" leftIcon={<PlusIcon className="w-4 h-4" />}>
                        Add Document
                      </Button>
                      <div className="space-y-4">
                        {formData.documents.map((doc, idx) => (
                          <div key={idx} className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="text-sm font-medium text-[var(--text-primary)]">Document {idx + 1}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeDocument(idx)} className="text-red-500 hover:text-red-600">
                                <XMarkIcon className="w-5 h-5" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <Select
                                label="Document Type"
                                value={doc.documentType}
                                onChange={(value) => updateDocument(idx, 'documentType', value)}
                                options={DOCUMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                              />
                              <Input
                                label="Document Number"
                                value={doc.documentNumber}
                                onChange={(e) => updateDocument(idx, 'documentNumber', e.target.value)}
                                placeholder="e.g. DL-12345"
                              />
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Document photo (PNG, JPG, JPEG only, max 500KB)</label>
                                <div className="flex flex-col sm:flex-row gap-3 items-start">
                                  <label className="cursor-pointer shrink-0">
                                    <input
                                      type="file"
                                      accept=".jpg,.jpeg,.png,image/jpeg,image/jpg,image/png"
                                      className="hidden"
                                      onChange={(e) => handleDocumentFileChange(idx, e)}
                                      disabled={documentUploadingIdx !== null}
                                    />
                                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-input)]">
                                      {documentUploadingIdx === idx ? 'Uploading...' : doc.photoUrl ? 'Change photo' : <><PhotoIcon className="w-4 h-4" /> Upload</>}
                                    </span>
                                  </label>
                                  {doc.photoUrl && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-24 h-24 rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-primary)] shrink-0">
                                        <img src={doc.photoUrl} alt="Document preview" className="w-full h-full object-cover" />
                                      </div>
                                      <a href={doc.photoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#991B1B] hover:underline">Open in new tab</a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

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
            onUpdate={() => { }}
            viewAsAdjuster={true}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
