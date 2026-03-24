'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Button, Input, Select } from '@/components/ui';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAuth } from '@/context/AuthContext';
import { useCustomersCache } from '@/context/CustomersCacheContext';
import { toast } from 'react-toastify';
import {
  CurrencyDollarIcon,
  PhotoIcon,
  XMarkIcon,
  UserIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface CreateDamageReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type CustomerAddress = {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  zipCode?: string;
};

interface Customer {
  id?: string;
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: CustomerAddress;
  /** When a customer has multiple addresses, use this list; otherwise address is used. */
  addresses?: CustomerAddress[];
}

/** User shape from /api/admin/users (same as User Management). */
interface ApiUserAddress {
  id?: string;
  label?: string | null;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  isDefault?: boolean;
}
interface ApiUser {
  id?: string;
  _id?: string;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  addresses?: ApiUserAddress[];
}

/** Map API user to Customer for damage report; supports multiple addresses. */
function mapApiUserToCustomer(user: ApiUser): Customer {
  const parts = (user.fullName || user.email || 'Unknown').trim().split(/\s+/);
  const firstName = parts[0] || 'Unknown';
  const lastName = parts.slice(1).join(' ') || '';
  const id = user.id || user._id || '';

  if (user.addresses && user.addresses.length > 0) {
    const addresses: CustomerAddress[] = user.addresses.map((a) => ({
      street: a.address ?? undefined,
      city: a.city ?? undefined,
      state: a.state ?? undefined,
      pincode: a.pincode ?? undefined,
      zipCode: a.pincode ?? undefined,
    }));
    const single = user.addresses.find((a) => a.isDefault) || user.addresses[0];
    return {
      _id: id,
      id,
      firstName,
      lastName,
      email: user.email ?? '',
      phone: user.phoneNumber ?? undefined,
      address: {
        street: single?.address,
        city: single?.city,
        state: single?.state,
        pincode: single?.pincode,
        zipCode: single?.pincode,
      },
      addresses,
    };
  }

  const hasLegacy = user.address || user.city || user.state || user.pincode;
  const address: CustomerAddress | undefined = hasLegacy
    ? {
        street: user.address ?? undefined,
        city: user.city ?? undefined,
        state: user.state ?? undefined,
        pincode: user.pincode ?? undefined,
        zipCode: user.pincode ?? undefined,
      }
    : undefined;

  return {
    _id: id,
    id,
    firstName,
    lastName,
    email: user.email ?? '',
    phone: user.phoneNumber ?? undefined,
    address,
  };
}

export default function CreateDamageReportModal({ isOpen, onClose, onSuccess }: CreateDamageReportModalProps) {
  const router = useRouter();
  const { token, user } = useAuth();
  const cache = useCustomersCache();
  const cachedCustomers = cache?.customers ?? [];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; file?: File }>>([]);
  
  // Customer selection: show cached first, then replace with API response
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  /** When customer has multiple addresses, admin selects one; this is that chosen address. */
  const [selectedCustomerAddress, setSelectedCustomerAddress] = useState<CustomerAddress | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Normalize customer addresses: prefer addresses[] array, fallback to single address
  const getCustomerAddressList = (customer: Customer | null): CustomerAddress[] => {
    if (!customer) return [];
    if (customer.addresses?.length) return customer.addresses;
    if (customer.address) return [customer.address];
    return [];
  };
  const customerAddressList = getCustomerAddressList(selectedCustomer);
  
  const [formData, setFormData] = useState({
    // Property Address (can be different from customer address)
    propertyStreet: '',
    propertyCity: '',
    propertyState: '',
    propertyZipCode: '',
    
    // Damage Details
    damageType: '',
    severity: '',
    insuranceCoverage: '' as '' | 'uninsured' | 'partially_insured' | 'fully_insured',
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

  // When modal opens: show cached customers immediately, then fetch full list from API
  useEffect(() => {
    if (!isOpen) return;
    if (cachedCustomers?.length) {
      setCustomers(cachedCustomers as Customer[]);
    }
    if (token) {
      fetchCustomers();
    }
  }, [isOpen, token]);

  // Handle click outside customer dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCustomers = async () => {
    if (!token) return;
    setIsLoadingCustomers(true);
    try {
      const response = await fetch('/api/admin/users?page=1&limit=1000', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Error fetching users for damage report:', err);
        toast.error(err.error || err.message || 'Failed to load users');
        return;
      }

      const data = await response.json();
      if (data.success && data.data?.users) {
        const users: ApiUser[] = data.data.users;
        setCustomers(users.map(mapApiUserToCustomer));
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load user list');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    if (!customerSearchQuery) return true;
    const searchLower = customerSearchQuery.toLowerCase();
    return (
      customer.firstName?.toLowerCase().includes(searchLower) ||
      customer.lastName?.toLowerCase().includes(searchLower) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchLower)
    );
  });

  const applyAddressToForm = (addr: CustomerAddress) => {
    setFormData((prev) => ({
      ...prev,
      propertyStreet: addr.street ?? prev.propertyStreet,
      propertyCity: addr.city ?? prev.propertyCity,
      propertyState: addr.state ?? prev.propertyState,
      propertyZipCode: addr.pincode ?? addr.zipCode ?? prev.propertyZipCode,
    }));
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchQuery(`${customer.firstName} ${customer.lastName}`);
    setShowCustomerDropdown(false);

    const addressList = getCustomerAddressList(customer);
    if (addressList.length === 1) {
      setSelectedCustomerAddress(addressList[0]);
      applyAddressToForm(addressList[0]);
    } else if (addressList.length > 1) {
      setSelectedCustomerAddress(null);
      setFormData((prev) => ({
        ...prev,
        propertyStreet: '',
        propertyCity: '',
        propertyState: '',
        propertyZipCode: '',
      }));
    } else {
      setSelectedCustomerAddress(null);
    }
  };

  const handleSelectCustomerAddress = (addr: CustomerAddress) => {
    setSelectedCustomerAddress(addr);
    applyAddressToForm(addr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      return;
    }
    if (customerAddressList.length > 1 && !selectedCustomerAddress) {
      toast.error('Please select one address for this report from the customer\'s addresses.');
      return;
    }
    if (fundingExceedsEstimated) {
      toast.error('Total funding sources cannot exceed the estimated repair cost.');
      return;
    }
    
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

      // Convert uploaded images to URLs
      const images = uploadedImages.map((img, idx) => ({
        url: img.url,
        alt: `Damage photo ${idx + 1}`,
        isPrimary: idx === 0,
      }));

      const addressForPayload = selectedCustomerAddress ?? (selectedCustomer.address ? selectedCustomer.address : selectedCustomer.addresses?.[0]);
        const payload = {
        customer: {
          customerId: selectedCustomer.id || selectedCustomer._id || '',
          firstName: selectedCustomer.firstName,
          lastName: selectedCustomer.lastName,
          email: selectedCustomer.email,
          phone: selectedCustomer.phone,
          address: addressForPayload ? {
            street: addressForPayload.street,
            city: addressForPayload.city,
            state: addressForPayload.state,
            zipCode: addressForPayload.pincode || addressForPayload.zipCode,
          } : undefined,
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
        insuranceCoverage: formData.insuranceCoverage || undefined,
        description: formData.description,
        affectedAreas: formData.affectedAreas,
        estimatedCost: parseFloat(formData.estimatedCost) || 0,
        fundingSources,
        images,
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
        resetForm();
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

  const resetForm = () => {
    setUploadedImages([]);
    setSelectedCustomer(null);
    setSelectedCustomerAddress(null);
    setCustomerSearchQuery('');
    setFormData({
      propertyStreet: '',
      propertyCity: '',
      propertyState: '',
      propertyZipCode: '',
      damageType: '',
      severity: '',
      insuranceCoverage: '' as '' | 'uninsured' | 'partially_insured' | 'fully_insured',
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
  };

  // Funding: estimated cost and total from form (for live share and cap)
  const estimatedCostNum = parseFloat(String(formData.estimatedCost).replace(/[^0-9.-]/g, '')) || 0;
  const fundingKeys = ['insurance', 'fema', 'floodInsurance', 'nonProfit', 'consolidatedNonProfit', 'selfPay', 'other'] as const;
  const getFundingAmount = (key: (typeof fundingKeys)[number]) => parseFloat(String(formData.fundingSources[key]).replace(/[^0-9.-]/g, '')) || 0;
  const totalFunding = fundingKeys.reduce((sum, key) => sum + getFundingAmount(key), 0);
  const fundingExceedsEstimated = estimatedCostNum > 0 && totalFunding > estimatedCostNum;
  const remainingBudget = Math.max(0, estimatedCostNum - totalFunding);

  const getMaxForFundingKey = (currentKey: (typeof fundingKeys)[number]) => {
    const othersSum = fundingKeys.filter((k) => k !== currentKey).reduce((s, k) => s + getFundingAmount(k), 0);
    return Math.max(0, estimatedCostNum - othersSum);
  };

  const handleFundingChange = (key: (typeof fundingKeys)[number], value: string) => {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(num) || value === '' || value === '-') {
      setFormData({
        ...formData,
        fundingSources: { ...formData.fundingSources, [key]: value },
      });
      return;
    }
    const maxAllowed = getMaxForFundingKey(key);
    const capped = estimatedCostNum > 0 ? Math.min(num, maxAllowed) : num;
    setFormData({
      ...formData,
      fundingSources: { ...formData.fundingSources, [key]: String(capped) },
    });
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
      subtitle="File a new property damage report for a customer"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection - Required First Step */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Select Customer <span className="text-red-500">*</span>
          </h3>
          <div className="relative" ref={customerDropdownRef}>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search customer by name or email..."
                value={customerSearchQuery}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setShowCustomerDropdown(true);
                  if (!e.target.value) {
                    setSelectedCustomer(null);
                  }
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="input-field w-full pl-10"
              />
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearchQuery('');
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            {showCustomerDropdown && !selectedCustomer && (
              <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg">
                {isLoadingCustomers ? (
                  <div className="p-4 text-center">
                    <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-[var(--text-muted)] mt-2">Loading customers...</p>
                  </div>
                ) : (
                  <>
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-[var(--text-muted)]">
                        No customers found
                      </div>
                    ) : (
                      filteredCustomers.slice(0, 20).map((customer) => (
                        <button
                          key={customer.id || customer._id}
                          type="button"
                          onClick={() => handleCustomerSelect(customer)}
                          className="w-full px-4 py-3 text-left hover:bg-[var(--bg-secondary)] border-b border-[var(--border-color)]"
                        >
                          <div className="font-medium text-[var(--text-primary)]">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-[var(--text-muted)]">{customer.email}</div>
                          {customer.address?.city && (
                            <div className="text-xs text-[var(--text-muted)]">
                              {customer.address.city}, {customer.address.state}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerDropdown(false);
                        onClose();
                        router.push('/dashboard/user-management?addUser=1');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center gap-2 text-[var(--primary-600)] font-medium"
                    >
                      <PlusIcon className="w-5 h-5 shrink-0" />
                   Add new user
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {selectedCustomer && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-700 dark:text-green-300 font-semibold">
                  {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0]}
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">{selectedCustomer.email}</p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-[var(--text-muted)]">{selectedCustomer.phone}</p>
                  )}
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Customer ID: {(selectedCustomer.id || selectedCustomer._id || '').slice(-8)}
                  </p>
                </div>
              </div>
              {customerAddressList.length > 1 && (
                <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                    Select address for this report <span className="text-red-500">*</span>
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    This customer has multiple addresses. Choose the one where the damage occurred.
                  </p>
                  <Select
                    label=""
                    value={(() => {
                      if (!selectedCustomerAddress) return '';
                      const idx = customerAddressList.indexOf(selectedCustomerAddress);
                      return idx >= 0 ? String(idx) : '';
                    })()}
                    onChange={(value) => {
                      const idx = parseInt(value, 10);
                      if (!Number.isNaN(idx) && customerAddressList[idx]) {
                        handleSelectCustomerAddress(customerAddressList[idx]);
                      }
                    }}
                    options={[
                      { value: '', label: 'Select an address...' },
                      ...customerAddressList.map((addr, idx) => {
                        const label = [addr.street, addr.city, addr.state, addr.pincode || addr.zipCode].filter(Boolean).join(', ') || `Address ${idx + 1}`;
                        return { value: String(idx), label };
                      }),
                    ]}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Property Address */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Property Address</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {selectedCustomer?.address ? 'Pre-filled from customer address. Update if the damaged property is at a different location.' : 'Enter the address of the damaged property.'}
          </p>
          <Input
            label="Street Address"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Select
              label="Insurance Coverage"
              value={formData.insuranceCoverage}
              onChange={(value) => setFormData({ ...formData, insuranceCoverage: value as typeof formData.insuranceCoverage })}
              options={[
                { value: '', label: 'Select coverage (optional)' },
                { value: 'uninsured', label: 'Uninsured' },
                { value: 'partially_insured', label: 'Partially insured' },
                { value: 'fully_insured', label: 'Fully insured' },
              ]}
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
              min={0}
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              required
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Funding Source(s) & Amounts</h4>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Sum of funding sources cannot exceed estimated repair cost. Enter estimated cost first to see live share and remaining budget.
            </p>
            {estimatedCostNum > 0 && (
              <div className={`mb-3 px-3 py-2 rounded-lg text-sm ${fundingExceedsEstimated ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'}`}>
                <span className="font-medium">Total funding: </span>
                <span>${totalFunding.toFixed(2)}</span>
                <span> / ${estimatedCostNum.toFixed(2)} estimated</span>
                {estimatedCostNum > 0 && (
                  <span> ({Math.round((totalFunding / estimatedCostNum) * 100)}% allocated)</span>
                )}
                {remainingBudget > 0 && totalFunding <= estimatedCostNum && (
                  <span className="block mt-1 text-[var(--text-muted)]">Remaining budget: ${remainingBudget.toFixed(2)}</span>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'fema' as const, label: 'FEMA' },
                { key: 'insurance' as const, label: 'Insurance' },
                { key: 'floodInsurance' as const, label: 'Flood Insurance' },
                { key: 'nonProfit' as const, label: 'Non-Profit' },
                { key: 'consolidatedNonProfit' as const, label: 'Consolidated Non-Profit' },
                { key: 'selfPay' as const, label: 'Self Pay' },
                { key: 'other' as const, label: 'Other' },
              ].map(({ key, label }) => {
                const amount = getFundingAmount(key);
                const sharePct = estimatedCostNum > 0 && amount > 0 ? Math.round((amount / estimatedCostNum) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <CurrencyDollarIcon className="w-5 h-5 text-[var(--text-muted)]" />
                      <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
                      {estimatedCostNum > 0 && amount > 0 && (
                        <span className="text-xs text-[var(--text-muted)]">({sharePct}% of estimated)</span>
                      )}
                    </div>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min={0}
                      max={estimatedCostNum > 0 ? getMaxForFundingKey(key) : undefined}
                      value={formData.fundingSources[key]}
                      onChange={(e) => handleFundingChange(key, e.target.value)}
                    />
                  </div>
                );
              })}
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
          <Button variant="secondary" type="button" onClick={() => { resetForm(); onClose(); }}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={
              !selectedCustomer ||
              fundingExceedsEstimated ||
              (customerAddressList.length > 1 && !selectedCustomerAddress)
            }
          >
            Submit Report
          </Button>
        </div>
      </form>
    </Modal>
  );
}
