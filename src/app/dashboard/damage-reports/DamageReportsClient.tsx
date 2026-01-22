'use client';

import React, { useState, useEffect } from 'react';
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
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import DamageReportModal from '@/components/damage-reports/DamageReportModal';
import CreateDamageReportModal from '@/components/damage-reports/CreateDamageReportModal';

interface DamageReport {
  _id: string;
  id: string;
  reportNumber: string;
  reportDate: string;
  reportedBy: {
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  propertyOwner: {
    name: string;
    phone: string;
    email?: string;
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
  milestones: Array<{
    name: string;
    status: string;
    completionDate?: string;
    order: number;
  }>;
  images: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
  contractor?: {
    name: string;
    estimatedTimeline?: string;
  };
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
    other: '⚠️',
  };
  return icons[type] || '⚠️';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    reported: 'info',
    assessed: 'warning',
    in_review: 'warning',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  };
  return colors[status] || 'secondary';
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
  const { token } = useAuth();
  const [reports, setReports] = useState<DamageReport[]>(initialReports);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [damageTypeFilter, setDamageTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch reports
  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/damage-reports`
        : 'http://localhost:3000/api/damage-reports';

      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (damageTypeFilter !== 'all') params.append('damageType', damageTypeFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
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
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/damage-reports/${id}`
        : `http://localhost:3000/api/damage-reports/${id}`;

      const response = await fetch(apiUrl, {
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
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    if (damageTypeFilter !== 'all' && report.damageType !== damageTypeFilter) return false;
    if (severityFilter !== 'all' && report.severity !== severityFilter) return false;
    return true;
  });

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6" />
            Damage Reports
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage property damage reports and track repair progress
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          leftIcon={<PlusIcon className="w-5 h-5" />}
        >
          Create Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <Input
                type="text"
                label="Search"
                placeholder="Search by report number, owner, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
              { value: 'all', label: 'All' },
              { value: 'reported', label: 'Reported' },
              { value: 'assessed', label: 'Assessed' },
              { value: 'in_review', label: 'In Review' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <Select
            label="Damage Type"
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
              { value: 'other', label: 'Other' },
            ]}
          />
          <Select
            label="Severity"
            value={severityFilter}
            onChange={setSeverityFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'minor', label: 'Minor' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'severe', label: 'Severe' },
              { value: 'catastrophic', label: 'Catastrophic' },
            ]}
          />
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
          Showing {filteredReports.length} of {reports.length} reports
        </div>
      </Card>

      {/* Reports Table */}
      <Card className="p-0">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="mt-4 text-[var(--text-muted)]">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <DocumentTextIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">
              {searchQuery || statusFilter !== 'all' || damageTypeFilter !== 'all' || severityFilter !== 'all'
                ? 'No reports found matching your filters.'
                : 'No damage reports found. Create your first report to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-input)]">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Report ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Damage Type</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Severity</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Owner</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Property Address</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Est. Cost</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Funding</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const fundingPercentage = report.fundingPercentage || 0;
                  const isExpanded = expandedRows.has(report._id);
                  const totalFunding = report.fundingSources?.reduce((sum, source) => sum + (source.amount || 0), 0) || 0;
                  const remainingFunding = Math.max(0, (report.estimatedCost || 0) - totalFunding);

                  return (
                    <React.Fragment key={report._id}>
                      <tr className="hover:bg-[var(--bg-secondary)]/60 transition-all duration-200 group border-b border-[var(--border-color)]/50">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(report._id)}
                              className="p-1 -ml-1"
                            >
                              {isExpanded ? (
                                <ChevronUpIcon className="w-4 h-4 text-[var(--text-muted)]" />
                              ) : (
                                <ChevronDownIcon className="w-4 h-4 text-[var(--text-muted)]" />
                              )}
                            </Button>
                            <span className="text-lg">{getDamageTypeIcon(report.damageType)}</span>
                            <span className="font-medium text-sm text-[var(--text-primary)]">{report.reportNumber}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {new Date(report.reportDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={getStatusColor(report.status) as any} size="sm">
                            {report.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <span className="capitalize text-sm text-[var(--text-primary)]">{report.damageType}</span>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={getSeverityColor(report.severity) as any} size="sm">
                            {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-sm text-[var(--text-primary)]">{report.propertyOwner.name}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-sm text-[var(--text-muted)] truncate max-w-[200px] block">
                            {report.propertyAddress.street}, {report.propertyAddress.city}, {report.propertyAddress.state} {report.propertyAddress.zipCode.slice(0, 2)}...
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-semibold text-sm text-[var(--text-primary)]">
                            ${report.estimatedCost.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm ${fundingPercentage >= 100 ? 'text-green-500' : 'text-[var(--text-primary)]'}`}>
                              {fundingPercentage}%
                            </span>
                            {fundingPercentage >= 100 && (
                              <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                setShowDetailModal(true);
                              }}
                              className="p-1"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                setShowDetailModal(true);
                              }}
                              className="p-1"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(report._id)}
                              className="p-1 text-red-500 hover:text-red-600"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="px-3 py-6 bg-[var(--bg-input)]/30">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Contact Information */}
                              <div>
                                <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                                  <MapPinIcon className="w-4 h-4" />
                                  Contact Information
                                </h4>
                                <div className="space-y-2 text-sm">
                                  {report.propertyOwner.phone && (
                                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                                      <PhoneIcon className="w-4 h-4 text-[var(--text-muted)]" />
                                      <span>{report.propertyOwner.phone}</span>
                                    </div>
                                  )}
                                  {report.propertyOwner.email && (
                                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                                      <EnvelopeIcon className="w-4 h-4 text-[var(--text-muted)]" />
                                      <span>{report.propertyOwner.email}</span>
                                    </div>
                                  )}
                                  <div className="text-[var(--text-primary)]">
                                    {report.propertyAddress.street}, {report.propertyAddress.city}, {report.propertyAddress.state} {report.propertyAddress.zipCode}
                                  </div>
                                </div>
                              </div>

                              {/* Damage Details */}
                              <div>
                                <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                                  <DocumentTextIcon className="w-4 h-4" />
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

                              {/* Funding Summary */}
                              <div>
                                <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                                  <CurrencyDollarIcon className="w-4 h-4" />
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

                            {/* Progress Milestones */}
                            <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                              <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4" />
                                Progress Milestones
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                {report.milestones
                                  ?.sort((a, b) => a.order - b.order)
                                  .map((milestone, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <div className="flex-shrink-0 mt-0.5">
                                        {milestone.status === 'completed' ? (
                                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-[var(--text-primary)]">{milestone.name}</p>
                                        {milestone.completionDate && (
                                          <p className="text-xs text-[var(--text-muted)] mt-1">
                                            {formatDate(milestone.completionDate)}
                                          </p>
                                        )}
                                        <Badge
                                          variant={milestone.status === 'completed' ? 'success' : 'secondary'}
                                          size="sm"
                                          className="mt-1"
                                        >
                                          {milestone.status === 'completed' ? 'Completed' : milestone.status === 'in_progress' ? 'In Progress' : 'Pending'}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
