'use client';

import React, { useState } from 'react';
import { Modal, Button, Input, Select } from '@/components/ui';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  CurrencyDollarIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface CreateDamageReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const defaultMilestones = [
  { name: 'Initial Assessment', status: 'pending', order: 1 },
  { name: 'Insurance Approval', status: 'pending', order: 2 },
  { name: 'Contractor Assignment', status: 'pending', order: 3 },
  { name: 'Repair Work Started', status: 'pending', order: 4 },
  { name: 'Final Inspection', status: 'pending', order: 5 },
  { name: 'Completion & Closeout', status: 'pending', order: 6 },
];

export default function CreateDamageReportModal({ isOpen, onClose, onSuccess }: CreateDamageReportModalProps) {
  const { token, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; file?: File }>>([]);
  const [formData, setFormData] = useState({
    // Property Owner
    propertyOwnerName: '',
    propertyOwnerPhone: '',
    propertyOwnerEmail: '',
    
    // Property Address
    propertyStreet: '',
    propertyCity: '',
    propertyState: '',
    propertyZipCode: '',
    
    // Damage Details
    damageType: '',
    severity: '',
    description: '',
    affectedAreas: [] as string[],
    
    // Financial
    estimatedCost: '',
    fundingSources: {
      insurance: '',
      fema: '',
      floodInsurance: '',
      nonProfit: '',
      consolidatedNonProfit: '',
      selfPay: '',
      other: '',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Build funding sources array
      const fundingSources = [];
      if (formData.fundingSources.insurance) {
        fundingSources.push({ source: 'insurance', amount: parseFloat(formData.fundingSources.insurance) });
      }
      if (formData.fundingSources.fema) {
        fundingSources.push({ source: 'fema', amount: parseFloat(formData.fundingSources.fema) });
      }
      if (formData.fundingSources.floodInsurance) {
        fundingSources.push({ source: 'flood_insurance', amount: parseFloat(formData.fundingSources.floodInsurance) });
      }
      if (formData.fundingSources.nonProfit) {
        fundingSources.push({ source: 'non_profit', amount: parseFloat(formData.fundingSources.nonProfit) });
      }
      if (formData.fundingSources.consolidatedNonProfit) {
        fundingSources.push({ source: 'consolidated_non_profit', amount: parseFloat(formData.fundingSources.consolidatedNonProfit) });
      }
      if (formData.fundingSources.selfPay) {
        fundingSources.push({ source: 'self_pay', amount: parseFloat(formData.fundingSources.selfPay) });
      }
      if (formData.fundingSources.other) {
        fundingSources.push({ source: 'other', amount: parseFloat(formData.fundingSources.other) });
      }

      // Convert uploaded images to base64 URLs
      const images = uploadedImages.map((img, idx) => ({
        url: img.url,
        alt: `Damage photo ${idx + 1}`,
        isPrimary: idx === 0,
      }));

      const payload = {
        propertyOwner: {
          name: formData.propertyOwnerName,
          phone: formData.propertyOwnerPhone,
          email: formData.propertyOwnerEmail || undefined,
        },
        propertyAddress: {
          street: formData.propertyStreet,
          city: formData.propertyCity,
          state: formData.propertyState,
          zipCode: formData.propertyZipCode,
          country: 'USA',
        },
        damageType: formData.damageType,
        severity: formData.severity,
        description: formData.description,
        affectedAreas: formData.affectedAreas,
        estimatedCost: parseFloat(formData.estimatedCost) || 0,
        fundingSources,
        milestones: defaultMilestones,
        images,
        status: 'reported',
      };

      const response = await fetch('/api/damage-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Damage report created successfully');
        // Reset form
        setUploadedImages([]);
        setFormData({
          propertyOwnerName: '',
          propertyOwnerPhone: '',
          propertyOwnerEmail: '',
          propertyStreet: '',
          propertyCity: '',
          propertyState: '',
          propertyZipCode: '',
          damageType: '',
          severity: '',
          description: '',
          affectedAreas: [],
          estimatedCost: '',
          fundingSources: {
            insurance: '',
            fema: '',
            floodInsurance: '',
            nonProfit: '',
            consolidatedNonProfit: '',
            selfPay: '',
            other: '',
          },
        });
        onSuccess();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create damage report');
      }
    } catch (error) {
      toast.error('Error creating damage report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAffectedAreaChange = (value: string) => {
    if (value && !formData.affectedAreas.includes(value)) {
      setFormData({
        ...formData,
        affectedAreas: [...formData.affectedAreas, value],
      });
    }
  };

  const removeAffectedArea = (area: string) => {
    setFormData({
      ...formData,
      affectedAreas: formData.affectedAreas.filter(a => a !== area),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Damage Report"
      subtitle="File a new property damage report for assessment and repair"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Owner Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Property Owner Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Property Owner"
              placeholder="Full name"
              value={formData.propertyOwnerName}
              onChange={(e) => setFormData({ ...formData, propertyOwnerName: e.target.value })}
              required
            />
                    <PhoneInput
                      label="Contact Phone"
                      placeholder="(555) 123-4567"
                      value={formData.propertyOwnerPhone}
                      onChange={(value) => setFormData({ ...formData, propertyOwnerPhone: value || '' })}
                      required
                    />
            <Input
              label="Email (Optional)"
              type="email"
              placeholder="owner@example.com"
              value={formData.propertyOwnerEmail}
              onChange={(e) => setFormData({ ...formData, propertyOwnerEmail: e.target.value })}
            />
          </div>
        </div>

        {/* Property Address */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Property Address</h3>
          <Input
            label="Property Address"
            placeholder="Full property address"
            value={formData.propertyStreet}
            onChange={(e) => setFormData({ ...formData, propertyStreet: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              placeholder="City"
              value={formData.propertyCity}
              onChange={(e) => setFormData({ ...formData, propertyCity: e.target.value })}
              required
            />
            <Input
              label="State"
              placeholder="State"
              value={formData.propertyState}
              onChange={(e) => setFormData({ ...formData, propertyState: e.target.value })}
              required
            />
            <Input
              label="Zip Code"
              placeholder="Zip Code"
              value={formData.propertyZipCode}
              onChange={(e) => setFormData({ ...formData, propertyZipCode: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Damage Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Damage Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Damage Type"
              value={formData.damageType}
              onChange={(value) => setFormData({ ...formData, damageType: value })}
              options={[
                { value: '', label: 'Select type' },
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
              required
            />
            <Select
              label="Severity"
              value={formData.severity}
              onChange={(value) => setFormData({ ...formData, severity: value })}
              options={[
                { value: '', label: 'Select severity' },
                { value: 'minor', label: 'Minor' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'severe', label: 'Severe' },
                { value: 'catastrophic', label: 'Catastrophic' },
              ]}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Damage Description
            </label>
            <textarea
              className="input-field w-full min-h-[100px]"
              placeholder="Describe the damage in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Affected Areas (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Enter affected area (e.g., Roof, Garage)"
                onKeyPress={(e: any) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAffectedAreaChange(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
            </div>
            {formData.affectedAreas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.affectedAreas.map((area, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--bg-input)] rounded-full text-sm"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => removeAffectedArea(area)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Financial Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Financial Details</h3>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Estimated Repair Cost
              </label>
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              required
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Funding Source(s) & Amounts</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    FEMA
                  </label>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.fundingSources.fema}
                  onChange={(e) => setFormData({
                    ...formData,
                    fundingSources: { ...formData.fundingSources, fema: e.target.value },
                  })}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Insurance (Homeowner's Insurance)
                  </label>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.fundingSources.insurance}
                  onChange={(e) => setFormData({
                    ...formData,
                    fundingSources: { ...formData.fundingSources, insurance: e.target.value },
                  })}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Flood Insurance
                  </label>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.fundingSources.floodInsurance}
                  onChange={(e) => setFormData({
                    ...formData,
                    fundingSources: { ...formData.fundingSources, floodInsurance: e.target.value },
                  })}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Non-Profit (R3sults or Other Organizations)
                  </label>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.fundingSources.nonProfit}
                  onChange={(e) => setFormData({
                    ...formData,
                    fundingSources: { ...formData.fundingSources, nonProfit: e.target.value },
                  })}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Self Pay (Personal Payment)
                  </label>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.fundingSources.selfPay}
                  onChange={(e) => setFormData({
                    ...formData,
                    fundingSources: { ...formData.fundingSources, selfPay: e.target.value },
                  })}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Other (Additional Funding Sources)
                  </label>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.fundingSources.other}
                  onChange={(e) => setFormData({
                    ...formData,
                    fundingSources: { ...formData.fundingSources, other: e.target.value },
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <PhotoIcon className="w-5 h-5" />
            Image Upload
          </h3>
          <div className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-6">
            <div className="text-center mb-4">
              <PhotoIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)] mb-2">Upload photos of the damage</p>
              <label className="cursor-pointer inline-block">
                <span className="px-4 py-2 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2">
                  <PhotoIcon className="w-4 h-4" />
                  Choose files
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach((file) => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = reader.result as string;
                        setUploadedImages((prev) => [...prev, { url: base64, file }]);
                      };
                      reader.readAsDataURL(file);
                    });
                  }}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                {uploadedImages.length > 0 ? `${uploadedImages.length} file(s) selected` : 'No file chosen'}
              </p>
            </div>
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {uploadedImages.map((image, idx) => (
                  <div key={idx} className="relative aspect-video bg-[var(--bg-input)] rounded-lg overflow-hidden group">
                    <img
                      src={image.url}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Submit Report
          </Button>
        </div>
      </form>
    </Modal>
  );
}
