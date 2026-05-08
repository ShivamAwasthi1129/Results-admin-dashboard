'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, Badge, Button, Input, Select, Table } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  HomeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  Squares2X2Icon,
  Bars3Icon,
  UserIcon,
} from '@heroicons/react/24/outline';
import DamageReportModal from '@/components/damage-reports/DamageReportModal';
import CreateDamageReportModal from '@/components/damage-reports/CreateDamageReportModal';

// Column config for Edit columns (Stripe-style). Customer ID and Actions are fixed.
const FIXED_START_ID = 'customerId';
const FIXED_END_ID = 'actions';
const ORDERABLE_COLUMNS: { id: string; label: string }[] = [
  { id: 'reportNumber', label: 'Report #' },
  { id: 'date', label: 'Date' },
  { id: 'status', label: 'Status' },
  { id: 'currentStep', label: 'Step' },
  { id: 'damageType', label: 'Damage Type' },
  { id: 'severity', label: 'Severity' },
  { id: 'insuranceCoverage', label: 'Insurance' },
  { id: 'propertyAddress', label: 'Property Address' },
  { id: 'estCost', label: 'Est. Cost' },
  { id: 'adjuster', label: 'Adjuster' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'funding', label: 'Funding' },
];
// Default visible orderable columns; some hidden by default
const DEFAULT_VISIBLE_ORDERABLE = ['reportNumber', 'date', 'propertyAddress', 'currentStep', 'estCost', 'status'];

interface DamageReport {
  id: string;
  reportNumber: string;
  reportDate: string;
  customer: {
    customerId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };
  customerFullName?: string;
  reportedBy: {
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  propertyAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  damageType: string;
  severity: string;
  status: string;
  description: string;
  affectedAreas?: string[];
  estimatedCost: number;
  actualCost?: number;
  fundingSources: Array<{
    source: string;
    amount: number;
  }>;
  totalFunding?: number;
  fundingPercentage?: number;
  remainingFunding?: number;
  workflowSteps: Array<{
    stepNumber: number;
    name: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
  }>;
  currentStep: number;
  assignedAdjuster?: {
    adjusterId: string;
    fullName: string;
    email?: string;
    phone?: string;
    companyName?: string;
    approvalStatus: string;
  };
  assignedVendors: Array<{
    vendorId: string;
    businessName: string;
    category?: string;
    estimatedCost: number;
    status: string;
  }>;
  totalVendorCost?: number;
  vendorWorkProgress?: number;
  images: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
  insuranceCoverage?: 'uninsured' | 'partially_insured' | 'fully_insured' | null;
  createdAt?: string;
  updatedAt?: string;
}

interface DamageReportsClientProps {
  initialReports: DamageReport[];
}

const getDamageTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    hurricane: '🌀',
    flood: '💧',
    wind: '💨',
    fire: '🔥',
    earthquake: '🌍',
    tornado: '🌪️',
    storm: '⛈️',
    hail: '❄️',
    drought: '🌾',
    other: '⚠️',
  };
  return icons[type] || '⚠️';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    report_created: 'info',
    under_review: 'warning',
    reviewed: 'info',
    adjuster_assigned: 'warning',
    adjuster_inspecting: 'warning',
    adjuster_approved: 'success',
    vendor_assigned: 'warning',
    work_in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  };
  return colors[status] || 'secondary';
};

const getStepName = (step: number) => {
  const steps: Record<number, string> = {
    1: 'Report Created',
    2: 'Under Review',
    3: 'Assign Adjuster',
    4: 'Adjuster Inspection',
    5: 'Assign Vendors',
    6: 'Vendor Work',
    7: 'Completed',
  };
  return steps[step] || `Step ${step}`;
};

const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    minor: 'info',
    moderate: 'warning',
    severe: 'danger',
    catastrophic: 'danger',
  };
  return colors[severity] || 'secondary';
};

export default function DamageReportsClient({ initialReports }: DamageReportsClientProps) {
  const { token, hasAction } = useAuth();

  const canCreate = hasAction('damageReports.create');
  const canDelete = hasAction('damageReports.delete');
  const [reports, setReports] = useState<DamageReport[]>(initialReports);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [damageTypeFilter, setDamageTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [visibleOrderableIds, setVisibleOrderableIds] = useState<string[]>(DEFAULT_VISIBLE_ORDERABLE);
  const [showEditColumnsDropdown, setShowEditColumnsDropdown] = useState(false);
  const editColumnsDropdownRef = useRef<HTMLDivElement>(null);
  const [workflowStepTooltip, setWorkflowStepTooltip] = useState<{
    rect: DOMRect;
    step: any;
    report: DamageReport;
    completedAt: string | null;
    startedAt: string | null;
    budgetItems: any[];
    budgetTotal: number;
    vendorsInProgress: number;
    vendorsCompleted: number;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editColumnsDropdownRef.current && !editColumnsDropdownRef.current.contains(e.target as Node)) {
        setShowEditColumnsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch reports
  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (damageTypeFilter !== 'all') params.append('damageType', damageTypeFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);

      const response = await fetch(`/api/damage-reports?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReports(data.data.damageReports);
        }
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [searchQuery, statusFilter, damageTypeFilter, severityFilter, token]);

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this damage report?')) return;

    try {
      const response = await fetch(`/api/damage-reports/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Damage report deleted successfully');
        fetchReports();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete damage report');
      }
    } catch (error) {
      toast.error('Error deleting damage report');
    }
  };

  // Filter reports
  const filteredReports = reports.filter((report) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchReport = report.reportNumber?.toLowerCase().includes(q) ||
        report.customerFullName?.toLowerCase().includes(q) ||
        `${report.customer?.firstName} ${report.customer?.lastName}`.toLowerCase().includes(q) ||
        report.customer?.email?.toLowerCase().includes(q) ||
        report.propertyAddress?.street?.toLowerCase().includes(q) ||
        report.propertyAddress?.city?.toLowerCase().includes(q);
      if (!matchReport) return false;
    }
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    if (damageTypeFilter !== 'all' && report.damageType !== damageTypeFilter) return false;
    if (severityFilter !== 'all' && report.severity !== severityFilter) return false;
    return true;
  });

  // Group reports by customer (like Alert Management → sub-options)
  const reportsByCustomer = useMemo(() => {
    const map = new Map<string, { customerId: string; customerName: string; reports: DamageReport[] }>();
    for (const report of filteredReports) {
      const cid = report.customer?.customerId ?? report.id;
      const name = report.customerFullName || `${report.customer?.firstName ?? ''} ${report.customer?.lastName ?? ''}`.trim() || 'Unknown';
      if (!map.has(cid)) {
        map.set(cid, { customerId: cid, customerName: name, reports: [] });
      }
      map.get(cid)!.reports.push(report);
    }
    return Array.from(map.values());
  }, [filteredReports]);

  const toggleCustomerExpand = (customerId: string) => {
    const next = new Set(expandedCustomers);
    if (next.has(customerId)) next.delete(customerId);
    else next.add(customerId);
    setExpandedCustomers(next);
  };

  const reportForDetailPanel = useMemo(() => {
    if (!selectedReportId) return null;
    return reports.find((r) => r.id === selectedReportId) ?? null;
  }, [selectedReportId, reports]);

  const getFundingSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      insurance: 'Insurance',
      fema: 'FEMA',
      flood_insurance: 'Flood Insurance',
      non_profit: 'Non-Profit',
      consolidated_non_profit: 'Consolidated Non-Profit',
      self_pay: 'Self-Pay',
      other: 'Other',
    };
    return labels[source] || source;
  };

  // DD/MM/YY (two-digit year)
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const displayColumnIds = [FIXED_START_ID, ...visibleOrderableIds, FIXED_END_ID];
  const availableColumnIds = ORDERABLE_COLUMNS.map((c) => c.id).filter((id) => !visibleOrderableIds.includes(id));

  const getColumnLabel = (id: string) => {
    if (id === FIXED_START_ID) return 'Customer';
    if (id === FIXED_END_ID) return 'Actions';
    return ORDERABLE_COLUMNS.find((c) => c.id === id)?.label ?? id;
  };

  const getReportCellValue = (report: DamageReport, columnId: string): React.ReactNode => {
    switch (columnId) {
      case 'reportNumber': return report.reportNumber ?? '—';
      case 'date': return formatDate(report.reportDate);
      case 'status': return report.status ? report.status.replace(/_/g, ' ') : '—';
      case 'currentStep': {
        if (report.currentStep == null) return '—';
        const currentStepName = getStepName(report.currentStep);
        const currentStepObj = report.workflowSteps?.find((s) => s.stepNumber === report.currentStep);
        const step4 = report.workflowSteps?.find((s) => s.stepNumber === 4) as any;
        const budgetItems = Array.isArray(step4?.stepData?.inspectionBudget) ? step4.stepData.inspectionBudget : [];
        const budgetTotal = budgetItems.reduce((sum: number, b: any) => sum + (Number(b?.amount) || 0), 0);
        const vendors = report.assignedVendors || [];
        const vendorsInProgress = vendors.filter((v: any) => v.status === 'in_progress').length;
        const vendorsCompleted = vendors.filter((v: any) => v.status === 'completed').length;

        return (
          <div className="relative group inline-flex items-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-sm text-[var(--text-primary)]">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-[#991B1B]">
                {report.currentStep}
              </span>
              <span className="font-medium">{currentStepName}</span>
            </span>

            {/* Tooltip */}
            <div className="pointer-events-none absolute z-30 left-1/2 top-full mt-2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="w-[280px] bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{currentStepName}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">
                      Status: {String(currentStepObj?.status ?? report.status ?? '—').replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                    DR {report.reportNumber}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs">
                  {report.assignedAdjuster?.fullName && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Adjuster</span>
                      <span className="text-[var(--text-primary)] font-medium truncate max-w-[160px]">{report.assignedAdjuster.fullName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Budget items (Step 4)</span>
                    <span className="text-[var(--text-primary)] font-medium">{budgetItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Budget total</span>
                    <span className="text-[var(--text-primary)] font-medium">${budgetTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Vendors</span>
                    <span className="text-[var(--text-primary)] font-medium">{vendors.length} (IP {vendorsInProgress}, Done {vendorsCompleted})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'damageType': return report.damageType ? String(report.damageType) : '—';
      case 'severity': return report.severity ? String(report.severity) : '—';
      case 'insuranceCoverage': return report.insuranceCoverage ? report.insuranceCoverage.replace(/_/g, ' ') : '—';
      case 'propertyAddress': return report.propertyAddress ? `${report.propertyAddress.city}, ${report.propertyAddress.state}` : '—';
      case 'estCost': return report.estimatedCost != null ? `$${Number(report.estimatedCost).toLocaleString()}` : '—';
      case 'adjuster': return report.assignedAdjuster?.fullName ?? '—';
      case 'vendors': return report.assignedVendors?.length ? `${report.assignedVendors.length} assigned` : '—';
      case 'funding': return report.totalFunding != null ? `$${Number(report.totalFunding).toLocaleString()}` : '—';
      default: return '—';
    }
  };

  const toggleColumn = (id: string, visible: boolean) => {
    if (visible) {
      setVisibleOrderableIds((prev) => [...prev, id]);
    } else {
      setVisibleOrderableIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const moveColumn = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= visibleOrderableIds.length) return;
    setVisibleOrderableIds((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  };

  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

  // Seed damage reports
  const handleSeed = async () => {
    if (!confirm('This will replace existing damage reports with sample data. Continue?')) return;

    try {
      const response = await fetch('/api/damage-reports/seed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Damage reports seeded successfully');
        fetchReports();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to seed damage reports');
      }
    } catch (error) {
      toast.error('Error seeding damage reports');
    }
  };

  return (
    <div className="space-y-6">

      {/* Filters - single row: search, status, damage type, severity, create report, edit columns */}
      <div className="p-5 shadow-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg">
        <div className="flex flex-wrap items-end gap-3 min-w-0">
          <div className="flex-1 min-w-[160px] max-w-[280px]">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] z-10" />
              <Input
                type="text"
                placeholder="Report #, owner, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-[42px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] z-10"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="w-[130px]">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Status</label>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'report_created', label: 'Report Created' },
                { value: 'under_review', label: 'Under Review' },
                { value: 'reviewed', label: 'Reviewed' },
                { value: 'adjuster_assigned', label: 'Adjuster Assigned' },
                { value: 'adjuster_approved', label: 'Adjuster Approved' },
                { value: 'vendor_assigned', label: 'Vendor Assigned' },
                { value: 'work_in_progress', label: 'Work In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              className="h-[42px]"
            />
          </div>

          <div className="w-[130px]">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Damage Type</label>
            <Select
              value={damageTypeFilter}
              onChange={setDamageTypeFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'hurricane', label: 'Hurricane' },
                { value: 'flood', label: 'Flood' },
                { value: 'wind', label: 'Wind' },
                { value: 'fire', label: 'Fire' },
                { value: 'earthquake', label: 'Earthquake' },
                { value: 'tornado', label: 'Tornado' },
                { value: 'storm', label: 'Storm' },
                { value: 'hail', label: 'Hail' },
                { value: 'drought', label: 'Drought' },
                { value: 'other', label: 'Other' },
              ]}
              className="h-[42px]"
            />
          </div>

          <div className="w-[120px]">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Severity</label>
            <Select
              value={severityFilter}
              onChange={setSeverityFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'minor', label: 'Minor' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'severe', label: 'Severe' },
                { value: 'catastrophic', label: 'Catastrophic' },
              ]}
              className="h-[42px]"
            />
          </div>

          {canCreate && (
            <Button
              onClick={() => setShowCreateModal(true)}
              leftIcon={<PlusIcon className="w-5 h-5" />}
              className="h-[42px] shrink-0 bg-[#991B1B] hover:bg-[#7F1D1D] text-white shadow-md px-4"
            >
              Create Report
            </Button>
          )}

          <div className="relative shrink-0" ref={editColumnsDropdownRef}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEditColumnsDropdown((v) => !v)}
              leftIcon={<Squares2X2Icon className="w-4 h-4" />}
              className="h-[42px]"
            >
              Edit columns
            </Button>

            {showEditColumnsDropdown && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[280px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg py-2">
                <div className="px-3 py-2 border-b border-[var(--border-color)]">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Fixed columns</span>
                  <div className="mt-1.5 text-sm text-[var(--text-primary)]">Customer ID, Actions</div>
                </div>
                <div className="px-3 py-2 border-b border-[var(--border-color)]">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Active columns</span>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Drag to reorder</p>
                  <div className="mt-2 space-y-1">
                    {visibleOrderableIds.map((id, index) => {
                      const col = ORDERABLE_COLUMNS.find((c) => c.id === id);
                      if (!col) return null;
                      return (
                        <div
                          key={id}
                          draggable
                          onDragStart={() => setDraggedColumnIndex(index)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedColumnIndex === null) return;
                            if (draggedColumnIndex !== index) moveColumn(draggedColumnIndex, index);
                            setDraggedColumnIndex(null);
                          }}
                          onDragEnd={() => setDraggedColumnIndex(null)}
                          className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[var(--bg-secondary)] ${draggedColumnIndex === index ? 'opacity-50' : ''}`}
                        >
                          <Bars3Icon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 cursor-grab" aria-hidden />
                          <input
                            type="checkbox"
                            checked
                            onChange={() => toggleColumn(id, false)}
                            className="rounded border-[var(--border-color)]"
                          />
                          <span className="text-sm text-[var(--text-primary)]">{col.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-3 py-2">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Available columns</span>
                  <div className="mt-2 space-y-1">
                    {availableColumnIds.map((id) => {
                      const col = ORDERABLE_COLUMNS.find((c) => c.id === id);
                      if (!col) return null;
                      return (
                        <div key={id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[var(--bg-secondary)]">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => toggleColumn(id, true)}
                            className="rounded border-[var(--border-color)]"
                          />
                          <span className="text-sm text-[var(--text-primary)]">{col.label}</span>
                        </div>
                      );
                    })}
                    {availableColumnIds.length === 0 && (
                      <p className="text-xs text-[var(--text-muted)] py-1">All columns are visible</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {(searchQuery || statusFilter !== 'all' || damageTypeFilter !== 'all' || severityFilter !== 'all') && (
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setDamageTypeFilter('all');
                setSeverityFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        <div className="mt-4 text-sm text-[var(--text-muted)]">
          Showing {reportsByCustomer.length} customers ({filteredReports.length} reports)
        </div>
      </div>

      {/* Outer table with column headers so Edit columns applies */}
      <Card className="p-0 overflow-x-auto hide-scrollbar shadow-lg border-2 border-[var(--border-color)]">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="mt-4 text-[var(--text-muted)]">Loading reports...</p>
          </div>
        ) : reportsByCustomer.length === 0 ? (
          <div className="p-12 text-center">
            <DocumentTextIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">
              {searchQuery || statusFilter !== 'all' || damageTypeFilter !== 'all' || severityFilter !== 'all'
                ? 'No customers/reports found matching your filters.'
                : 'No damage reports found. Create your first report to get started.'}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-input)]">
                {displayColumnIds.map((id) => (
                  <th key={id} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {getColumnLabel(id)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {reportsByCustomer.map((group) => {
                const isExpanded = expandedCustomers.has(group.customerId);
                const hasSelectedReport = selectedReportId && group.reports.some((r) => r.id === selectedReportId);
                const detailReport = hasSelectedReport ? reportForDetailPanel : null;
                const firstReport = group.reports[0];

                return (
                  <React.Fragment key={group.customerId}>
                    {/* Customer row: one cell per column */}
                    <tr className=" bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]/60">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleCustomerExpand(group.customerId)}
                          className="flex items-center gap-2 w-full text-left"
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                          ) : (
                            <ChevronRightIcon className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                          )}
                          <UserIcon className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                          <div className="min-w-0 flex flex-col">
                            <span className="font-medium text-sm text-[var(--text-primary)] truncate">{group.customerName}</span>
                            <span className="text-xs text-[var(--text-muted)] mt-0.5">ID: {group.customerId}</span>
                          </div>
                          <Badge variant="secondary" size="sm" className="ml-1">{group.reports.length} report{group.reports.length !== 1 ? 's' : ''}</Badge>
                        </button>
                      </td>
                      {visibleOrderableIds.map((colId) => (
                        <td key={colId} className="px-4 py-3 text-sm text-[var(--text-primary)]">
                          {firstReport ? getReportCellValue(firstReport, colId) : '—'}
                        </td>
                      ))}
                      <td className="px-4 py-3 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { if (firstReport) { setSelectedReport(firstReport); setShowDetailModal(true); } }}
                          leftIcon={<EyeIcon className="w-4 h-4" />}
                        >
                          View
                        </Button>
                        {canDelete && firstReport && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleDelete(firstReport.id); }}
                            className="text-red-500 hover:text-red-600"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded: sub-options (report IDs) + detail panel */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={displayColumnIds.length} className="px-4 py-0 align-top bg-[var(--bg-primary)]">
                          <div className="ml-4 border-l-2 border-[var(--border-color)] pl-2 py-2 space-y-1 bg-[var(--bg-input)]/20">
                            {group.reports.map((report) => {
                              const isSelected = selectedReportId === report.id;
                              return (
                                <button
                                  key={report.id}
                                  type="button"
                                  onClick={() => setSelectedReportId(isSelected ? null : report.id)}
                                  className={`
                                  w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left font-medium text-sm transition-all
                                  ${isSelected
                                      ? 'bg-[#991B1B] text-white shadow-md'
                                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                                    }
                                `}
                                >
                                  <DocumentTextIcon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate">{report.reportNumber}</div>
                                    <div className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                                      Report ID: {String(report.id).slice(-8)}
                                    </div>
                                  </div>
                                  <span className={`text-xs ${isSelected ? 'text-white/90' : 'text-[var(--text-muted)]'}`}>
                                    {formatDate(report.reportDate)} · {report.status.replace(/_/g, ' ')}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}

                    {isExpanded && detailReport && (
                      <tr>
                        <td colSpan={displayColumnIds.length} className="px-4 py-6 bg-[var(--bg-card)] border-t border-[var(--border-color)]">
                          <div className="w-full min-w-0 max-w-[85%]">
                            <div className="flex items-center justify-between mb-5">
                              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <div className="p-1.5 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)]">
                                  <DocumentTextIcon className="w-5 h-5 text-[#991B1B]" />
                                </div>
                                {detailReport.reportNumber} — Detailed View
                              </h3>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setSelectedReport(detailReport); setShowDetailModal(true); }}
                                  leftIcon={<EyeIcon className="w-4 h-4" />}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setSelectedReport(detailReport); setShowDetailModal(true); }}
                                  leftIcon={<PencilIcon className="w-4 h-4" />}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(detailReport.id)}
                                  className="text-red-500 hover:text-red-600"
                                  leftIcon={<TrashIcon className="w-4 h-4" />}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                            {(() => {
                              const report = detailReport;
                              const totalFunding = report.fundingSources?.reduce((sum, source) => sum + (source.amount || 0), 0) || 0;
                              const remainingFunding = Math.max(0, (report.estimatedCost || 0) - totalFunding);
                              return (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full min-w-0">
                                    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] shadow-sm min-w-0 overflow-hidden">
                                      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                        <MapPinIcon className="w-4 h-4 text-[#991B1B] shrink-0" />
                                        Customer Information
                                      </h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="font-medium text-[var(--text-primary)]">
                                          {report.customerFullName || `${report.customer?.firstName} ${report.customer?.lastName}`}
                                        </div>
                                        {report.customer?.phone && (
                                          <div className="flex items-center gap-2 text-[var(--text-primary)]">
                                            <PhoneIcon className="w-4 h-4 text-[var(--text-muted)]" />
                                            <span>{report.customer.phone}</span>
                                          </div>
                                        )}
                                        {report.customer?.email && (
                                          <div className="flex items-center gap-2 text-[var(--text-primary)]">
                                            <EnvelopeIcon className="w-4 h-4 text-[var(--text-muted)]" />
                                            <span>{report.customer.email}</span>
                                          </div>
                                        )}
                                        <div className="text-[var(--text-primary)]">
                                          {report.propertyAddress?.street}, {report.propertyAddress?.city}, {report.propertyAddress?.state} {report.propertyAddress?.zipCode}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] shadow-sm min-w-0 overflow-hidden">
                                      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                        <DocumentTextIcon className="w-4 h-4 text-[#991B1B] shrink-0" />
                                        Damage Details
                                      </h4>
                                      <div className="space-y-2 text-sm text-[var(--text-primary)]">
                                        <p>{report.description}</p>
                                        {report.affectedAreas && report.affectedAreas.length > 0 && (
                                          <div>
                                            <span className="font-medium">Affected Area: </span>
                                            <span>{report.affectedAreas.join(', ')}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] shadow-sm min-w-0 overflow-hidden">
                                      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                        <CurrencyDollarIcon className="w-4 h-4 text-[#991B1B] shrink-0" />
                                        Funding Summary
                                      </h4>
                                      <div className="space-y-1 text-sm">
                                        {report.fundingSources?.map((source, idx) => (
                                          <div key={idx} className="flex justify-between text-[var(--text-primary)]">
                                            <span>{getFundingSourceLabel(source.source)}:</span>
                                            <span className="font-medium">${source.amount.toLocaleString()}</span>
                                          </div>
                                        ))}
                                        <div className="flex justify-between text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]">
                                          <span className="font-medium">Remaining:</span>
                                          <span className={`font-bold ${remainingFunding < 0 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                                            ${remainingFunding.toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                      <div className="p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                                        <ClockIcon className="w-4 h-4 text-[#991B1B]" />
                                      </div>
                                      Workflow Progress Timeline
                                    </h4>
                                    {report.workflowSteps && report.workflowSteps.length > 0 ? (
                                      <div className="overflow-visible pb-4">
                                        <div className="flex items-stretch w-full gap-0 min-w-0">
                                          {[...report.workflowSteps].sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0)).map((step, idx) => {
                                            const isCompleted = step.status === 'completed';
                                            const isCurrent = step.stepNumber === report.currentStep;
                                            const completedAt = step.completedAt ? new Date(step.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                                            const startedAt = step.startedAt ? new Date(step.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                                            const budgetItems = Array.isArray((step as any)?.stepData?.inspectionBudget) ? (step as any).stepData.inspectionBudget : [];
                                            const budgetTotal = budgetItems.reduce((sum: number, b: any) => sum + (Number(b?.amount) || 0), 0);
                                            const vendors = report.assignedVendors || [];
                                            const vendorsInProgress = vendors.filter((v: any) => v.status === 'in_progress').length;
                                            const vendorsCompleted = vendors.filter((v: any) => v.status === 'completed').length;
                                            return (
                                              <React.Fragment key={step.stepNumber ?? idx}>
                                                <div
                                                  className="relative group flex flex-col items-center  min-w-0 px-6"
                                                  onMouseEnter={(e) => {
                                                    const el = (e.currentTarget as HTMLElement).querySelector('[data-step-circle]');
                                                    const rect = (el || e.currentTarget).getBoundingClientRect();
                                                    setWorkflowStepTooltip({
                                                      rect,
                                                      step,
                                                      report,
                                                      completedAt,
                                                      startedAt,
                                                      budgetItems,
                                                      budgetTotal,
                                                      vendorsInProgress,
                                                      vendorsCompleted,
                                                    });
                                                  }}
                                                  onMouseLeave={() => setWorkflowStepTooltip(null)}
                                                >
                                                  <div
                                                    data-step-circle
                                                    className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all duration-300 flex-shrink-0 ${isCompleted
                                                      ? 'bg-green-500 text-white ring-2 ring-green-200 dark:ring-green-900/50'
                                                      : isCurrent
                                                        ? 'bg-[#991B1B] text-white ring-2 ring-[var(--glow-color)] animate-pulse'
                                                        : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-2 border-[var(--border-color)]'
                                                      }`}
                                                  >
                                                    {isCompleted ? <CheckCircleIcon className="w-6 h-6" /> : step.stepNumber}
                                                  </div>
                                                  <p className="mt-2 text-xs font-semibold text-[var(--text-primary)] text-center leading-tight">{step.name}</p>
                                                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)] text-center capitalize">
                                                    {step.status?.replace(/_/g, ' ')}
                                                  </p>
                                                  {completedAt && (
                                                    <p className="mt-0.5 text-[10px] text-green-600 dark:text-green-400 font-medium">{completedAt}</p>
                                                  )}
                                                </div>
                                                {idx < report.workflowSteps!.length - 1 && (
                                                  <div className="flex items-center flex-1 min-w-[12px] max-w-[24px] self-center pt-6 shrink-0" style={{ marginTop: '8px' }}>
                                                    <div className={`h-0.5 flex-1 min-w-0 rounded-full transition-colors duration-300 ${isCompleted ? 'bg-green-400 dark:bg-green-600' : 'bg-[var(--border-color)]'}`} />
                                                    <ArrowRightIcon className={`w-4 h-4 flex-shrink-0 -ml-0.5 ${isCompleted ? 'text-green-500' : 'text-[var(--text-muted)]'}`} aria-hidden />
                                                  </div>
                                                )}
                                              </React.Fragment>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-[var(--text-muted)]">No workflow steps defined</p>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Detail/Edit Modal */}
      {selectedReport && (
        <DamageReportModal
          report={selectedReport}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedReport(null);
          }}
          onUpdate={fetchReports}
        />
      )}

      {/* Create Modal */}
      <CreateDamageReportModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchReports();
        }}
      />

      {/* Workflow step tooltip portal (above timeline, never clipped) */}
      {workflowStepTooltip &&
        createPortal(
          <div
            className="fixed w-[260px] z-[9999] pointer-events-none -translate-y-full"
            style={{
              left: workflowStepTooltip.rect.left + workflowStepTooltip.rect.width / 2 - 130,
              top: workflowStepTooltip.rect.top - 8,
            }}
          >
            <div className="w-[260px] bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl rounded-xl p-3">
              {(() => {
                const { step, report } = workflowStepTooltip;
                const isCompleted = step.status === 'completed';
                const isCurrent = step.stepNumber === report.currentStep;
                return (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{step.name}</p>
                        <p className="text-xs text-[var(--text-muted)] capitalize">{step.status?.replace(/_/g, ' ')}</p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${isCompleted
                          ? 'border-green-500/40 text-green-600 dark:text-green-400'
                          : isCurrent
                            ? 'border-[#991B1B]/40 text-[#991B1B]'
                            : 'border-[var(--border-color)] text-[var(--text-muted)]'
                          }`}
                      >
                        Step {step.stepNumber}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                      {workflowStepTooltip.startedAt && (
                        <div className="flex justify-between">
                          <span>Started</span>
                          <span className="text-[var(--text-primary)]">{workflowStepTooltip.startedAt}</span>
                        </div>
                      )}
                      {workflowStepTooltip.completedAt && (
                        <div className="flex justify-between">
                          <span>Completed</span>
                          <span className="text-[var(--text-primary)]">{workflowStepTooltip.completedAt}</span>
                        </div>
                      )}
                    </div>
                    {step.stepNumber === 3 && report.assignedAdjuster?.fullName && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-color)] text-xs">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">Adjuster</span>
                          <span className="text-[var(--text-primary)] font-medium truncate max-w-[160px]">
                            {report.assignedAdjuster.fullName}
                          </span>
                        </div>
                      </div>
                    )}
                    {step.stepNumber === 4 && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-color)] text-xs">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">Budget items</span>
                          <span className="text-[var(--text-primary)] font-medium">
                            {workflowStepTooltip.budgetItems.length}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[var(--text-secondary)]">Budget total</span>
                          <span className="text-[var(--text-primary)] font-medium">
                            ${workflowStepTooltip.budgetTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                    {(step.stepNumber === 5 || step.stepNumber === 6) && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-color)] text-xs">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">Vendors</span>
                          <span className="text-[var(--text-primary)] font-medium">
                            {report.assignedVendors?.length ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[var(--text-secondary)]">In progress</span>
                          <span className="text-[var(--text-primary)] font-medium">
                            {workflowStepTooltip.vendorsInProgress}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[var(--text-secondary)]">Completed</span>
                          <span className="text-[var(--text-primary)] font-medium">
                            {workflowStepTooltip.vendorsCompleted}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
