import mongoose, { Schema, Document, Model } from 'mongoose';

// Enums
export type DamageType = 
  | 'hurricane' 
  | 'flood' 
  | 'wind' 
  | 'fire' 
  | 'earthquake' 
  | 'tornado' 
  | 'storm' 
  | 'hail' 
  | 'other';

export type Severity = 'minor' | 'moderate' | 'severe' | 'catastrophic';

export type ReportStatus = 
  | 'reported' 
  | 'assessed' 
  | 'in_review' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export type FundingSourceType = 
  | 'insurance' 
  | 'fema' 
  | 'flood_insurance' 
  | 'non_profit' 
  | 'consolidated_non_profit' 
  | 'self_pay' 
  | 'other';

export type MilestoneStatus = 'pending' | 'completed' | 'in_progress' | 'cancelled';

// Interfaces
export interface IDamageImage {
  url: string;
  alt?: string;
  description?: string;
  uploadedAt?: Date;
  isPrimary?: boolean;
}

export interface IFundingSource {
  source: FundingSourceType;
  amount: number;
  description?: string;
  receivedDate?: Date;
  status?: 'pledged' | 'received' | 'pending';
  notes?: string;
}

export interface IMilestoneHistory {
  status: MilestoneStatus;
  changedAt: Date;
  changedBy?: string; // User ID
  notes?: string;
}

export interface IMilestone {
  name: string;
  description?: string;
  status: MilestoneStatus;
  completionDate?: Date;
  dueDate?: Date;
  notes?: string;
  order: number; // For ordering milestones
  history?: IMilestoneHistory[]; // Track status changes
}

export interface IPropertyAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface IContractor {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  estimatedTimeline?: string; // e.g., "6-8 weeks"
  assignedDate?: Date;
}

export interface IVendor {
  vendorId: string; // ServiceProvider _id
  providerId?: string; // ServiceProvider providerId
  businessName?: string;
  contactPerson?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  category?: string;
  assignedDate?: Date;
  assignedBy?: string; // User ID who assigned
  status?: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

export interface IDamageReport extends Document {
  reportNumber: string; // Format: DR-YYYY-NNN (e.g., DR-2024-001)
  reportDate: Date;
  reportedBy: {
    userId?: string; // Reference to User if logged in
    name: string;
    email?: string;
    phone?: string;
  };
  
  // Property Owner Information
  propertyOwner: {
    name: string;
    phone: string;
    email?: string;
    alternateContact?: {
      name?: string;
      phone?: string;
      relation?: string;
    };
  };
  
  // Property Address
  propertyAddress: IPropertyAddress;
  
  // Damage Details
  damageType: DamageType;
  severity: Severity;
  status: ReportStatus;
  description: string;
  affectedAreas?: string[]; // e.g., ["Roof", "Second Floor", "Garage"]
  
  // Financial Information
  estimatedCost: number;
  actualCost?: number;
  fundingSources: IFundingSource[];
  
  // Progress Tracking
  milestones: IMilestone[];
  
  // Media
  images: IDamageImage[];
  
  // Contractor Assignment
  contractor?: IContractor;
  
  // Vendor/Service Provider Assignment
  vendor?: IVendor;
  
  // Additional Information
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Metadata
  createdBy?: string; // User ID
  lastModifiedBy?: string; // User ID
  createdAt?: Date;
  updatedAt?: Date;
}

// Schema Definitions
const DamageImageSchema = new Schema<IDamageImage>({
  url: { type: String, required: true },
  alt: { type: String, trim: true },
  description: { type: String, trim: true },
  uploadedAt: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false },
}, { _id: false });

const FundingSourceSchema = new Schema<IFundingSource>({
  source: {
    type: String,
    enum: ['insurance', 'fema', 'flood_insurance', 'non_profit', 'consolidated_non_profit', 'self_pay', 'other'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true },
  receivedDate: { type: Date },
  status: {
    type: String,
    enum: ['pledged', 'received', 'pending'],
    default: 'pending',
  },
  notes: { type: String, trim: true },
}, { _id: false });

const MilestoneHistorySchema = new Schema<IMilestoneHistory>({
  status: {
    type: String,
    enum: ['pending', 'completed', 'in_progress', 'cancelled'],
    required: true,
  },
  changedAt: { type: Date, required: true, default: Date.now },
  changedBy: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { _id: false });

const MilestoneSchema = new Schema<IMilestone>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'in_progress', 'cancelled'],
    default: 'pending',
  },
  completionDate: { type: Date },
  dueDate: { type: Date },
  notes: { type: String, trim: true },
  order: { type: Number, required: true, default: 0 },
  history: { type: [MilestoneHistorySchema], default: [] },
}, { _id: false });

const PropertyAddressSchema = new Schema<IPropertyAddress>({
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zipCode: { type: String, required: true, trim: true },
  country: { type: String, default: 'USA', trim: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
}, { _id: false });

const ContractorSchema = new Schema<IContractor>({
  name: { type: String, required: true, trim: true },
  contact: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  estimatedTimeline: { type: String, trim: true },
  assignedDate: { type: Date },
}, { _id: false });

const VendorSchema = new Schema<IVendor>({
  vendorId: { type: String, required: true, trim: true },
  providerId: { type: String, trim: true },
  businessName: { type: String, trim: true },
  contactPerson: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  category: { type: String, trim: true },
  assignedDate: { type: Date, default: Date.now },
  assignedBy: { type: String, trim: true },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'assigned',
  },
  notes: { type: String, trim: true },
}, { _id: false });

const DamageReportSchema = new Schema<IDamageReport>(
  {
    reportNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    reportDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    reportedBy: {
      userId: { type: String, trim: true },
      name: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    propertyOwner: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
      alternateContact: {
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        relation: { type: String, trim: true },
      },
    },
    propertyAddress: {
      type: PropertyAddressSchema,
      required: true,
    },
    damageType: {
      type: String,
      enum: ['hurricane', 'flood', 'wind', 'fire', 'earthquake', 'tornado', 'storm', 'hail', 'other'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe', 'catastrophic'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['reported', 'assessed', 'in_review', 'in_progress', 'completed', 'cancelled'],
      default: 'reported',
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    affectedAreas: {
      type: [String],
      default: [],
    },
    estimatedCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    actualCost: {
      type: Number,
      min: 0,
    },
    fundingSources: {
      type: [FundingSourceSchema],
      default: [],
    },
    milestones: {
      type: [MilestoneSchema],
      default: [],
    },
    images: {
      type: [DamageImageSchema],
      default: [],
    },
    contractor: {
      type: ContractorSchema,
    },
    vendor: {
      type: VendorSchema,
    },
    notes: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    createdBy: {
      type: String,
      trim: true,
    },
    lastModifiedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
DamageReportSchema.index({ reportNumber: 1 });
DamageReportSchema.index({ reportDate: -1 });
DamageReportSchema.index({ status: 1 });
DamageReportSchema.index({ damageType: 1 });
DamageReportSchema.index({ severity: 1 });
DamageReportSchema.index({ 'propertyOwner.name': 1 });
DamageReportSchema.index({ 'propertyAddress.city': 1 });
DamageReportSchema.index({ 'propertyAddress.state': 1 });
DamageReportSchema.index({ 'vendor.vendorId': 1 });
DamageReportSchema.index({ createdAt: -1 });

// Virtual for total funding
DamageReportSchema.virtual('totalFunding').get(function() {
  return this.fundingSources.reduce((sum, source) => sum + (source.amount || 0), 0);
});

// Virtual for funding percentage
DamageReportSchema.virtual('fundingPercentage').get(function() {
  if (!this.estimatedCost || this.estimatedCost === 0) return 0;
  const totalFunding = this.fundingSources.reduce((sum, source) => sum + (source.amount || 0), 0);
  return Math.round((totalFunding / this.estimatedCost) * 100);
});

// Virtual for remaining funding needed
DamageReportSchema.virtual('remainingFunding').get(function() {
  const totalFunding = this.fundingSources.reduce((sum, source) => sum + (source.amount || 0), 0);
  return Math.max(0, (this.estimatedCost || 0) - totalFunding);
});

// Pre-save hook to generate report number if not provided
DamageReportSchema.pre('save', async function() {
  if (!this.reportNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('DamageReport').countDocuments({
      reportDate: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) }
    });
    this.reportNumber = `DR-${year}-${String(count + 1).padStart(3, '0')}`;
  }
});

// Model
const DamageReport: Model<IDamageReport> = 
  mongoose.models.DamageReport || mongoose.model<IDamageReport>('DamageReport', DamageReportSchema);

export default DamageReport;
