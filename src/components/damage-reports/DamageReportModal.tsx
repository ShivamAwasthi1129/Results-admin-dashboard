'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Badge, Button, Input, Select } from '@/components/ui';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  HomeIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface DamageReport {
  _id: string;
  reportNumber: string;
  reportDate: string;
  reportedBy: {
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
    description?: string;
    status?: string;
  }>;
  totalFunding?: number;
  fundingPercentage?: number;
  remainingFunding?: number;
  milestones: Array<{
    name: string;
    status: string;
    completionDate?: string;
    order: number;
    notes?: string;
    history?: Array<{
      status: string;
      changedAt: string;
      changedBy?: string;
      notes?: string;
    }>;
  }>;
  images: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
  contractor?: {
    name: string;
    estimatedTimeline?: string;
    contact?: string;
    email?: string;
    phone?: string;
  };
}

interface DamageReportModalProps {
  report: DamageReport;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

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

const getFundingSourceColor = (source: string) => {
  const colors: Record<string, string> = {
    insurance: 'bg-blue-100 text-blue-700',
    fema: 'bg-green-100 text-green-700',
    flood_insurance: 'bg-cyan-100 text-cyan-700',
    non_profit: 'bg-red-100 text-red-700',
    consolidated_non_profit: 'bg-green-100 text-green-700',
    self_pay: 'bg-yellow-100 text-yellow-700',
    other: 'bg-purple-100 text-purple-700',
  };
  return colors[source] || 'bg-gray-100 text-gray-700';
};

export default function DamageReportModal({ report, isOpen, onClose, onUpdate }: DamageReportModalProps) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'funding' | 'milestones' | 'images'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<DamageReport>>(report);
  const [originalData, setOriginalData] = useState<Partial<DamageReport>>(report);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newAffectedArea, setNewAffectedArea] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ url: string; file?: File }>>([]);

  // Deep comparison function to check if form data has changed
  const hasChanges = useMemo(() => {
    if (!isEditing) return false;
    
    const compareObjects = (obj1: any, obj2: any): boolean => {
      if (obj1 === obj2) return false;
      if (obj1 == null || obj2 == null) return obj1 !== obj2;
      if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 !== obj2;
      
      if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return true;
        return obj1.some((item, idx) => compareObjects(item, obj2[idx]));
      }
      
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      if (keys1.length !== keys2.length) return true;
      
      return keys1.some(key => compareObjects(obj1[key], obj2[key]));
    };
    
    return compareObjects(formData, originalData);
  }, [isEditing, formData, originalData]);

  useEffect(() => {
    setFormData(report);
    setOriginalData(report);
    setIsEditing(false);
  }, [report]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/damage-reports/${report._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Damage report updated successfully');
        setIsEditing(false);
        onUpdate();
        // Auto-close modal after successful save
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update damage report');
      }
    } catch (error) {
      toast.error('Error updating damage report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMilestoneStatusChange = (index: number, newStatus: string) => {
    const updatedMilestones = [...(formData.milestones || [])];
    updatedMilestones[index] = {
      ...updatedMilestones[index],
      status: newStatus,
      completionDate: newStatus === 'completed' ? new Date().toISOString() : undefined,
    };
    setFormData({ ...formData, milestones: updatedMilestones });
  };

  const handleAddFundingSource = () => {
    const newSource = {
      source: 'other',
      amount: 0,
      status: 'pending' as const,
    };
    setFormData({
      ...formData,
      fundingSources: [...(formData.fundingSources || []), newSource],
    });
  };

  const handleRemoveFundingSource = (index: number) => {
    const updated = [...(formData.fundingSources || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, fundingSources: updated });
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      const newImage = {
        url: newImageUrl.trim(),
        alt: `Damage photo ${(formData.images?.length || 0) + 1}`,
        isPrimary: (formData.images?.length || 0) === 0,
      };
      setFormData({
        ...formData,
        images: [...(formData.images || []), newImage],
      });
      setNewImageUrl('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newImage = {
          url: base64,
          alt: `Damage photo ${(formData.images?.length || 0) + uploadedFiles.length + 1}`,
          isPrimary: (formData.images?.length || 0) === 0 && uploadedFiles.length === 0,
        };
        setFormData({
          ...formData,
          images: [...(formData.images || []), newImage],
        });
        setUploadedFiles((prev) => [...prev, { url: base64, file }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    const updated = [...(formData.images || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, images: updated });
  };

  const handleAddAffectedArea = () => {
    if (newAffectedArea.trim() && !formData.affectedAreas?.includes(newAffectedArea.trim())) {
      setFormData({
        ...formData,
        affectedAreas: [...(formData.affectedAreas || []), newAffectedArea.trim()],
      });
      setNewAffectedArea('');
    }
  };

  const handleRemoveAffectedArea = (area: string) => {
    setFormData({
      ...formData,
      affectedAreas: formData.affectedAreas?.filter(a => a !== area) || [],
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalFunding = formData.fundingSources?.reduce((sum, source) => sum + (source.amount || 0), 0) || 0;
  const fundingPercentage = (formData.estimatedCost || 0) > 0 
    ? Math.round((totalFunding / (formData.estimatedCost || 1)) * 100) 
    : 0;
  const remainingFunding = Math.max(0, (formData.estimatedCost || 0) - totalFunding);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={report.reportNumber}
      subtitle={`Reported on ${formatDate(report.reportDate)} by ${report.reportedBy.name}`}
      size="xl"
    >
      <div className="space-y-6">

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[var(--border-color)]">
          {(['overview', 'funding', 'milestones', 'images'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-red-500 text-red-500'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Property Information */}
            <div className="bg-[var(--bg-input)] rounded-lg p-4">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <HomeIcon className="w-5 h-5" />
                Property Information
              </h3>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Owner Name"
                      value={formData.propertyOwner?.name || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        propertyOwner: { ...formData.propertyOwner!, name: e.target.value },
                      })}
                    />
                    <PhoneInput
                      label="Owner Phone"
                      value={formData.propertyOwner?.phone || ''}
                      onChange={(value) => setFormData({
                        ...formData,
                        propertyOwner: { ...formData.propertyOwner!, phone: value || '' },
                      })}
                    />
                    <Input
                      label="Owner Email"
                      type="email"
                      value={formData.propertyOwner?.email || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        propertyOwner: { ...formData.propertyOwner!, email: e.target.value },
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Street Address"
                      value={formData.propertyAddress?.street || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        propertyAddress: { ...formData.propertyAddress!, street: e.target.value },
                      })}
                    />
                    <Input
                      label="City"
                      value={formData.propertyAddress?.city || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        propertyAddress: { ...formData.propertyAddress!, city: e.target.value },
                      })}
                    />
                    <Input
                      label="State"
                      value={formData.propertyAddress?.state || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        propertyAddress: { ...formData.propertyAddress!, state: e.target.value },
                      })}
                    />
                    <Input
                      label="Zip Code"
                      value={formData.propertyAddress?.zipCode || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        propertyAddress: { ...formData.propertyAddress!, zipCode: e.target.value },
                      })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Owner</p>
                    <p className="font-medium text-[var(--text-primary)]">{formData.propertyOwner?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Address</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {formData.propertyAddress?.street}, {formData.propertyAddress?.city}, {formData.propertyAddress?.state} {formData.propertyAddress?.zipCode}
                    </p>
                  </div>
                  {formData.propertyOwner?.phone && (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-sm text-[var(--text-primary)]">{formData.propertyOwner.phone}</span>
                    </div>
                  )}
                  {formData.propertyOwner?.email && (
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-sm text-[var(--text-primary)]">{formData.propertyOwner.email}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Damage Details */}
            <div className="bg-[var(--bg-input)] rounded-lg p-4">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Damage Details
              </h3>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                      label="Damage Type"
                      value={formData.damageType || ''}
                      onChange={(value) => setFormData({ ...formData, damageType: value })}
                      options={[
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
                      value={formData.severity || ''}
                      onChange={(value) => setFormData({ ...formData, severity: value })}
                      options={[
                        { value: 'minor', label: 'Minor' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'severe', label: 'Severe' },
                        { value: 'catastrophic', label: 'Catastrophic' },
                      ]}
                    />
                    <Select
                      label="Status"
                      value={formData.status || ''}
                      onChange={(value) => setFormData({ ...formData, status: value })}
                      options={[
                        { value: 'reported', label: 'Reported' },
                        { value: 'assessed', label: 'Assessed' },
                        { value: 'in_review', label: 'In Review' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Description
                    </label>
                    <textarea
                      className="input-field w-full min-h-[100px]"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Affected Areas
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Enter affected area"
                        value={newAffectedArea}
                        onChange={(e) => setNewAffectedArea(e.target.value)}
                        onKeyPress={(e: any) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAffectedArea();
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddAffectedArea} size="sm">
                        <PlusIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.affectedAreas && formData.affectedAreas.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.affectedAreas.map((area, idx) => (
                          <Badge key={idx} variant="secondary" size="sm" className="flex items-center gap-1">
                            {area}
                            {isEditing && (
                              <button
                                onClick={() => handleRemoveAffectedArea(area)}
                                className="hover:text-red-500"
                              >
                                <XMarkIcon className="w-3 h-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">Type</p>
                      <p className="font-medium text-[var(--text-primary)] capitalize">{formData.damageType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">Severity</p>
                      <Badge variant={getSeverityColor(formData.severity || '') as any} size="sm">
                        {formData.severity ? formData.severity.charAt(0).toUpperCase() + formData.severity.slice(1) : ''}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">Status</p>
                      <Badge variant={getStatusColor(formData.status || '') as any} size="sm">
                        {formData.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-2">Description</p>
                    <p className="text-[var(--text-primary)]">{formData.description}</p>
                  </div>
                  {formData.affectedAreas && formData.affectedAreas.length > 0 && (
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-2">Affected Areas</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.affectedAreas.map((area, idx) => (
                          <Badge key={idx} variant="secondary" size="sm">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contractor Assignment */}
            {isEditing ? (
              <div className="bg-[var(--bg-input)] rounded-lg p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <BuildingOfficeIcon className="w-5 h-5" />
                  Contractor Assignment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contractor Name"
                    value={formData.contractor?.name || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      contractor: { ...formData.contractor, name: e.target.value },
                    })}
                  />
                  <Input
                    label="Estimated Timeline"
                    placeholder="e.g., 6-8 weeks"
                    value={formData.contractor?.estimatedTimeline || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      contractor: { name: formData.contractor?.name || '', ...formData.contractor, estimatedTimeline: e.target.value },
                    })}
                  />
                  <PhoneInput
                    label="Contractor Phone"
                    value={formData.contractor?.phone || ''}
                    onChange={(value) => setFormData({
                      ...formData,
                      contractor: { name: formData.contractor?.name || '', ...formData.contractor, phone: value || '' },
                    })}
                  />
                  <Input
                    label="Contractor Email"
                    type="email"
                    value={formData.contractor?.email || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      contractor: { name: formData.contractor?.name || '', ...formData.contractor, email: e.target.value },
                    })}
                  />
                </div>
              </div>
            ) : formData.contractor && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <BuildingOfficeIcon className="w-5 h-5" />
                  Assigned Contractor
                </h3>
                <p className="text-green-700 font-medium">{formData.contractor.name}</p>
                {formData.contractor.estimatedTimeline && (
                  <p className="text-sm text-green-600 mt-1">
                    Estimated timeline: {formData.contractor.estimatedTimeline}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Funding Tab */}
        {activeTab === 'funding' && (
          <div className="space-y-4">
            {/* Cost Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-input)] rounded-lg p-4">
                <p className="text-sm text-[var(--text-muted)] mb-1">Estimated Cost</p>
                {isEditing ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                    </div>
                    <Input
                      type="number"
                      value={formData.estimatedCost?.toString() || '0'}
                      onChange={(e) => setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    ${(formData.estimatedCost || 0).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="bg-[var(--bg-input)] rounded-lg p-4">
                <p className="text-sm text-[var(--text-muted)] mb-1">Actual Cost</p>
                {isEditing ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                    </div>
                    <Input
                      type="number"
                      value={formData.actualCost?.toString() || ''}
                      onChange={(e) => setFormData({ ...formData, actualCost: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    ${(formData.actualCost || 0).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Funding Sources */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--text-primary)]">Funding Sources</h3>
                {isEditing && (
                  <Button variant="secondary" size="sm" onClick={handleAddFundingSource} leftIcon={<PlusIcon className="w-4 h-4" />}>
                    Add Source
                  </Button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-3">
                  {formData.fundingSources?.map((source, idx) => (
                    <div key={idx} className="bg-[var(--bg-input)] rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                          label="Source"
                          value={source.source}
                          onChange={(value) => {
                            const updated = [...(formData.fundingSources || [])];
                            updated[idx] = { ...updated[idx], source: value };
                            setFormData({ ...formData, fundingSources: updated });
                          }}
                          options={[
                            { value: 'insurance', label: 'Insurance' },
                            { value: 'fema', label: 'FEMA' },
                            { value: 'flood_insurance', label: 'Flood Insurance' },
                            { value: 'non_profit', label: 'Non-Profit' },
                            { value: 'consolidated_non_profit', label: 'Consolidated Non-Profit' },
                            { value: 'self_pay', label: 'Self-Pay' },
                            { value: 'other', label: 'Other' },
                          ]}
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">
                              Amount
                            </label>
                          </div>
                          <Input
                            type="number"
                            value={source.amount.toString()}
                            onChange={(e) => {
                              const updated = [...(formData.fundingSources || [])];
                              updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 };
                              setFormData({ ...formData, fundingSources: updated });
                            }}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveFundingSource(idx)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {formData.fundingSources?.map((source, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg p-3 ${getFundingSourceColor(source.source)}`}
                    >
                      <p className="font-medium">{getFundingSourceLabel(source.source)}</p>
                      <p className="text-lg font-bold">${source.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Funding Progress */}
            <div className="bg-[var(--bg-input)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">Funding Progress</span>
                <span className={`text-lg font-bold ${fundingPercentage >= 100 ? 'text-green-500' : 'text-[var(--text-primary)]'}`}>
                  {fundingPercentage}% Funded
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className={`h-2.5 rounded-full ${fundingPercentage >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(fundingPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Total: ${totalFunding.toLocaleString()}</span>
                <span>Remaining: ${remainingFunding.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Repair Milestones</h3>
            <div className="space-y-3">
              {formData.milestones
                ?.sort((a, b) => a.order - b.order)
                .map((milestone, idx) => {
                  const originalIndex = formData.milestones?.findIndex(m => m.name === milestone.name && m.order === milestone.order) || idx;
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-[var(--bg-input)] rounded-lg space-y-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {milestone.status === 'completed' ? (
                            <CheckCircleIcon className="w-6 h-6 text-green-500" />
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[var(--text-primary)]">{milestone.name}</p>
                          {milestone.completionDate && (
                            <p className="text-sm text-[var(--text-muted)]">
                              Completed: {formatDate(milestone.completionDate)}
                            </p>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="w-48">
                            <Select
                              value={milestone.status}
                              onChange={(value) => handleMilestoneStatusChange(originalIndex, value)}
                              options={[
                                { value: 'pending', label: 'Pending' },
                                { value: 'in_progress', label: 'In Progress' },
                                { value: 'completed', label: 'Completed' },
                                { value: 'cancelled', label: 'Cancelled' },
                              ]}
                            />
                          </div>
                        ) : (
                          <Badge
                            variant={milestone.status === 'completed' ? 'success' : 'secondary'}
                            size="sm"
                          >
                            {milestone.status === 'completed' ? 'Completed' : milestone.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </Badge>
                        )}
                      </div>
                      {/* Milestone History */}
                      {milestone.history && milestone.history.length > 0 && (
                        <div className="ml-10 pl-4 border-l-2 border-[var(--border-color)] space-y-2">
                          <p className="text-xs font-medium text-[var(--text-muted)] uppercase">History</p>
                          {milestone.history
                            .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                            .map((historyItem, histIdx) => (
                              <div key={histIdx} className="text-xs text-[var(--text-muted)]">
                                <span className="font-medium">{historyItem.status.replace('_', ' ')}</span>
                                {' - '}
                                <span>{formatDate(historyItem.changedAt)}</span>
                                {historyItem.notes && (
                                  <>
                                    {' - '}
                                    <span className="italic">{historyItem.notes}</span>
                                  </>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <PhotoIcon className="w-5 h-5" />
                Damage Photos
              </h3>
              {isEditing && (
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2">
                      <PhotoIcon className="w-4 h-4" />
                      Choose files
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Or enter image URL"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="w-48"
                    />
                    <Button onClick={handleAddImage} size="sm" leftIcon={<PlusIcon className="w-4 h-4" />}>
                      Add URL
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {formData.images && formData.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {formData.images.map((image, idx) => (
                  <div key={idx} className="relative aspect-video bg-[var(--bg-input)] rounded-lg overflow-hidden group">
                    <img
                      src={image.url}
                      alt={image.alt || `Damage photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[var(--bg-input)] rounded-lg">
                <PhotoIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)]">No photos uploaded</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons at Bottom */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          {!isEditing ? (
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditing(true);
                setOriginalData({ ...formData });
              }}
              leftIcon={<PencilIcon className="w-4 h-4" />}
            >
              Edit Report
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setFormData(report);
                  setOriginalData(report);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                isLoading={isSaving}
                disabled={!hasChanges || isSaving}
                className={!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}
              >
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
