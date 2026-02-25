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
  ChevronRightIcon,
  UserPlusIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

interface ServiceProvider {
  id: string;
  providerId: string;
  businessName: string;
  category: string;
  contactPerson?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  location?: {
    city?: string;
    state?: string;
  };
}

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
    description?: string;
    status?: string;
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
    completedBy?: string;
    notes?: string;
    statusHistory?: Array<{ status: string; changedAt?: string; changedBy?: { userId: string; name?: string; email?: string; phone?: string } }>;
    stepData?: {
      assignedAdjusterSnapshot?: { adjusterId: string; adjusterDbId?: string; fullName: string; email?: string; phone?: string; companyName?: string; assignedDate?: string; assignedBy?: string };
      inspectionBudget?: Array<{ taskName: string; amount: number }>;
    };
  }>;
  currentStep: number;
  assignedAdjuster?: {
    adjusterId: string;
    adjusterDbId?: string;
    fullName: string;
    email?: string;
    phone?: string;
    companyName?: string;
    approvalStatus: string;
    assignedDate?: string;
    assignedBy?: string;
    inspectionDate?: string;
    inspectionNotes?: string;
    approvalDate?: string;
    approvalNotes?: string;
  };
  assignedVendors: Array<{
    vendorId: string;
    providerId?: string;
    businessName: string;
    taskName?: string;
    contactPerson?: {
      name?: string;
      phone?: string;
      email?: string;
    };
    category?: string;
    workDescription?: string;
    assignedDate?: string;
    assignedBy?: string;
    estimatedCost: number;
    actualCost?: number;
    status: string;
    startDate?: string;
    completionDate?: string;
    completedBy?: string;
    notes?: string;
  }>;
  totalVendorCost?: number;
  vendorWorkProgress?: number;
  images: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
  notes?: string;
  tags?: string[];
  priority?: string;
  insuranceCoverage?: 'uninsured' | 'partially_insured' | 'fully_insured' | null;
  createdAt?: string;
  updatedAt?: string;
}

interface DamageReportModalProps {
  report: DamageReport;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  /** When true, show only Overview + Images; hide Funding/Workflow/Edit; show Step 4 budget with Save */
  viewAsAdjuster?: boolean;
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

export default function DamageReportModal({ report, isOpen, onClose, onUpdate, viewAsAdjuster = false }: DamageReportModalProps) {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'funding' | 'workflow' | 'images'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingStep4, setIsSavingStep4] = useState(false);
  const [formData, setFormData] = useState<Partial<DamageReport>>(report);
  const [originalData, setOriginalData] = useState<Partial<DamageReport>>(report);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newAffectedArea, setNewAffectedArea] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ url: string; file?: File }>>([]);
  const [vendors, setVendors] = useState<ServiceProvider[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [assignedVendorIds, setAssignedVendorIds] = useState<string[]>([]);
  const [adjusters, setAdjusters] = useState<Array<{ id: string; adjusterId: string; firstName: string; lastName: string; email: string; phone?: string; companyName?: string }>>([]);
  const [isLoadingAdjusters, setIsLoadingAdjusters] = useState(false);
  const [showAssignAdjuster, setShowAssignAdjuster] = useState(false);

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

  // Fetch vendors and adjusters when modal opens in edit mode or when switching to workflow tab
  useEffect(() => {
    if (isOpen && token && isEditing) {
      fetchVendors();
      fetchAssignedVendors();
      fetchAdjusters();
    }
  }, [isOpen, token, isEditing, report.id]);

  // Also fetch when switching to workflow tab while editing
  useEffect(() => {
    if (isOpen && token && isEditing && activeTab === 'workflow') {
      if (vendors.length === 0) fetchVendors();
      if (adjusters.length === 0) fetchAdjusters();
    }
  }, [activeTab, isEditing]);

  const fetchVendors = async () => {
    setIsLoadingVendors(true);
    try {
      const response = await fetch('/api/services?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.serviceProviders) {
          setVendors(data.data.serviceProviders);
        }
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setIsLoadingVendors(false);
    }
  };

  const fetchAdjusters = async () => {
    setIsLoadingAdjusters(true);
    try {
      const response = await fetch('/api/adjusters?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.adjusters) {
          setAdjusters(data.data.adjusters);
        }
      }
    } catch (error) {
      console.error('Error fetching adjusters:', error);
    } finally {
      setIsLoadingAdjusters(false);
    }
  };

  const fetchAssignedVendors = async () => {
    try {
      const response = await fetch('/api/damage-reports?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.damageReports) {
          // Get all vendor IDs that are already assigned to OTHER reports (not the current one)
          const assignedIds = data.data.damageReports
            .filter((r: any) => r.vendor?.vendorId && r.id !== report.id)
            .map((r: any) => r.vendor.vendorId);
          setAssignedVendorIds(assignedIds);
        }
      }
    } catch (error) {
      console.error('Error fetching assigned vendors:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Ensure step 4 always has current inspection budget in payload (fixes "no budget items" after save)
      const payload = { ...formData };
      if (payload.workflowSteps && Array.isArray(payload.workflowSteps)) {
        payload.workflowSteps = payload.workflowSteps.map((step) => {
          if (step.stepNumber === 4) {
            const budget = Array.isArray(step.stepData?.inspectionBudget) && step.stepData.inspectionBudget.length > 0
              ? step.stepData.inspectionBudget
              : inspectionBudget;
            return {
              ...step,
              stepData: { ...(step.stepData || {}), inspectionBudget: budget },
            };
          }
          return step;
        });
      }

      const response = await fetch(`/api/damage-reports/${report.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

  const handleSaveStep4Budget = async () => {
    if (!token) return;
    setIsSavingStep4(true);
    try {
      const payload = { ...formData };
      if (payload.workflowSteps && Array.isArray(payload.workflowSteps)) {
        payload.workflowSteps = payload.workflowSteps.map((step) => {
          if (step.stepNumber === 4) {
            const budget = Array.isArray(step.stepData?.inspectionBudget) && step.stepData.inspectionBudget.length > 0
              ? step.stepData.inspectionBudget
              : inspectionBudget;
            return {
              ...step,
              stepData: { ...(step.stepData || {}), inspectionBudget: budget },
            };
          }
          return step;
        });
      }
      const response = await fetch(`/api/damage-reports/${report.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        toast.success('Inspection budget saved');
        onUpdate();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save budget');
      }
    } catch (error) {
      toast.error('Error saving budget');
    } finally {
      setIsSavingStep4(false);
    }
  };

  const handleWorkflowStepStatusChange = (index: number, newStatus: string) => {
    const updatedSteps = [...(formData.workflowSteps || [])];
    const step = updatedSteps[index];
    updatedSteps[index] = {
      ...step,
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
      startedAt: newStatus === 'in_progress' && !step.startedAt ? new Date().toISOString() : step.startedAt,
    };
    const lastCompleted = updatedSteps
      .filter(s => s.status === 'completed')
      .sort((a, b) => b.stepNumber - a.stepNumber)[0];
    const newCurrentStep = lastCompleted ? Math.min(lastCompleted.stepNumber + 1, 7) : 1;
    setFormData({ ...formData, workflowSteps: updatedSteps, currentStep: newCurrentStep });
  };

  const handleAssignAdjuster = (adjuster: { id: string; adjusterId: string; firstName: string; lastName: string; email: string; phone?: string; companyName?: string }) => {
    const fullName = `${adjuster.firstName} ${adjuster.lastName}`;
    const updatedSteps = [...(formData.workflowSteps || [])];
    const step3Index = updatedSteps.findIndex(s => s.stepNumber === 3);
    const step3 = step3Index >= 0 ? updatedSteps[step3Index] : null;
    if (step3) {
      const now = new Date().toISOString();
      updatedSteps[step3Index] = {
        ...step3,
        status: 'completed',
        completedAt: now,
        completedBy: user?.id || '',
        stepData: {
          ...step3.stepData,
          assignedAdjusterSnapshot: {
            adjusterId: adjuster.adjusterId,
            adjusterDbId: adjuster.id,
            fullName,
            email: adjuster.email,
            phone: adjuster.phone,
            companyName: adjuster.companyName,
            assignedDate: now,
            assignedBy: user?.id || '',
          },
        },
      };
    }
    setFormData({
      ...formData,
      assignedAdjuster: {
        adjusterId: adjuster.adjusterId,
        adjusterDbId: adjuster.id,
        fullName,
        email: adjuster.email,
        phone: adjuster.phone,
        companyName: adjuster.companyName,
        assignedDate: new Date().toISOString(),
        assignedBy: user?.id || '',
        approvalStatus: 'pending',
      },
      workflowSteps: updatedSteps,
      currentStep: 4,
    });
    setShowAssignAdjuster(false);
  };

  const inspectionBudget = formData.workflowSteps?.find(s => s.stepNumber === 4)?.stepData?.inspectionBudget || [];
  const setInspectionBudget = (items: Array<{ taskName: string; amount: number }>) => {
    setFormData((prev) => {
      const steps = [...(prev.workflowSteps || [])];
      const step4Index = steps.findIndex((s) => s.stepNumber === 4);
      if (step4Index < 0) return prev;
      const step4 = steps[step4Index];
      steps[step4Index] = {
        ...step4,
        stepData: { ...(step4.stepData || {}), inspectionBudget: items },
      };
      return { ...prev, workflowSteps: steps };
    });
  };

  const handleAddInspectionBudgetRow = () => {
    setInspectionBudget([...inspectionBudget, { taskName: '', amount: 0 }]);
  };
  const handleUpdateInspectionBudgetRow = (idx: number, field: 'taskName' | 'amount', value: string | number) => {
    const next = [...inspectionBudget];
    next[idx] = { ...next[idx], [field]: field === 'amount' ? Number(value) || 0 : value };
    setInspectionBudget(next);
  };
  const handleRemoveInspectionBudgetRow = (idx: number) => {
    setInspectionBudget(inspectionBudget.filter((_, i) => i !== idx));
  };

  const handleAssignVendorToTask = (taskName: string, vendor: ServiceProvider | null) => {
    const existing = formData.assignedVendors || [];
    const without = existing.filter(v => v.taskName !== taskName);
    if (!vendor) {
      setFormData({ ...formData, assignedVendors: without });
      return;
    }
    const newVendor = {
      vendorId: vendor.id,
      providerId: (vendor as any).providerId,
      businessName: vendor.businessName,
      taskName,
      category: vendor.category,
      assignedDate: new Date().toISOString(),
      assignedBy: user?.id || '',
      estimatedCost: inspectionBudget.find(b => b.taskName === taskName)?.amount || 0,
      status: 'assigned' as const,
    };
    setFormData({ ...formData, assignedVendors: [...without, newVendor] });
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

  const tabs = viewAsAdjuster ? (['overview', 'images'] as const) : (['overview', 'funding', 'workflow', 'images'] as const);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={report.reportNumber}
      subtitle={`Reported on ${formatDate(report.reportDate)} by ${report.reportedBy?.name}`}
      size="xl"
    >
      <div className="space-y-6">

        {/* Tabs */}
        <div className="flex gap-1 border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 font-semibold text-sm transition-all duration-200 rounded-lg ${
                activeTab === tab
                  ? 'bg-[#991B1B] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Customer Information */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <h3 className="font-bold text-base text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="p-1.5 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] inline-flex">
                  <HomeIcon className="w-5 h-5 text-[#991B1B]" />
                </span>
                Customer & Property Information
              </h3>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] mb-4">
                    <p className="text-sm text-[var(--text-primary)]">Customer: {formData.customer?.firstName} {formData.customer?.lastName}</p>
                    <p className="text-xs text-[var(--text-muted)]">ID: {formData.customer?.customerId?.slice(-8)}</p>
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
                    <p className="text-sm text-[var(--text-muted)]">Customer</p>
                    <p className="font-medium text-[var(--text-primary)]">{formData.customer?.firstName} {formData.customer?.lastName}</p>
                    <p className="text-xs text-[var(--text-muted)]">ID: {formData.customer?.customerId?.slice(-8)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Property Address</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {formData.propertyAddress?.street}, {formData.propertyAddress?.city}, {formData.propertyAddress?.state} {formData.propertyAddress?.zipCode}
                    </p>
                  </div>
                  {formData.customer?.phone && (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-sm text-[var(--text-primary)]">{formData.customer.phone}</span>
                    </div>
                  )}
                  {formData.customer?.email && (
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-sm text-[var(--text-primary)]">{formData.customer.email}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Damage Details */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <h3 className="font-bold text-base text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span className="p-1.5 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] inline-flex">
                  <DocumentTextIcon className="w-5 h-5 text-[#991B1B]" />
                </span>
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
                      label="Insurance Coverage"
                      value={formData.insuranceCoverage || ''}
                      onChange={(value) => setFormData({ ...formData, insuranceCoverage: value === '' ? undefined : value as 'uninsured' | 'partially_insured' | 'fully_insured' })}
                      options={[
                        { value: '', label: 'Not specified' },
                        { value: 'uninsured', label: 'Uninsured' },
                        { value: 'partially_insured', label: 'Partially insured' },
                        { value: 'fully_insured', label: 'Fully insured' },
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
                    {formData.insuranceCoverage && (
                      <div>
                        <p className="text-sm text-[var(--text-muted)]">Insurance</p>
                        <p className="font-medium text-[var(--text-primary)] capitalize">
                          {formData.insuranceCoverage.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
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

            {/* Assigned Vendors */}
            {formData.assignedVendors && formData.assignedVendors.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <BuildingOfficeIcon className="w-5 h-5" />
                  Assigned Vendors ({formData.assignedVendors.length})
                </h3>
                <div className="space-y-3">
                  {formData.assignedVendors.map((vendor, idx) => (
                    <div key={idx} className="bg-white dark:bg-[var(--bg-secondary)] rounded p-3 border border-blue-100 dark:border-blue-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{vendor.businessName}</p>
                          {vendor.category && (
                            <p className="text-sm text-[var(--text-muted)]">{vendor.category}</p>
                          )}
                        </div>
                        <Badge 
                          variant={vendor.status === 'completed' ? 'success' : vendor.status === 'in_progress' ? 'warning' : 'secondary'} 
                          size="sm"
                        >
                          {vendor.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-[var(--text-muted)]">
                        Est. Cost: ${vendor.estimatedCost?.toLocaleString() || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Adjuster */}
            {formData.assignedAdjuster && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  Assigned Adjuster
                </h3>
                <p className="font-medium text-[var(--text-primary)]">{formData.assignedAdjuster.fullName}</p>
                {formData.assignedAdjuster.companyName && (
                  <p className="text-sm text-[var(--text-muted)]">{formData.assignedAdjuster.companyName}</p>
                )}
                <Badge 
                  variant={formData.assignedAdjuster.approvalStatus === 'approved' ? 'success' : 'warning'} 
                  size="sm"
                  className="mt-2"
                >
                  {formData.assignedAdjuster.approvalStatus?.replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
            )}

            {/* Adjuster: Step 4 Inspection Budget (editable + Save) */}
            {viewAsAdjuster && (
              <div className="mt-4 pt-4 border-t border-[var(--border-color)] bg-[var(--bg-input)]/30 rounded-lg p-4">
                <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-3">
                  <span className="p-1 bg-[var(--bg-card)] rounded border border-[var(--border-color)] inline-flex">
                    <CurrencyDollarIcon className="w-4 h-4 text-[#991B1B]" />
                  </span>
                  Inspection Budget (Step 4)
                </div>
                <div className="space-y-2">
                  {inspectionBudget.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
                      <Input
                        placeholder="Task name (e.g. Roof Repair)"
                        value={row.taskName}
                        onChange={(e) => handleUpdateInspectionBudgetRow(rowIdx, 'taskName', e.target.value)}
                        className="flex-1"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={row.amount || ''}
                          onChange={(e) => handleUpdateInspectionBudgetRow(rowIdx, 'amount', e.target.value)}
                          className="pl-7"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInspectionBudgetRow(rowIdx)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 mt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<PlusIcon className="w-4 h-4" />}
                      onClick={handleAddInspectionBudgetRow}
                    >
                      Add Budget Item
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveStep4Budget}
                      isLoading={isSavingStep4}
                      disabled={isSavingStep4}
                    >
                      Save Budget
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Funding Tab */}
        {activeTab === 'funding' && (
          <div className="space-y-4">
            {/* Cost Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Estimated Cost</p>
                {isEditing ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CurrencyDollarIcon className="w-5 h-5 text-[#991B1B]" />
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
              <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Actual Cost</p>
                {isEditing ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CurrencyDollarIcon className="w-5 h-5 text-[#991B1B]" />
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
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                  <span className="p-1.5 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] inline-flex">
                    <CurrencyDollarIcon className="w-5 h-5 text-[#991B1B]" />
                  </span>
                  Funding Sources
                </h3>
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
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <div className="p-1 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)]">
                    <CheckCircleIcon className="w-4 h-4 text-[#991B1B]" />
                  </div>
                  Funding Progress
                </span>
                <span className={`text-xl font-bold ${fundingPercentage >= 100 ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-primary)]'}`}>
                  {fundingPercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${
                    fundingPercentage >= 100 
                      ? 'bg-green-500' 
                      : 'bg-[#991B1B]'
                  }`}
                  style={{ width: `${Math.min(fundingPercentage, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--text-primary)]">Total: ${totalFunding.toLocaleString()}</span>
                <span className={`font-medium ${remainingFunding > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                  {remainingFunding > 0 ? `Remaining: $${remainingFunding.toLocaleString()}` : 'Fully Funded'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Steps Tab - Redesigned Timeline */}
        {activeTab === 'workflow' && (
          <div className="space-y-6">
            {/* Progress Summary */}
            <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--text-primary)]">Workflow Progress</h3>
                <span className="text-sm font-medium px-3 py-1 rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                  Step {formData.currentStep || 1} of 7
                </span>
              </div>
              {/* Progress bar */}
              <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-[#991B1B] transition-all duration-500"
                  style={{ width: `${((formData.workflowSteps?.filter(s => s.status === 'completed').length || 0) / 7) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
                <span>{formData.workflowSteps?.filter(s => s.status === 'completed').length || 0} completed</span>
                <span>{formData.workflowSteps?.filter(s => s.status === 'in_progress').length || 0} in progress</span>
                <span>{formData.workflowSteps?.filter(s => s.status === 'pending').length || 0} pending</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {formData.workflowSteps
                ?.sort((a, b) => a.stepNumber - b.stepNumber)
                .map((step, idx) => {
                  const isStep1 = step.stepNumber === 1;
                  const isStep2 = step.stepNumber === 2;
                  const isStep3 = step.stepNumber === 3;
                  const isStep4 = step.stepNumber === 4;
                  const isStep5 = step.stepNumber === 5;
                  const isStep6 = step.stepNumber === 6;
                  const isStep7 = step.stepNumber === 7;
                  const isCurrent = step.stepNumber === formData.currentStep;
                  const isLast = idx === (formData.workflowSteps?.length || 0) - 1;

                  const getStepIcon = () => {
                    if (step.status === 'completed') return <CheckCircleIcon className="w-5 h-5" />;
                    if (step.status === 'in_progress') return <ClockIcon className="w-5 h-5" />;
                    return <span className="text-sm font-bold">{step.stepNumber}</span>;
                  };

                  const getStepColor = () => {
                    if (step.status === 'completed') return 'bg-green-500 text-white border-green-500';
                    if (step.status === 'in_progress') return 'bg-[#991B1B] text-white border-[#991B1B]';
                    if (step.status === 'skipped') return 'bg-gray-400 text-white border-gray-400';
                    return 'bg-white dark:bg-gray-800 text-gray-400 border-gray-300 dark:border-gray-600';
                  };

                  return (
                    <div key={idx} className="relative flex gap-4">
                      {/* Timeline line */}
                      {!isLast && (
                        <div className="absolute left-5 top-10 w-0.5 h-full -translate-x-1/2 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700" />
                      )}

                      {/* Step indicator */}
                      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${getStepColor()} ${isCurrent ? 'ring-4 ring-[var(--glow-color)]' : ''}`}>
                        {getStepIcon()}
                      </div>

                      {/* Step content */}
                      <div className={`flex-1 pb-8 ${isLast ? 'pb-0' : ''}`}>
                        <div className={`p-5 rounded-xl border-2 transition-all shadow-sm ${
                          isCurrent 
                            ? 'border-[#991B1B] bg-[var(--bg-card)] shadow-lg' 
                            : step.status === 'completed'
                              ? 'border-green-600/40 bg-[var(--bg-card)]'
                              : 'border-[var(--border-color)] bg-[var(--bg-card)]'
                        }`}>
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                {step.name}
                                {isCurrent && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-color)]">Current</span>}
                              </h4>
                              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                                {step.startedAt && <span>Started: {formatDate(step.startedAt)}</span>}
                                {step.completedAt && <span>Completed: {formatDate(step.completedAt)}</span>}
                                {step.completedBy && <span>By: {step.completedBy}</span>}
                              </div>
                            </div>
                            {/* Status control */}
                            {isStep1 ? (
                              <Badge variant="success" size="sm" className="whitespace-nowrap">Completed</Badge>
                            ) : isEditing && !isStep3 ? (
                              <Select
                                value={step.status}
                                onChange={(value) => handleWorkflowStepStatusChange(idx, value)}
                                options={[
                                  { value: 'pending', label: 'Pending' },
                                  { value: 'in_progress', label: 'In Progress' },
                                  { value: 'completed', label: 'Completed' },
                                  { value: 'skipped', label: 'Skipped' },
                                ]}
                                className="w-36"
                              />
                            ) : (
                              <Badge
                                variant={step.status === 'completed' ? 'success' : step.status === 'in_progress' ? 'info' : step.status === 'skipped' ? 'secondary' : 'warning'}
                                size="sm"
                                className="whitespace-nowrap"
                              >
                                {step.status === 'completed' ? 'Completed' : step.status === 'in_progress' ? 'In Progress' : step.status === 'skipped' ? 'Skipped' : 'Pending'}
                              </Badge>
                            )}
                          </div>

                          {/* Step 2: Under Review - Status History */}
                          {isStep2 && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Status Change History</p>
                              {step.statusHistory && step.statusHistory.length > 0 ? (
                                <div className="space-y-2">
                                  {step.statusHistory.map((h, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-[var(--bg-secondary)]">
                                      <div className={`w-2 h-2 rounded-full ${h.status === 'completed' ? 'bg-green-500' : h.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                                      <span className="font-medium capitalize">{h.status.replace('_', ' ')}</span>
                                      <span className="text-[var(--text-muted)]">by</span>
                                      <span className="font-medium">{h.changedBy?.name || h.changedBy?.email || 'Admin'}</span>
                                      {h.changedBy?.email && <span className="text-[var(--text-muted)]">({h.changedBy.email})</span>}
                                      <span className="ml-auto text-[var(--text-muted)]">{h.changedAt ? formatDate(h.changedAt) : ''}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-[var(--text-muted)] italic">No status changes recorded yet</p>
                              )}
                            </div>
                          )}

                          {/* Step 3: Assign Adjuster */}
                          {isStep3 && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Assigned Adjuster</p>
                              {formData.assignedAdjuster ? (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600 dark:text-green-300 font-semibold">
                                    {formData.assignedAdjuster.fullName?.split(' ').map(n => n[0]).join('') || 'A'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[var(--text-primary)]">{formData.assignedAdjuster.fullName}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                                      {formData.assignedAdjuster.email && <span className="flex items-center gap-1"><EnvelopeIcon className="w-3 h-3" />{formData.assignedAdjuster.email}</span>}
                                      {formData.assignedAdjuster.phone && <span className="flex items-center gap-1"><PhoneIcon className="w-3 h-3" />{formData.assignedAdjuster.phone}</span>}
                                      {formData.assignedAdjuster.companyName && <span className="flex items-center gap-1"><BuildingOfficeIcon className="w-3 h-3" />{formData.assignedAdjuster.companyName}</span>}
                                    </div>
                                    {formData.assignedAdjuster.assignedDate && (
                                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">Assigned: {formatDate(formData.assignedAdjuster.assignedDate)}</p>
                                    )}
                                  </div>
                                  {isEditing && (
                                    <Button size="sm" variant="ghost" onClick={() => { setShowAssignAdjuster(true); fetchAdjusters(); }}>Change</Button>
                                  )}
                                </div>
                              ) : isEditing ? (
                                <div>
                                  <Button size="sm" leftIcon={<UserPlusIcon className="w-4 h-4" />} onClick={() => { setShowAssignAdjuster(true); fetchAdjusters(); }}>
                                    Assign Adjuster
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-sm text-[var(--text-muted)] italic">No adjuster assigned</p>
                              )}
                              {/* Adjuster selection modal */}
                              {showAssignAdjuster && (
                                <div className="mt-3 p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)]">
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="font-medium text-sm">Select Adjuster</p>
                                    <button onClick={() => setShowAssignAdjuster(false)} className="p-1 hover:bg-[var(--bg-primary)] rounded"><XMarkIcon className="w-4 h-4" /></button>
                                  </div>
                                  {isLoadingAdjusters ? (
                                    <div className="flex items-center justify-center py-4 gap-2 text-[var(--text-muted)]">
                                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                                      <span>Loading adjusters...</span>
                                    </div>
                                  ) : adjusters.length === 0 ? (
                                    <p className="text-center py-4 text-[var(--text-muted)]">No adjusters found</p>
                                  ) : (
                                    <div className="grid gap-2 max-h-60 overflow-y-auto">
                                      {adjusters.map((adj) => (
                                        <button
                                          key={adj.id}
                                          type="button"
                                          onClick={() => handleAssignAdjuster(adj)}
                                          className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-color)] hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                                        >
                                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 font-medium text-sm">
                                            {adj.firstName[0]}{adj.lastName[0]}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{adj.firstName} {adj.lastName}</p>
                                            <p className="text-xs text-[var(--text-muted)] truncate">{adj.email}</p>
                                          </div>
                                          {adj.companyName && <span className="text-xs text-[var(--text-muted)]">{adj.companyName}</span>}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Step 4: Inspection Budget */}
                          {isStep4 && (
                            <div className="mt-4 pt-4 border-t border-[var(--border-color)] bg-[var(--bg-input)]/30 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                                  <span className="p-1 bg-[var(--bg-card)] rounded border border-[var(--border-color)] inline-flex">
                                    <CurrencyDollarIcon className="w-4 h-4 text-[#991B1B]" />
                                  </span>
                                  Inspection Budget
                                </div>
                                {inspectionBudget.length > 0 && (
                                  <span className="text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-card)] px-3 py-1 rounded-full border border-[var(--border-color)]">
                                    Total: ${inspectionBudget.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {isEditing ? (
                                <div className="space-y-2">
                                  {inspectionBudget.map((row, rowIdx) => (
                                    <div key={rowIdx} className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
                                      <Input
                                        placeholder="Task name (e.g. Roof Repair)"
                                        value={row.taskName}
                                        onChange={(e) => handleUpdateInspectionBudgetRow(rowIdx, 'taskName', e.target.value)}
                                        className="flex-1"
                                      />
                                      <div className="relative w-32">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                                        <Input
                                          type="number"
                                          placeholder="0"
                                          value={row.amount || ''}
                                          onChange={(e) => handleUpdateInspectionBudgetRow(rowIdx, 'amount', e.target.value)}
                                          className="pl-7"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveInspectionBudgetRow(rowIdx)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                  <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    leftIcon={<PlusIcon className="w-4 h-4" />} 
                                    onClick={handleAddInspectionBudgetRow}
                                    className="mt-2"
                                  >
                                    Add Budget Item
                                  </Button>
                                </div>
                              ) : (
                                <div>
                                  {inspectionBudget.length === 0 ? (
                                    <p className="text-sm text-[var(--text-muted)] italic">No budget items added</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {inspectionBudget.map((row, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)]">
                                          <span className="text-sm font-medium">{row.taskName}</span>
                                          <span className="text-sm text-green-600 dark:text-green-400 font-medium">${(row.amount || 0).toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Step 5: Assign Vendors */}
                          {isStep5 && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Vendor Assignments (per task)</p>
                              {inspectionBudget.length === 0 ? (
                                <p className="text-sm text-[var(--text-muted)] italic">Complete Step 4 first to add budget tasks</p>
                              ) : isEditing ? (
                                <div className="space-y-3">
                                  {isLoadingVendors && (
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                      Loading vendors...
                                    </div>
                                  )}
                                  {inspectionBudget.map((row, rowIdx) => {
                                    const assigned = formData.assignedVendors?.find(v => v.taskName === row.taskName);
                                    return (
                                      <div key={`budget-vendor-${rowIdx}`} className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-sm">{row.taskName}</span>
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300">${(row.amount || 0).toLocaleString()}</span>
                                        </div>
                                        <Select
                                          value={assigned?.vendorId || ''}
                                          onChange={(value) => {
                                            const v = vendors.find(vnd => vnd.id === value);
                                            handleAssignVendorToTask(row.taskName, v || null);
                                          }}
                                          options={[
                                            { value: '', label: '-- Select Vendor --' },
                                            ...vendors.map(v => ({ value: v.id, label: `${v.businessName} (${v.category || 'General'})` })),
                                          ]}
                                        />
                                        {assigned && (
                                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Assigned to: {assigned.businessName}</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div>
                                  {(!formData.assignedVendors?.length || formData.assignedVendors.every(v => !v.taskName)) ? (
                                    <p className="text-sm text-[var(--text-muted)] italic">No vendors assigned</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {formData.assignedVendors?.filter(v => v.taskName).map((v, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)]">
                                          <div>
                                            <p className="text-sm font-medium">{v.taskName}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{v.businessName}</p>
                                          </div>
                                          <Badge variant="success" size="sm">Assigned</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Step 6: Vendor Work */}
                          {isStep6 && formData.assignedVendors && formData.assignedVendors.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Vendor Work Status</p>
                              <div className="space-y-2">
                                {formData.assignedVendors.map((v, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)]">
                                    <div>
                                      <p className="text-sm font-medium">{v.taskName || 'General Work'}</p>
                                      <p className="text-xs text-[var(--text-muted)]">{v.businessName}</p>
                                    </div>
                                    <Badge
                                      variant={v.status === 'completed' ? 'success' : v.status === 'in_progress' ? 'info' : 'warning'}
                                      size="sm"
                                    >
                                      {v.status === 'completed' ? 'Completed' : v.status === 'in_progress' ? 'In Progress' : 'Assigned'}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Step 7: Completed */}
                          {isStep7 && step.status === 'completed' && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                <div>
                                  <p className="font-medium text-green-700 dark:text-green-300">All work completed!</p>
                                  {step.completedAt && <p className="text-xs text-green-600 dark:text-green-400">Completed on: {formatDate(step.completedAt)}</p>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
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

        {/* Action Buttons at Bottom (hidden for adjuster view) */}
        {!viewAsAdjuster && (
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
        )}
      </div>
    </Modal>
  );
}
