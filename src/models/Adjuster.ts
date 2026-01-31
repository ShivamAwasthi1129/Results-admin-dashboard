import mongoose, { Schema, Document, Model } from 'mongoose';

// Certification interface
export interface ICertification {
  name: string;
  issuingAuthority?: string;
  certificateNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  photoUrl?: string;
  notes?: string;
}

// Address interface
export interface IAdjusterAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

// Report assignment history
export interface IReportAssignment {
  reportId: string;
  reportNumber: string;
  customerId?: string;
  assignedDate: Date;
  completedDate?: Date;
  status: 'assigned' | 'in_progress' | 'inspected' | 'approved' | 'rejected' | 'completed';
  inspectionDate?: Date;
  inspectionNotes?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalDate?: Date;
  approvalNotes?: string;
}

export type AdjusterStatus = 'active' | 'inactive' | 'suspended';

export interface IAdjuster extends Document {
  adjusterId: string; // Format: ADJ-XXXX
  photo?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  address?: IAdjusterAddress;
  certifications: ICertification[];
  specializations?: string[]; // e.g., ['Hurricane', 'Flood', 'Fire']
  licenseNumber?: string;
  yearsOfExperience?: number;
  status: AdjusterStatus;
  
  // Assignment tracking
  assignedReports: IReportAssignment[];
  totalReportsHandled: number;
  currentActiveReports: number;
  
  // Availability
  isAvailable: boolean;
  availabilityNotes?: string;
  
  // Ratings and performance
  averageRating?: number;
  totalRatings?: number;
  
  // Notes
  notes?: string;
  
  // Metadata
  createdBy?: string;
  lastModifiedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Schema definitions
const CertificationSchema = new Schema<ICertification>({
  name: { type: String, required: true, trim: true },
  issuingAuthority: { type: String, trim: true },
  certificateNumber: { type: String, trim: true },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  photoUrl: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { _id: true });

const AdjusterAddressSchema = new Schema<IAdjusterAddress>({
  street: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  zipCode: { type: String, trim: true },
  country: { type: String, default: 'USA', trim: true },
}, { _id: false });

const ReportAssignmentSchema = new Schema<IReportAssignment>({
  reportId: { type: String, required: true, trim: true },
  reportNumber: { type: String, required: true, trim: true },
  customerId: { type: String, trim: true },
  assignedDate: { type: Date, required: true, default: Date.now },
  completedDate: { type: Date },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'inspected', 'approved', 'rejected', 'completed'],
    default: 'assigned',
  },
  inspectionDate: { type: Date },
  inspectionNotes: { type: String, trim: true },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvalDate: { type: Date },
  approvalNotes: { type: String, trim: true },
}, { _id: true });

const AdjusterSchema = new Schema<IAdjuster>(
  {
    adjusterId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    photo: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    address: {
      type: AdjusterAddressSchema,
    },
    certifications: {
      type: [CertificationSchema],
      default: [],
    },
    specializations: {
      type: [String],
      default: [],
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    assignedReports: {
      type: [ReportAssignmentSchema],
      default: [],
    },
    totalReportsHandled: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentActiveReports: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    availabilityNotes: {
      type: String,
      trim: true,
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
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

// Indexes
AdjusterSchema.index({ adjusterId: 1 });
AdjusterSchema.index({ email: 1 });
AdjusterSchema.index({ status: 1 });
AdjusterSchema.index({ isAvailable: 1 });
AdjusterSchema.index({ firstName: 1, lastName: 1 });
AdjusterSchema.index({ companyName: 1 });
AdjusterSchema.index({ 'assignedReports.reportId': 1 });
AdjusterSchema.index({ createdAt: -1 });

// Virtual for full name
AdjusterSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save hook to generate adjusterId if not provided
AdjusterSchema.pre('save', async function() {
  if (!this.adjusterId) {
    const count = await mongoose.model('Adjuster').countDocuments();
    this.adjusterId = `ADJ-${String(count + 1).padStart(4, '0')}`;
  }
  
  // Update currentActiveReports count
  this.currentActiveReports = this.assignedReports.filter(
    r => ['assigned', 'in_progress', 'inspected'].includes(r.status)
  ).length;
  
  // Update totalReportsHandled
  this.totalReportsHandled = this.assignedReports.length;
});

// Model
const Adjuster: Model<IAdjuster> = 
  mongoose.models.Adjuster || mongoose.model<IAdjuster>('Adjuster', AdjusterSchema);

export default Adjuster;
