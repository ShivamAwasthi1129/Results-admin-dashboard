import mongoose, { Schema, Document, Model } from 'mongoose';
import { IServiceProvider, ServiceCategory } from '@/types';

export interface IServiceProviderDocument extends Omit<IServiceProvider, '_id'>, Document {}

// Generate 6-digit unique ID
function generateProviderId(): string {
  return 'SP' + Math.floor(100000 + Math.random() * 900000).toString();
}

const ServiceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    default: 0,
  },
  priceType: {
    type: String,
    enum: ['fixed', 'hourly', 'negotiable', 'per_unit', 'per_day'],
    default: 'fixed',
  },
  duration: {
    type: String,
    default: '',
  },
  images: [{
    type: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Document schema for category-specific requirements
const DocumentSchema = new Schema({
  documentType: { type: String, required: true },
  documentNumber: { type: String, default: '' },
  documentName: { type: String },
  issuedBy: { type: String },
  issuedDate: { type: Date },
  expiryDate: { type: Date },
  url: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
});

// Category-based required documents configuration
const CategoryDocumentRequirements: Record<string, { type: string; label: string; required: boolean }[]> = {
  medical: [
    { type: 'medical_license', label: 'Medical License', required: true },
    { type: 'board_certification', label: 'Board Certification', required: true },
    { type: 'dea_registration', label: 'DEA Registration', required: false },
    { type: 'npi_number', label: 'NPI Number', required: true },
    { type: 'malpractice_insurance', label: 'Malpractice Insurance', required: true },
  ],
  rescue: [
    { type: 'emt_certification', label: 'EMT Certification', required: true },
    { type: 'first_aid_certification', label: 'First Aid Certification', required: true },
    { type: 'cpr_certification', label: 'CPR Certification', required: true },
    { type: 'search_rescue_certification', label: 'Search & Rescue Certification', required: false },
    { type: 'hazmat_certification', label: 'HAZMAT Certification', required: false },
  ],
  shelter: [
    { type: 'business_license', label: 'Business License', required: true },
    { type: 'occupancy_permit', label: 'Occupancy Permit', required: true },
    { type: 'fire_safety_certificate', label: 'Fire Safety Certificate', required: true },
    { type: 'health_permit', label: 'Health Permit', required: true },
  ],
  food_water: [
    { type: 'food_handlers_permit', label: 'Food Handler\'s Permit', required: true },
    { type: 'health_department_license', label: 'Health Department License', required: true },
    { type: 'food_safety_certification', label: 'Food Safety Certification', required: true },
    { type: 'catering_license', label: 'Catering License', required: false },
  ],
  transportation: [
    { type: 'commercial_drivers_license', label: 'Commercial Driver\'s License (CDL)', required: true },
    { type: 'dot_number', label: 'DOT Number', required: true },
    { type: 'vehicle_registration', label: 'Vehicle Registration', required: true },
    { type: 'vehicle_insurance', label: 'Vehicle Insurance', required: true },
    { type: 'mc_number', label: 'MC Number', required: false },
  ],
  construction: [
    { type: 'contractor_license', label: 'Contractor License', required: true },
    { type: 'osha_certification', label: 'OSHA Certification', required: true },
    { type: 'bonding_certificate', label: 'Bonding Certificate', required: true },
    { type: 'liability_insurance', label: 'Liability Insurance', required: true },
    { type: 'workers_comp_insurance', label: 'Workers\' Comp Insurance', required: true },
  ],
  electrical: [
    { type: 'electrician_license', label: 'Electrician License', required: true },
    { type: 'electrical_permit', label: 'Electrical Permit', required: true },
    { type: 'liability_insurance', label: 'Liability Insurance', required: true },
    { type: 'nfpa_certification', label: 'NFPA Certification', required: false },
  ],
  plumbing: [
    { type: 'plumber_license', label: 'Plumber License', required: true },
    { type: 'plumbing_permit', label: 'Plumbing Permit', required: true },
    { type: 'liability_insurance', label: 'Liability Insurance', required: true },
    { type: 'backflow_certification', label: 'Backflow Prevention Certification', required: false },
  ],
  communication: [
    { type: 'fcc_license', label: 'FCC License', required: true },
    { type: 'business_license', label: 'Business License', required: true },
    { type: 'liability_insurance', label: 'Liability Insurance', required: true },
  ],
  logistics: [
    { type: 'business_license', label: 'Business License', required: true },
    { type: 'dot_number', label: 'DOT Number', required: false },
    { type: 'liability_insurance', label: 'Liability Insurance', required: true },
    { type: 'bonded_warehouse_license', label: 'Bonded Warehouse License', required: false },
  ],
  counseling: [
    { type: 'counseling_license', label: 'Counseling License', required: true },
    { type: 'psychology_license', label: 'Psychology License', required: false },
    { type: 'social_work_license', label: 'Social Work License', required: false },
    { type: 'malpractice_insurance', label: 'Malpractice Insurance', required: true },
  ],
  security: [
    { type: 'security_license', label: 'Security Guard License', required: true },
    { type: 'firearms_permit', label: 'Firearms Permit', required: false },
    { type: 'private_investigator_license', label: 'PI License', required: false },
    { type: 'liability_insurance', label: 'Liability Insurance', required: true },
  ],
  cleaning: [
    { type: 'business_license', label: 'Business License', required: true },
    { type: 'liability_insurance', label: 'Liability Insurance', required: true },
    { type: 'hazmat_certification', label: 'HAZMAT Certification', required: false },
    { type: 'osha_certification', label: 'OSHA Certification', required: false },
  ],
  equipment_rental: [
    { type: 'business_license', label: 'Business License', required: true },
    { type: 'equipment_certifications', label: 'Equipment Certifications', required: true },
    { type: 'liability_insurance', label: 'Liability Insurance', required: true },
  ],
  manpower: [
    { type: 'staffing_agency_license', label: 'Staffing Agency License', required: true },
    { type: 'business_license', label: 'Business License', required: true },
    { type: 'workers_comp_insurance', label: 'Workers\' Comp Insurance', required: true },
    { type: 'liability_insurance', label: 'Liability Insurance', required: true },
  ],
  other: [
    { type: 'business_license', label: 'Business License', required: true },
    { type: 'liability_insurance', label: 'Liability Insurance', required: true },
  ],
};

const ServiceProviderSchema = new Schema<IServiceProviderDocument>(
  {
    providerId: {
      type: String,
      unique: true,
      default: generateProviderId,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    // Business Information
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    businessType: {
      type: String,
      enum: ['individual', 'partnership', 'llc', 'corporation', 'nonprofit', 'government', 'other'],
      default: 'individual',
    },
    // USA business identifiers
    einNumber: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    // State registration
    stateRegistration: {
      state: { type: String },
      registrationNumber: { type: String },
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    tagline: {
      type: String,
      trim: true,
      default: '',
    },
    // Logo and Images
    logo: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    gallery: [{
      url: { type: String },
      caption: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    }],
    // Contact Information - with first/last name
    contactPerson: {
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
      name: { type: String, default: '' }, // For backward compatibility
      designation: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      alternatePhone: { type: String, default: '' },
    },
    website: {
      type: String,
      trim: true,
    },
    socialLinks: {
      facebook: { type: String },
      twitter: { type: String },
      instagram: { type: String },
      linkedin: { type: String },
      youtube: { type: String },
    },
    // Category and Services
    category: {
      type: String,
      enum: [
        'medical',
        'rescue',
        'shelter',
        'food_water',
        'transportation',
        'construction',
        'electrical',
        'plumbing',
        'communication',
        'logistics',
        'counseling',
        'security',
        'cleaning',
        'equipment_rental',
        'manpower',
        'other',
      ] as ServiceCategory[],
      required: true,
    },
    subcategories: [{
      type: String,
      trim: true,
    }],
    serviceType: {
      type: String,
      trim: true,
    },
    services: [ServiceSchema],
    // Equipment/Resources Available
    equipmentAvailable: [{
      name: { type: String },
      quantity: { type: Number },
      condition: { type: String, enum: ['new', 'good', 'fair', 'needs_maintenance'] },
      available: { type: Boolean, default: true },
    }],
    teamSize: {
      type: Number,
      default: 1,
    },
    vehiclesAvailable: [{
      type: { type: String },
      count: { type: Number },
      capacity: { type: String },
    }],
    // Location - USA based
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      address: { type: String, default: '' },
      suite: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'United States' },
    },
    serviceAreas: [{
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
    }],
    maxServiceRadius: {
      type: Number, // in miles
      default: 50,
    },
    // Operating Hours
    operatingHours: [{
      day: { type: String },
      open: { type: String },
      close: { type: String },
      isOpen: { type: Boolean, default: true },
    }],
    is24x7Available: {
      type: Boolean,
      default: false,
    },
    // Pricing - USD
    pricing: {
      type: {
        type: String,
        enum: ['hourly', 'fixed', 'per_unit', 'per_day', 'negotiable', 'free'],
        default: 'negotiable',
      },
      rate: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      minimumCharge: { type: Number, default: 0 },
    },
    paymentMethods: [{
      type: String,
      enum: ['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'venmo', 'zelle'],
    }],
    // Emergency Services
    isAvailableForEmergency: {
      type: Boolean,
      default: true,
    },
    emergencyCharges: {
      type: Number,
      default: 0,
    },
    emergencyResponseTime: {
      type: String, // e.g., "30 minutes", "1 hour"
    },
    // Experience and Credentials
    yearsOfExperience: {
      type: Number,
      default: 0,
    },
    certifications: [{
      name: { type: String },
      issuedBy: { type: String },
      issuedDate: { type: Date },
      expiryDate: { type: Date },
      documentUrl: { type: String },
    }],
    licenses: [{
      name: { type: String },
      number: { type: String },
      issuedBy: { type: String },
      state: { type: String },
      validTill: { type: Date },
      documentUrl: { type: String },
    }],
    insuranceDetails: {
      provider: { type: String },
      policyNumber: { type: String },
      coverageAmount: { type: Number },
      validTill: { type: Date },
    },
    // Category-based Documents
    documents: [DocumentSchema],
    // Rating and Reviews
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    // Verification
    verified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'in_review', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    // Stats
    totalJobsCompleted: {
      type: Number,
      default: 0,
    },
    totalEmergencyResponses: {
      type: Number,
      default: 0,
    },
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending_approval'],
      default: 'active',
    },
    // Admin Notes
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'service_providers',
  }
);

// Static method to get required documents for a category
ServiceProviderSchema.statics.getRequiredDocuments = function(category: string) {
  return CategoryDocumentRequirements[category] || CategoryDocumentRequirements.other;
};

// Pre-save hook to set contact person full name
ServiceProviderSchema.pre('save', async function() {
  // Set contact person full name from firstName + lastName
  if (this.contactPerson) {
    if (this.contactPerson.firstName && this.contactPerson.lastName) {
      this.contactPerson.name = `${this.contactPerson.firstName} ${this.contactPerson.lastName}`;
    }
  }
  
  // Generate unique providerId if new
  if (this.isNew && !this.providerId) {
    let isUnique = false;
    while (!isUnique) {
      const newId = generateProviderId();
      const existing = await mongoose.models.ServiceProvider.findOne({ providerId: newId });
      if (!existing) {
        this.providerId = newId;
        isUnique = true;
      }
    }
  }
});

// Indexes
// Note: providerId and userId indexes are automatically created by unique: true
ServiceProviderSchema.index({ category: 1 });
ServiceProviderSchema.index({ verified: 1, isAvailableForEmergency: 1 });
ServiceProviderSchema.index({ 'location.city': 1 });
ServiceProviderSchema.index({ 'location.state': 1 });
ServiceProviderSchema.index({ status: 1 });

const ServiceProvider: Model<IServiceProviderDocument> =
  mongoose.models.ServiceProvider || 
  mongoose.model<IServiceProviderDocument>('ServiceProvider', ServiceProviderSchema);

export default ServiceProvider;

// Export the category document requirements for use in frontend
export { CategoryDocumentRequirements };
