'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, StatCard, Button, Input, Badge, Modal, Select } from '@/components/ui';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  WrenchScrewdriverIcon,
  CheckBadgeIcon,
  ClockIcon,
  StarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhotoIcon,
  DocumentIcon,
  UsersIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon, CheckBadgeIcon as CheckBadgeSolidIcon } from '@heroicons/react/24/solid';
import { 
  US_STATES, 
  SERVICE_CATEGORIES, 
  BUSINESS_TYPES, 
  PRICING_TYPES, 
  RESPONSE_TIMES,
  PROVIDER_STATUS,
  CATEGORY_DOCUMENTS,
  SERVICE_TYPES,
  SUBCATEGORIES,
} from '@/lib/constants/usa';

interface ServiceProvider {
  _id: string;
  providerId: string;
  userId: { _id: string; firstName?: string; lastName?: string; name?: string; email: string; phone?: string };
  businessName: string;
  businessType?: string;
  einNumber?: string;
  registrationNumber?: string;
  description: string;
  tagline?: string;
  logo?: string;
  coverImage?: string;
  gallery?: { url: string; caption?: string }[];
  contactPerson?: { firstName?: string; lastName?: string; name?: string; designation?: string; phone: string; email: string; alternatePhone?: string };
  website?: string;
  category: string;
  serviceType: string;
  subcategories?: string[];
  teamSize?: number;
  location: { address?: string; suite?: string; city?: string; state?: string; zipCode?: string };
  serviceAreas?: { city: string; state: string }[];
  maxServiceRadius?: number;
  pricing?: { type: string; rate: number };
  is24x7Available?: boolean;
  isAvailableForEmergency?: boolean;
  emergencyCharges?: number;
  emergencyResponseTime?: string;
  yearsOfExperience?: number;
  rating: number;
  totalReviews: number;
  verified: boolean;
  verificationStatus?: string;
  status: string;
  totalJobsCompleted?: number;
  totalEmergencyResponses?: number;
  documents?: { documentType: string; documentNumber: string; url?: string; verified?: boolean }[];
  createdAt: string;
}

// Step form configuration - Documents merged into Services step
const FORM_STEPS = [
  { id: 1, title: 'Business Info', icon: BuildingOfficeIcon },
  { id: 2, title: 'Contact', icon: PhoneIcon },
  { id: 3, title: 'Services & Documents', icon: WrenchScrewdriverIcon },
  { id: 4, title: 'Location', icon: MapPinIcon },
  { id: 5, title: 'Photos', icon: PhotoIcon },
];

export default function ServicesPage() {
  const { token, hasPermission } = useAuth();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    // Business Details
    businessName: '',
    businessType: 'individual',
    einNumber: '',
    registrationNumber: '',
    description: '',
    tagline: '',
    website: '',
    logo: '',
    // Contact Person - first/last name
    contactFirstName: '',
    contactLastName: '',
    contactDesignation: '',
    contactPhone: '',
    contactEmail: '',
    contactAlternatePhone: '',
    // Category
    category: 'medical',
    serviceType: '',
    subcategories: [] as string[],
    // Team
    teamSize: '1',
    yearsOfExperience: '0',
    // Location - USA based
    address: '',
    suite: '',
    city: '',
    state: '',
    zipCode: '',
    serviceAreas: '',
    maxServiceRadius: '50',
    // Pricing - USD
    pricingType: 'negotiable',
    pricingRate: '0',
    // Emergency
    is24x7Available: false,
    isAvailableForEmergency: true,
    emergencyCharges: '0',
    emergencyResponseTime: '30 minutes',
    // Status
    status: 'active',
  });
  
  // Documents based on category - includes file upload
  const [documents, setDocuments] = useState<{ documentType: string; documentNumber: string; url: string; file?: File }[]>([]);
  // Multiple photos gallery
  const [gallery, setGallery] = useState<{ url: string; caption: string }[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Category document requirements management
  const [categoryDocRequirements, setCategoryDocRequirements] = useState<Record<string, { type: string; label: string; required: boolean }[]>>({});
  const [showDocTypeModal, setShowDocTypeModal] = useState(false);
  const [newDocType, setNewDocType] = useState({ type: '', label: '', required: true });
  const [isLoadingDocReqs, setIsLoadingDocReqs] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData({ ...formData, logo: base64 });
        setLogoPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setGallery(prev => [...prev, { url: base64, caption: '' }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeGalleryImage = (index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index));
  };

  const updateGalleryCaption = (index: number, caption: string) => {
    setGallery(prev => prev.map((img, i) => i === index ? { ...img, caption } : img));
  };

  const updateDocument = (index: number, field: string, value: string) => {
    setDocuments(prev => prev.map((doc, i) => i === index ? { ...doc, [field]: value } : doc));
  };

  const handleDocumentFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setDocuments(prev => prev.map((doc, i) => i === index ? { ...doc, url: base64, file } : doc));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeDocumentFile = (index: number) => {
    setDocuments(prev => prev.map((doc, i) => i === index ? { ...doc, url: '', file: undefined } : doc));
  };

  const canManage = hasPermission(['super_admin', 'admin']);

  // Initialize documents when category changes
  useEffect(() => {
    const initializeCategoryDocs = async () => {
      // Try to fetch from API first, fallback to static
      let categoryDocs = categoryDocRequirements[formData.category];
      
      if (!categoryDocs && token) {
        try {
          setIsLoadingDocReqs(true);
          const response = await fetch(`/api/category-documents?category=${formData.category}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.success && data.data?.documents) {
            categoryDocs = data.data.documents;
            setCategoryDocRequirements(prev => ({ ...prev, [formData.category]: data.data.documents }));
          }
        } catch (error) {
          console.error('Error fetching category doc requirements:', error);
        } finally {
          setIsLoadingDocReqs(false);
        }
      }
      
      // Fallback to static
      if (!categoryDocs) {
        categoryDocs = CATEGORY_DOCUMENTS[formData.category] || CATEGORY_DOCUMENTS.other;
      }
      
      const existingDocs = documents;
      const newDocs = categoryDocs.map((doc: { type: string; label: string; required: boolean }) => {
        const existing = existingDocs.find(d => d.documentType === doc.type);
        return existing || { documentType: doc.type, documentNumber: '', url: '' };
      });
      setDocuments(newDocs);
    };
    
    initializeCategoryDocs();
    // Reset service type when category changes
    setFormData(prev => ({ ...prev, serviceType: '', subcategories: [] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category, token]);

  // Add new document type to a category
  const addDocumentType = async () => {
    if (!newDocType.type || !newDocType.label) {
      toast.error('Please enter document type and label');
      return;
    }

    try {
      const response = await fetch('/api/category-documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category: formData.category,
          document: {
            type: newDocType.type.toLowerCase().replace(/\s+/g, '_'),
            label: newDocType.label,
            required: newDocType.required,
          }
        })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Document type added!');
        setCategoryDocRequirements(prev => ({ ...prev, [formData.category]: data.data.documents }));
        setNewDocType({ type: '', label: '', required: true });
        setShowDocTypeModal(false);
      } else {
        toast.error(data.error || 'Failed to add document type');
      }
    } catch (error) {
      toast.error('Failed to add document type');
    }
  };

  // Remove document type from a category
  const removeDocumentType = async (docType: string) => {
    if (!confirm('Are you sure you want to remove this document requirement?')) return;

    try {
      const response = await fetch(`/api/category-documents?category=${formData.category}&documentType=${docType}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Document type removed!');
        setCategoryDocRequirements(prev => ({ ...prev, [formData.category]: data.data.documents }));
        // Remove from current documents if exists
        setDocuments(prev => prev.filter(d => d.documentType !== docType));
      } else {
        toast.error(data.error || 'Failed to remove document type');
      }
    } catch (error) {
      toast.error('Failed to remove document type');
    }
  };

  const fetchProviders = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      const response = await fetch(`/api/services?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setProviders(data.data.serviceProviders);
    } catch (error) {
      toast.error('Failed to fetch service providers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProviders();
  }, [token, search, categoryFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedProvider ? `/api/services?id=${selectedProvider._id}` : '/api/services';
      const method = selectedProvider ? 'PUT' : 'POST';
      
      const body = {
        businessName: formData.businessName,
        businessType: formData.businessType,
        einNumber: formData.einNumber,
        registrationNumber: formData.registrationNumber,
        description: formData.description,
        tagline: formData.tagline,
        website: formData.website,
        logo: formData.logo,
        gallery: gallery,
        contactPerson: {
          firstName: formData.contactFirstName,
          lastName: formData.contactLastName,
          designation: formData.contactDesignation,
          phone: formData.contactPhone,
          email: formData.contactEmail,
          alternatePhone: formData.contactAlternatePhone,
        },
        category: formData.category,
        serviceType: formData.serviceType,
        subcategories: formData.subcategories,
        teamSize: parseInt(formData.teamSize) || 1,
        yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
        location: {
          address: formData.address,
          suite: formData.suite,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: 'United States',
        },
        serviceAreas: formData.serviceAreas.split(',').map(s => ({ city: s.trim(), state: formData.state })).filter(a => a.city),
        maxServiceRadius: parseInt(formData.maxServiceRadius) || 50,
        pricing: {
          type: formData.pricingType,
          rate: parseFloat(formData.pricingRate) || 0,
          currency: 'USD',
        },
        is24x7Available: formData.is24x7Available,
        isAvailableForEmergency: formData.isAvailableForEmergency,
        emergencyCharges: parseFloat(formData.emergencyCharges) || 0,
        emergencyResponseTime: formData.emergencyResponseTime,
        status: formData.status,
        documents: documents.filter(d => d.documentNumber || d.url),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(selectedProvider ? 'Provider updated!' : 'Provider added!');
        setShowModal(false);
        setSelectedProvider(null);
        resetForm();
        fetchProviders();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      businessName: '', businessType: 'individual', einNumber: '', registrationNumber: '',
      description: '', tagline: '', website: '', logo: '',
      contactFirstName: '', contactLastName: '', contactDesignation: '', contactPhone: '', contactEmail: '', contactAlternatePhone: '',
      category: 'medical', serviceType: '', subcategories: [],
      teamSize: '1', yearsOfExperience: '0',
      address: '', suite: '', city: '', state: '', zipCode: '', serviceAreas: '', maxServiceRadius: '50',
      pricingType: 'negotiable', pricingRate: '0',
      is24x7Available: false, isAvailableForEmergency: true, emergencyCharges: '0', emergencyResponseTime: '30 minutes',
      status: 'active',
    });
    setCurrentStep(1);
    setGallery([]);
    setDocuments([]);
    setLogoPreview(null);
  };

  const openEditModal = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setLogoPreview(provider.logo || null);
    setGallery((provider.gallery || []).map(g => ({ url: g.url, caption: g.caption ?? '' })));
    setDocuments((provider.documents || []).map(d => ({ documentType: d.documentType, documentNumber: d.documentNumber, url: d.url ?? '' })));
    
    // Handle backward compatibility for contact person name
    let contactFirstName = provider.contactPerson?.firstName || '';
    let contactLastName = provider.contactPerson?.lastName || '';
    if (!contactFirstName && !contactLastName && provider.contactPerson?.name) {
      const nameParts = provider.contactPerson.name.split(' ');
      contactFirstName = nameParts[0] || '';
      contactLastName = nameParts.slice(1).join(' ') || '';
    }
    
    setFormData({
      businessName: provider.businessName || '',
      businessType: provider.businessType || 'individual',
      einNumber: provider.einNumber || '',
      registrationNumber: provider.registrationNumber || '',
      description: provider.description || '',
      tagline: provider.tagline || '',
      website: provider.website || '',
      logo: provider.logo || '',
      contactFirstName,
      contactLastName,
      contactDesignation: provider.contactPerson?.designation || '',
      contactPhone: provider.contactPerson?.phone || '',
      contactEmail: provider.contactPerson?.email || '',
      contactAlternatePhone: provider.contactPerson?.alternatePhone || '',
      category: provider.category || 'medical',
      serviceType: provider.serviceType || '',
      subcategories: provider.subcategories || [],
      teamSize: provider.teamSize?.toString() || '1',
      yearsOfExperience: provider.yearsOfExperience?.toString() || '0',
      address: provider.location?.address || '',
      suite: provider.location?.suite || '',
      city: provider.location?.city || '',
      state: provider.location?.state || '',
      zipCode: provider.location?.zipCode || '',
      serviceAreas: provider.serviceAreas?.map(a => a.city).join(', ') || '',
      maxServiceRadius: provider.maxServiceRadius?.toString() || '50',
      pricingType: provider.pricing?.type || 'negotiable',
      pricingRate: provider.pricing?.rate?.toString() || '0',
      is24x7Available: provider.is24x7Available || false,
      isAvailableForEmergency: provider.isAvailableForEmergency ?? true,
      emergencyCharges: provider.emergencyCharges?.toString() || '0',
      emergencyResponseTime: provider.emergencyResponseTime || '30 minutes',
      status: provider.status || 'active',
    });
    setCurrentStep(1);
    setShowModal(true);
  };

  const openDetailModal = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setShowDetailModal(true);
  };

  const stats = {
    total: providers.length,
    verified: providers.filter(p => p.verified).length,
    pending: providers.filter(p => p.verificationStatus === 'pending').length,
    avgRating: providers.length > 0 ? (providers.reduce((acc, p) => acc + p.rating, 0) / providers.length).toFixed(1) : '0.0'
  };

  const categoryIcons: Record<string, string> = {
    medical: '🏥', rescue: '🚁', shelter: '🏠', food_water: '🍲',
    transportation: '🚗', construction: '🏗️', electrical: '⚡', plumbing: '🔧',
    communication: '📡', logistics: '📦', counseling: '💬', security: '🛡️',
    cleaning: '🧹', equipment_rental: '🛠️', manpower: '👷', other: '⚙️'
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        i < Math.floor(rating)
          ? <StarSolidIcon key={i} className="w-4 h-4 text-amber-400" />
          : <StarIcon key={i} className="w-4 h-4 text-[var(--border-color)]" />
      ))}
      <span className="ml-1.5 text-sm font-medium text-[var(--text-secondary)]">{rating.toFixed(1)}</span>
    </div>
  );

  // Get contact person display name
  const getContactName = (provider: ServiceProvider) => {
    if (provider.contactPerson?.firstName && provider.contactPerson?.lastName) {
      return `${provider.contactPerson.firstName} ${provider.contactPerson.lastName}`;
    }
    return provider.contactPerson?.name || 'N/A';
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < FORM_STEPS.length) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  // Get current category documents and service options (from API or static)
  const currentCategoryDocs = categoryDocRequirements[formData.category] || CATEGORY_DOCUMENTS[formData.category] || CATEGORY_DOCUMENTS.other;
  const currentServiceTypes = SERVICE_TYPES[formData.category] || SERVICE_TYPES.other;
  const currentSubcategories = SUBCATEGORIES[formData.category] || SUBCATEGORIES.other;

  return (
    <DashboardLayout title="Service Providers" subtitle="Manage service providers and their services">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Providers" value={stats.total} icon={<WrenchScrewdriverIcon className="w-6 h-6" />} variant="purple" />
        <StatCard title="Verified" value={stats.verified} icon={<CheckBadgeIcon className="w-6 h-6" />} variant="green" />
        <StatCard title="Pending Verification" value={stats.pending} icon={<ClockIcon className="w-6 h-6" />} variant="orange" />
        <StatCard title="Avg Rating" value={stats.avgRating} icon={<StarIcon className="w-6 h-6" />} variant="teal" />
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1">
            <Input
              placeholder="Search by name, ID, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            />
          </div>
          <div className="flex items-center gap-4">
            <Select 
              value={categoryFilter} 
              onChange={(value) => setCategoryFilter(value)} 
              options={[{ value: 'all', label: 'All Categories' }, ...SERVICE_CATEGORIES]} 
            />
            {canManage && (
              <Button onClick={() => { setSelectedProvider(null); resetForm(); setShowModal(true); }} leftIcon={<PlusIcon className="w-4 h-4" />} variant="gradient">
                Add Provider
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Providers List View */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Provider</th>
                <th className="text-left px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Category</th>
                <th className="text-left px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Location</th>
                <th className="text-left px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Rating</th>
                <th className="text-left px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 skeleton rounded-xl" />
                        <div className="space-y-2">
                          <div className="h-4 skeleton rounded w-32" />
                          <div className="h-3 skeleton rounded w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-7 skeleton rounded-full w-24" /></td>
                    <td className="px-6 py-5"><div className="h-4 skeleton rounded w-28" /></td>
                    <td className="px-6 py-5"><div className="h-4 skeleton rounded w-20" /></td>
                    <td className="px-6 py-5"><div className="h-7 skeleton rounded-full w-20" /></td>
                    <td className="px-6 py-5"><div className="h-9 skeleton rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <WrenchScrewdriverIcon className="w-14 h-14 mx-auto text-[var(--text-muted)] mb-4" />
                    <p className="text-[var(--text-secondary)] text-lg">No service providers found</p>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Try adjusting your filters or add a new provider</p>
                  </td>
                </tr>
              ) : (
                providers.map((provider) => (
                  <tr key={provider._id} className="border-b border-[var(--border-color)] table-row transition-colors hover:bg-[var(--bg-card-hover)]">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        {provider.logo ? (
                          <img 
                            src={provider.logo} 
                            alt={`${provider.businessName} logo`}
                            className="w-12 h-12 rounded-xl object-cover border border-[var(--border-color)]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[var(--primary-500)]/20 flex items-center justify-center text-xl">
                            {categoryIcons[provider.category] || '⚙️'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[var(--text-primary)]">{provider.businessName}</p>
                            {provider.verified && <CheckBadgeSolidIcon className="w-5 h-5 text-blue-500" />}
                          </div>
                          <p className="text-xs text-[var(--primary-500)] font-mono font-bold">ID: {provider.providerId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant="secondary" size="sm" className="capitalize">
                        {categoryIcons[provider.category]} {provider.category?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <MapPinIcon className="w-4 h-4 text-[var(--text-muted)]" />
                        {provider.location?.city}, {provider.location?.state}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {renderStars(provider.rating)}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <Badge variant={provider.verified ? 'success' : 'warning'} size="sm" dot>
                          {provider.verified ? 'Verified' : 'Pending'}
                        </Badge>
                        {provider.is24x7Available && (
                          <Badge variant="info" size="sm">24/7</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailModal(provider)}
                          className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--primary-500)] hover:bg-[var(--primary-500)]/10 transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <button
                            onClick={() => openEditModal(provider)}
                            className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--info)] hover:bg-[var(--info)]/10 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal - Multi-Step Form with Glassmorphism */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedProvider ? 'Edit Service Provider' : 'Add Service Provider'} size="xl">
        <form onSubmit={handleSubmit}>
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {FORM_STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(step.id)}
                    className={`flex flex-col items-center gap-2 ${
                      currentStep === step.id 
                        ? 'text-[var(--primary-500)]' 
                        : currentStep > step.id 
                          ? 'text-[var(--success)]' 
                          : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentStep === step.id 
                        ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/20' 
                        : currentStep > step.id 
                          ? 'border-[var(--success)] bg-[var(--success)]/20' 
                          : 'border-[var(--border-color)] bg-[var(--bg-input)]'
                    }`}>
                      {currentStep > step.id ? (
                        <CheckIcon className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className="text-xs font-medium hidden md:block">{step.title}</span>
                  </button>
                  {index < FORM_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step.id ? 'bg-[var(--success)]' : 'bg-[var(--border-color)]'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-6">
            {/* Step 1: Business Info */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-5 bg-gradient-to-br from-[var(--primary-500)]/5 to-[var(--primary-600)]/10 rounded-2xl border border-[var(--primary-500)]/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-[var(--primary-500)] mb-4 flex items-center gap-2">
                    <BuildingOfficeIcon className="w-5 h-5" /> Business Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input 
                      label="Business Name *" 
                      value={formData.businessName} 
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} 
                      required 
                      icon={<BuildingOfficeIcon className="w-5 h-5" />}
                      placeholder="Acme Emergency Services LLC"
                    />
                    <Select 
                      label="Business Type" 
                      value={formData.businessType} 
                      onChange={(value) => setFormData({ ...formData, businessType: value })} 
                      options={BUSINESS_TYPES}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                    <Input 
                      label="EIN Number" 
                      value={formData.einNumber} 
                      onChange={(e) => setFormData({ ...formData, einNumber: e.target.value })} 
                      placeholder="XX-XXXXXXX"
                    />
                    <Input 
                      label="State Registration Number" 
                      value={formData.registrationNumber} 
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} 
                      placeholder="Business registration number"
                    />
                  </div>
                </div>
                
                <Input 
                  label="Tagline" 
                  value={formData.tagline} 
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} 
                  placeholder="Your business tagline (e.g., 'Rapid Response When You Need It Most')"
                />
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3.5 bg-[var(--bg-input)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--primary-500)] focus:ring-4 focus:ring-[var(--primary-500)]/20 transition-all resize-none"
                    placeholder="Describe your business and the services you provide..."
                    required
                  />
                </div>
                <Input 
                  label="Website" 
                  value={formData.website} 
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })} 
                  placeholder="https://example.com" 
                  icon={<GlobeAltIcon className="w-5 h-5" />} 
                />
              </div>
            )}

            {/* Step 2: Contact */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/10 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-blue-500 mb-4 flex items-center gap-2">
                    <UserIcon className="w-5 h-5" /> Contact Person Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input 
                      label="First Name *" 
                      value={formData.contactFirstName} 
                      onChange={(e) => setFormData({ ...formData, contactFirstName: e.target.value })} 
                      required 
                      icon={<UserIcon className="w-5 h-5" />}
                      placeholder="John"
                    />
                    <Input 
                      label="Last Name *" 
                      value={formData.contactLastName} 
                      onChange={(e) => setFormData({ ...formData, contactLastName: e.target.value })} 
                      required 
                      icon={<UserIcon className="w-5 h-5" />}
                      placeholder="Smith"
                    />
                    <Select 
                      label="Designation" 
                      value={formData.contactDesignation} 
                      onChange={(value) => setFormData({ ...formData, contactDesignation: value })} 
                      options={[
                        { value: '', label: 'Select Designation' },
                        { value: 'Owner', label: 'Owner' },
                        { value: 'Manager', label: 'Manager' },
                        { value: 'Director', label: 'Director' },
                        { value: 'Supervisor', label: 'Supervisor' },
                        { value: 'Coordinator', label: 'Coordinator' },
                        { value: 'Representative', label: 'Representative' },
                        { value: 'Other', label: 'Other' },
                      ]}
                    />
                    <PhoneInput 
                      label="Phone *" 
                      value={formData.contactPhone} 
                      onChange={(val) => setFormData({ ...formData, contactPhone: val || '' })} 
                      required
                      placeholder="(555) 123-4567"
                    />
                    <PhoneInput 
                      label="Alternate Phone" 
                      value={formData.contactAlternatePhone} 
                      onChange={(val) => setFormData({ ...formData, contactAlternatePhone: val || '' })} 
                      placeholder="(555) 987-6543"
                    />
                    <Input 
                      label="Email *" 
                      type="email" 
                      value={formData.contactEmail} 
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} 
                      required 
                      icon={<EnvelopeIcon className="w-5 h-5" />}
                      placeholder="john.smith@example.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Services & Documents (Combined) */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                {/* Service Category Selection - Higher z-index for dropdown */}
                <div className="p-5 bg-gradient-to-br from-purple-500/5 to-purple-600/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm relative z-30">
                  <h4 className="text-sm font-semibold text-purple-500 mb-4 flex items-center gap-2">
                    <WrenchScrewdriverIcon className="w-5 h-5" /> Service Category
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Select 
                      label="Category *" 
                      value={formData.category} 
                      onChange={(value) => setFormData({ ...formData, category: value })} 
                      options={SERVICE_CATEGORIES}
                    />
                    <Select 
                      label="Service Type *" 
                      value={formData.serviceType} 
                      onChange={(value) => setFormData({ ...formData, serviceType: value })} 
                      options={[{ value: '', label: 'Select Service Type' }, ...currentServiceTypes]}
                    />
                  </div>
                  <div className="mt-5 relative z-40">
                    <MultiSelect 
                      label="Subcategories" 
                      options={currentSubcategories}
                      value={formData.subcategories}
                      onChange={(values) => setFormData({ ...formData, subcategories: values })}
                      placeholder="Select specializations..."
                      helperText="Select one or more specializations for your services"
                    />
                  </div>
                </div>
                
                {/* Documents Section - Lower z-index so dropdown appears above */}
                <div className="p-5 bg-gradient-to-br from-amber-500/5 to-amber-600/10 rounded-2xl border border-amber-500/20 backdrop-blur-sm relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-amber-600 flex items-center gap-2">
                      <DocumentIcon className="w-5 h-5" /> Required Documents
                    </h4>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setShowDocTypeModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                      >
                        <Cog6ToothIcon className="w-4 h-4" />
                        Manage Requirements
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-4">
                    Based on your selected category (<strong className="text-[var(--primary-500)]">{formData.category.replace('_', ' ')}</strong>), 
                    please provide the following documents with their numbers and upload the files.
                  </p>

                  {isLoadingDocReqs ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-[var(--text-muted)]">Loading document requirements...</p>
                    </div>
                  ) : currentCategoryDocs.length === 0 ? (
                    <div className="text-center py-8 bg-[var(--bg-input)]/50 rounded-xl border-2 border-dashed border-[var(--border-color)]">
                      <DocumentIcon className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-2" />
                      <p className="text-sm text-[var(--text-muted)]">No document requirements for this category</p>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setShowDocTypeModal(true)}
                          className="mt-3 text-sm text-[var(--primary-500)] hover:underline"
                        >
                          + Add document requirement
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentCategoryDocs.map((doc) => {
                        const docData = documents.find(d => d.documentType === doc.type) || { documentType: doc.type, documentNumber: '', url: '' };
                        const docIndex = documents.findIndex(d => d.documentType === doc.type);
                        
                        return (
                          <div key={doc.type} className="p-4 bg-[var(--bg-card)]/50 rounded-xl border border-[var(--border-color)]">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                <DocumentIcon className="w-5 h-5 text-amber-600" />
                              </div>
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium text-[var(--text-primary)]">
                                    {doc.label}
                                    {doc.required && <span className="text-red-500 ml-1">*</span>}
                                  </h5>
                                  <div className="flex items-center gap-2">
                                    {!doc.required && (
                                      <Badge variant="secondary" size="sm">Optional</Badge>
                                    )}
                                    {canManage && (
                                      <button
                                        type="button"
                                        onClick={() => removeDocumentType(doc.type)}
                                        className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                        title="Remove this document requirement"
                                      >
                                        <XMarkIcon className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Document Number Input */}
                                <Input 
                                  placeholder={`Enter ${doc.label} number`}
                                  value={docData.documentNumber}
                                  onChange={(e) => {
                                    if (docIndex >= 0) {
                                      updateDocument(docIndex, 'documentNumber', e.target.value);
                                    } else {
                                      setDocuments([...documents, { documentType: doc.type, documentNumber: e.target.value, url: '' }]);
                                    }
                                  }}
                                />
                                
                                {/* Document File Upload */}
                                <div className="flex items-center gap-3">
                                  {docData.url ? (
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--success)]/10 text-[var(--success)] rounded-lg text-sm">
                                        <CheckIcon className="w-4 h-4" />
                                        <span>Document uploaded</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeDocumentFile(docIndex >= 0 ? docIndex : documents.length)}
                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="cursor-pointer flex-1">
                                      <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--border-color)] rounded-xl hover:border-[var(--primary-500)] hover:bg-[var(--primary-500)]/5 transition-all">
                                        <ArrowUpTrayIcon className="w-5 h-5 text-[var(--text-muted)]" />
                                        <span className="text-sm text-[var(--text-muted)]">Click to upload document</span>
                                      </div>
                                      <input 
                                        type="file" 
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        onChange={(e) => {
                                          if (docIndex >= 0) {
                                            handleDocumentFileUpload(docIndex, e);
                                          } else {
                                            const newDocs = [...documents, { documentType: doc.type, documentNumber: docData.documentNumber, url: '' }];
                                            setDocuments(newDocs);
                                            handleDocumentFileUpload(newDocs.length - 1, e);
                                          }
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Team & Experience */}
                <div className="p-5 bg-gradient-to-br from-teal-500/5 to-teal-600/10 rounded-2xl border border-teal-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-teal-500 mb-4 flex items-center gap-2">
                    <UsersIcon className="w-5 h-5" /> Team & Experience
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input 
                      label="Team Size" 
                      type="number" 
                      value={formData.teamSize} 
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })} 
                      icon={<UsersIcon className="w-5 h-5" />} 
                      placeholder="10"
                    />
                    <Input 
                      label="Years of Experience" 
                      type="number" 
                      value={formData.yearsOfExperience} 
                      onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })} 
                      placeholder="5"
                    />
                  </div>
                </div>
                
                {/* Pricing */}
                <div className="p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-emerald-500 mb-4 flex items-center gap-2">
                    <CurrencyDollarIcon className="w-5 h-5" /> Pricing & Emergency
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Select 
                      label="Pricing Type" 
                      value={formData.pricingType} 
                      onChange={(value) => setFormData({ ...formData, pricingType: value })} 
                      options={PRICING_TYPES}
                    />
                    <Input 
                      label="Rate ($)" 
                      type="number" 
                      value={formData.pricingRate} 
                      onChange={(e) => setFormData({ ...formData, pricingRate: e.target.value })} 
                      icon={<CurrencyDollarIcon className="w-5 h-5" />}
                      placeholder="100"
                    />
                  </div>
                  <div className="flex flex-wrap gap-6 mt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is24x7Available}
                        onChange={(e) => setFormData({ ...formData, is24x7Available: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-2 border-[var(--border-color)] text-[var(--primary-500)] focus:ring-[var(--primary-500)]"
                      />
                      <span className="text-[var(--text-secondary)]">Available 24/7</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isAvailableForEmergency}
                        onChange={(e) => setFormData({ ...formData, isAvailableForEmergency: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-2 border-[var(--border-color)] text-[var(--primary-500)] focus:ring-[var(--primary-500)]"
                      />
                      <span className="text-[var(--text-secondary)]">Available for Emergency</span>
                    </label>
                  </div>
                  {formData.isAvailableForEmergency && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                      <Input 
                        label="Emergency Charges ($)" 
                        type="number" 
                        value={formData.emergencyCharges} 
                        onChange={(e) => setFormData({ ...formData, emergencyCharges: e.target.value })} 
                        icon={<CurrencyDollarIcon className="w-5 h-5" />}
                        placeholder="150"
                      />
                      <Select 
                        label="Emergency Response Time" 
                        value={formData.emergencyResponseTime} 
                        onChange={(value) => setFormData({ ...formData, emergencyResponseTime: value })} 
                        options={RESPONSE_TIMES}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Location */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-5 bg-gradient-to-br from-rose-500/5 to-rose-600/10 rounded-2xl border border-rose-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-rose-500 mb-4 flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5" /> Business Address
                  </h4>
                  <Input 
                    label="Street Address" 
                    value={formData.address} 
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                    placeholder="123 Main Street" 
                    icon={<MapPinIcon className="w-5 h-5" />} 
                  />
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-5">
                    <Input 
                      label="Suite / Unit" 
                      value={formData.suite} 
                      onChange={(e) => setFormData({ ...formData, suite: e.target.value })} 
                      placeholder="Suite 100"
                    />
                    <Input 
                      label="City *" 
                      value={formData.city} 
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                      placeholder="New York"
                      required 
                    />
                    <Select 
                      label="State *" 
                      value={formData.state} 
                      onChange={(value) => setFormData({ ...formData, state: value })} 
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
                
                <div className="p-5 bg-gradient-to-br from-indigo-500/5 to-indigo-600/10 rounded-2xl border border-indigo-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-indigo-500 mb-4 flex items-center gap-2">
                    <GlobeAltIcon className="w-5 h-5" /> Service Coverage
                  </h4>
                  <Input 
                    label="Service Areas (comma separated cities)" 
                    value={formData.serviceAreas} 
                    onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })} 
                    placeholder="Manhattan, Brooklyn, Queens, Bronx" 
                  />
                  <div className="mt-5">
                    <Input 
                      label="Max Service Radius (miles)" 
                      type="number" 
                      value={formData.maxServiceRadius} 
                      onChange={(e) => setFormData({ ...formData, maxServiceRadius: e.target.value })} 
                      placeholder="50"
                    />
                  </div>
                </div>
                
                <div className="p-5 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-color)]">
                  <Select 
                    label="Status" 
                    value={formData.status} 
                    onChange={(value) => setFormData({ ...formData, status: value })} 
                    options={PROVIDER_STATUS}
                  />
                </div>
              </div>
            )}

            {/* Step 5: Photos */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-fade-in">
                {/* Logo Upload */}
                <div className="p-5 bg-gradient-to-br from-pink-500/5 to-pink-600/10 rounded-2xl border border-pink-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-pink-500 mb-4 flex items-center gap-2">
                    <BuildingOfficeIcon className="w-5 h-5" /> Business Logo
                  </h4>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="w-24 h-24 rounded-xl object-cover border-4 border-[var(--border-color)]"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-xl bg-[var(--bg-input)] flex items-center justify-center border-4 border-[var(--border-color)]">
                          <BuildingOfficeIcon className="w-10 h-10 text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="cursor-pointer">
                        <span className="px-4 py-2 bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white rounded-xl text-sm font-medium transition-colors">
                          Upload Logo
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-[var(--text-muted)] mt-2">JPG, PNG or GIF. Max 2MB</p>
                    </div>
                  </div>
                </div>

                {/* Business Gallery */}
                <div className="p-5 bg-gradient-to-br from-violet-500/5 to-violet-600/10 rounded-2xl border border-violet-500/20 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-violet-500 mb-4 flex items-center gap-2">
                    <PhotoIcon className="w-5 h-5" /> Business Photos Gallery
                  </h4>
                  <div className="mb-4">
                    <label className="cursor-pointer inline-block">
                      <span className="px-4 py-2 bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                        <PhotoIcon className="w-4 h-4" />
                        Add Photos
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        onChange={handleGalleryAdd}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-[var(--text-muted)] mt-2">Add photos of your business, services, equipment, team, etc.</p>
                  </div>

                  {gallery.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {gallery.map((img, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={img.url} 
                            alt={`Gallery ${index + 1}`} 
                            className="w-full h-32 object-cover rounded-xl border border-[var(--border-color)]"
                          />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(index)}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <input
                            type="text"
                            placeholder="Add caption..."
                            value={img.caption}
                            onChange={(e) => updateGalleryCaption(index, e.target.value)}
                            className="mt-2 w-full px-3 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-placeholder)]"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-[var(--bg-input)]/50 rounded-xl border-2 border-dashed border-[var(--border-color)]">
                      <PhotoIcon className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-2" />
                      <p className="text-sm text-[var(--text-muted)]">No photos added yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4 pt-6 mt-6 border-t border-[var(--border-color)]">
            <Button 
              type="button"
              variant="secondary" 
              onClick={currentStep === 1 ? () => setShowModal(false) : prevStep}
              leftIcon={currentStep > 1 ? <ChevronLeftIcon className="w-4 h-4" /> : undefined}
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </Button>
            
            {currentStep < FORM_STEPS.length ? (
              <Button 
                type="button"
                variant="gradient" 
                onClick={nextStep}
                rightIcon={<ChevronRightIcon className="w-4 h-4" />}
              >
                Next Step
              </Button>
            ) : (
              <Button type="submit" variant="gradient">
                {selectedProvider ? 'Update Provider' : 'Add Provider'}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Add Document Type Modal */}
      <Modal isOpen={showDocTypeModal} onClose={() => setShowDocTypeModal(false)} title="Manage Document Requirements" size="md">
        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-br from-amber-500/5 to-amber-600/10 rounded-xl border border-amber-500/20">
            <h4 className="text-sm font-semibold text-amber-600 mb-3">Add New Document Requirement</h4>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Add a new document requirement for the <strong className="text-[var(--primary-500)]">{formData.category.replace('_', ' ')}</strong> category.
            </p>
            <div className="space-y-4">
              <Input 
                label="Document Type ID"
                placeholder="e.g., medical_license"
                value={newDocType.type}
                onChange={(e) => setNewDocType({ ...newDocType, type: e.target.value })}
                helperText="Use lowercase with underscores (auto-formatted)"
              />
              <Input 
                label="Display Label"
                placeholder="e.g., Medical License"
                value={newDocType.label}
                onChange={(e) => setNewDocType({ ...newDocType, label: e.target.value })}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDocType.required}
                  onChange={(e) => setNewDocType({ ...newDocType, required: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-2 border-[var(--border-color)] text-[var(--primary-500)] focus:ring-[var(--primary-500)]"
                />
                <span className="text-[var(--text-secondary)]">Required document</span>
              </label>
              <Button 
                type="button" 
                variant="gradient" 
                onClick={addDocumentType}
                className="w-full"
                leftIcon={<PlusIcon className="w-4 h-4" />}
              >
                Add Document Requirement
              </Button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Current Requirements ({currentCategoryDocs.length})
            </h4>
            {currentCategoryDocs.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">No document requirements defined</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {currentCategoryDocs.map((doc) => (
                  <div key={doc.type} className="flex items-center justify-between p-3 bg-[var(--bg-input)] rounded-xl">
                    <div className="flex items-center gap-3">
                      <DocumentIcon className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{doc.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={doc.required ? 'danger' : 'secondary'} size="sm">
                        {doc.required ? 'Required' : 'Optional'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => removeDocumentType(doc.type)}
                        className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setShowDocTypeModal(false)} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Service Provider Details" size="lg">
        {selectedProvider && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-5 p-5 bg-gradient-to-r from-[var(--primary-500)]/10 to-[var(--primary-600)]/10 rounded-2xl">
              {selectedProvider.logo ? (
                <img 
                  src={selectedProvider.logo} 
                  alt={`${selectedProvider.businessName} logo`}
                  className="w-16 h-16 rounded-xl object-cover border-4 border-[var(--bg-card)] shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[var(--primary-500)]/20 flex items-center justify-center text-3xl">
                  {categoryIcons[selectedProvider.category] || '⚙️'}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedProvider.businessName}</h3>
                  {selectedProvider.verified && (
                    <CheckBadgeSolidIcon className="w-6 h-6 text-blue-500" />
                  )}
                </div>
                <p className="text-[var(--primary-500)] font-mono font-bold">ID: {selectedProvider.providerId}</p>
                {selectedProvider.tagline && (
                  <p className="text-[var(--text-muted)] italic mt-1">"{selectedProvider.tagline}"</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant={selectedProvider.verified ? 'success' : 'warning'} size="sm" dot>
                    {selectedProvider.verified ? 'Verified' : 'Pending'}
                  </Badge>
                  {renderStars(selectedProvider.rating)}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-xl">
                <PhoneIcon className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Phone</p>
                  <p className="font-medium text-[var(--text-primary)]">{selectedProvider.contactPerson?.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-xl">
                <EnvelopeIcon className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Email</p>
                  <p className="font-medium text-[var(--text-primary)] truncate">{selectedProvider.contactPerson?.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-xl">
                <UserIcon className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Contact Person</p>
                  <p className="font-medium text-[var(--text-primary)]">{getContactName(selectedProvider)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-xl">
                <MapPinIcon className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Location</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {selectedProvider.location?.city || 'N/A'}, {selectedProvider.location?.state || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-[var(--bg-input)] rounded-xl">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedProvider.totalJobsCompleted || 0}</p>
                <p className="text-xs text-[var(--text-muted)]">Jobs Done</p>
              </div>
              <div className="text-center p-4 bg-[var(--bg-input)] rounded-xl">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedProvider.totalEmergencyResponses || 0}</p>
                <p className="text-xs text-[var(--text-muted)]">Emergencies</p>
              </div>
              <div className="text-center p-4 bg-[var(--bg-input)] rounded-xl">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedProvider.yearsOfExperience || 0}</p>
                <p className="text-xs text-[var(--text-muted)]">Years Exp</p>
              </div>
              <div className="text-center p-4 bg-[var(--bg-input)] rounded-xl">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedProvider.teamSize || 1}</p>
                <p className="text-xs text-[var(--text-muted)]">Team Size</p>
              </div>
            </div>

            {/* Description */}
            {selectedProvider.description && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">About</h4>
                <p className="text-[var(--text-secondary)]">{selectedProvider.description}</p>
              </div>
            )}

            {/* Documents */}
            {selectedProvider.documents && selectedProvider.documents.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedProvider.documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-[var(--bg-input)] rounded-xl">
                      <DocumentIcon className="w-5 h-5 text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{doc.documentType.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{doc.documentNumber || 'No number'}</p>
                      </div>
                      {doc.verified && <CheckBadgeSolidIcon className="w-5 h-5 text-[var(--success)]" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {selectedProvider.gallery && selectedProvider.gallery.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Gallery</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedProvider.gallery.map((img, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={img.url} 
                        alt={img.caption || `Gallery image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-xl border border-[var(--border-color)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl">
              <h4 className="text-sm font-semibold text-emerald-400 mb-2">Pricing</h4>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                ${selectedProvider.pricing?.rate || 0} 
                <span className="text-sm font-normal text-[var(--text-muted)]">/ {selectedProvider.pricing?.type}</span>
              </p>
              {selectedProvider.isAvailableForEmergency && (
                <p className="text-sm text-[var(--text-muted)] mt-1">Emergency charges: ${selectedProvider.emergencyCharges || 0}</p>
              )}
            </div>

            {canManage && (
              <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border-color)]">
                <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
                <Button variant="gradient" onClick={() => { setShowDetailModal(false); openEditModal(selectedProvider); }}>
                  <PencilIcon className="w-4 h-4 mr-2" /> Edit
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
