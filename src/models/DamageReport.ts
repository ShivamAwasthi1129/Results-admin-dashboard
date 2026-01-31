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

// New workflow statuses
export type ReportStatus = 
  | 'report_created'      // Step 1: Initial report created
  | 'under_review'        // Step 2a: Admin reviewing the report
  | 'reviewed'            // Step 2b: Admin has reviewed
  | 'adjuster_assigned'   // Step 3: Adjuster assigned to the report
  | 'adjuster_inspecting' // Step 4a: Adjuster is inspecting
  | 'adjuster_approved'   // Step 4b: Adjuster has approved
  | 'vendor_assigned'     // Step 5: Vendor(s) assigned
  | 'work_in_progress'    // Step 6: Vendor work in progress
  | 'completed'           // Step 7: All work completed
  | 'cancelled';          // Cancelled at any point

export type FundingSourceType = 
  | 'insurance' 
  | 'fema' 
  | 'flood_insurance' 
  | 'non_profit' 
  | 'consolidated_non_profit' 
  | 'self_pay' 
  | 'other';

export type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

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

// Who changed workflow step status (admin details)
export interface IWorkflowStepChangedBy {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
}

// History of status changes for a workflow step (e.g. Under Review) - status is step status: pending | in_progress | completed | skipped
export interface IWorkflowStepStatusHistoryEntry {
  status: WorkflowStepStatus;
  changedAt: Date;
  changedBy: IWorkflowStepChangedBy;
}

// Step 4: inspection budget line item (key-value)
export interface IInspectionBudgetItem {
  taskName: string;
  amount: number;
}

// Step-specific data stored in workflow step
export interface IWorkflowStepData {
  // Step 3: assigned adjuster snapshot
  assignedAdjusterSnapshot?: {
    adjusterId: string;
    adjusterDbId?: string;
    fullName: string;
    email?: string;
    phone?: string;
    companyName?: string;
    assignedDate: Date;
    assignedBy: string;
  };
  // Step 4: budget key-value pairs (e.g. roof repairing: $500)
  // Vendors are stored at report.assignedVendors only; stepData is independent (inspection budget can be saved without vendors).
  inspectionBudget?: IInspectionBudgetItem[];
}

// Workflow step tracking
export interface IWorkflowStep {
  stepNumber: number;
  name: string;
  status: WorkflowStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  /** History of who changed status (in_progress, completed, etc.) */
  statusHistory?: IWorkflowStepStatusHistoryEntry[];
  /** Step-specific payload (adjuster snapshot, inspection budget, etc.) */
  stepData?: IWorkflowStepData;
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

// Adjuster assignment for a damage report
export interface IAssignedAdjuster {
  adjusterId: string;
  adjusterDbId?: string; // MongoDB _id reference
  fullName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  assignedDate: Date;
  assignedBy: string;
  inspectionDate?: Date;
  inspectionNotes?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalDate?: Date;
  approvalNotes?: string;
}

// Vendor assignment with individual cost and status (can be linked to a task from step 4 budget)
export interface IAssignedVendor {
  vendorId: string; // ServiceProvider _id
  providerId?: string; // ServiceProvider providerId
  businessName: string;
  /** Task name from step 4 inspection budget (e.g. "Roof repairing") */
  taskName?: string;
  contactPerson?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  category?: string; // e.g., 'Roofing', 'Structural', 'Electrical'
  workDescription?: string;
  assignedDate: Date;
  assignedBy: string;
  estimatedCost: number;
  actualCost?: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: Date;
  completionDate?: Date;
  completedBy?: string; // Who marked it complete (vendor/adjuster/admin)
  notes?: string;
}

// Customer info (from User model)
export interface ICustomerInfo {
  customerId: string; // User _id
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
}

export interface IDamageReport extends Document {
  // Customer information (reports are now customer-based)
  customer: ICustomerInfo;
  
  // Report identification
  reportNumber: string; // Format: DR-YYYY-NNN (e.g., DR-2024-001)
  reportDate: Date;
  
  // Reported by (admin who created)
  reportedBy: {
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  
  // Property Address (can be different from customer address)
  propertyAddress: IPropertyAddress;
  
  // Damage Details
  damageType: DamageType;
  severity: Severity;
  status: ReportStatus;
  description: string;
  affectedAreas?: string[];
  
  // Financial Information
  estimatedCost: number;
  actualCost?: number;
  fundingSources: IFundingSource[];
  
  // Workflow tracking (new 7-step process)
  workflowSteps: IWorkflowStep[];
  currentStep: number;
  
  // Adjuster assignment
  assignedAdjuster?: IAssignedAdjuster;
  
  // Multiple vendor assignments
  assignedVendors: IAssignedVendor[];
  
  // Media
  images: IDamageImage[];
  
  // Additional Information
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Metadata
  createdBy?: string;
  lastModifiedBy?: string;
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

// Sub-schemas for workflow step data (so inspectionBudget and statusHistory persist)
const WorkflowStepChangedBySchema = new Schema({
  userId: { type: String, trim: true },
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
}, { _id: false });

const WorkflowStepStatusHistoryEntrySchema = new Schema({
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'skipped'] },
  changedAt: { type: Date },
  changedBy: WorkflowStepChangedBySchema,
}, { _id: false });

const InspectionBudgetItemSchema = new Schema({
  taskName: { type: String, trim: true, default: '' },
  amount: { type: Number, default: 0, min: 0 },
}, { _id: false });

const AssignedAdjusterSnapshotSchema = new Schema({
  adjusterId: { type: String, trim: true },
  adjusterDbId: { type: String, trim: true },
  fullName: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  companyName: { type: String, trim: true },
  assignedDate: { type: Date },
  assignedBy: { type: String, trim: true },
}, { _id: false });

const WorkflowStepDataSchema = new Schema({
  assignedAdjusterSnapshot: AssignedAdjusterSnapshotSchema,
  inspectionBudget: [InspectionBudgetItemSchema],
}, { _id: false });

const WorkflowStepSchema = new Schema<IWorkflowStep>({
  stepNumber: { type: Number, required: true },
  name: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'skipped'],
    default: 'pending',
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  completedBy: { type: String, trim: true },
  notes: { type: String, trim: true },
  statusHistory: [WorkflowStepStatusHistoryEntrySchema],
  stepData: WorkflowStepDataSchema,
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

const AssignedAdjusterSchema = new Schema<IAssignedAdjuster>({
  adjusterId: { type: String, required: true, trim: true },
  adjusterDbId: { type: String, trim: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  companyName: { type: String, trim: true },
  assignedDate: { type: Date, required: true, default: Date.now },
  assignedBy: { type: String, required: true, trim: true },
  inspectionDate: { type: Date },
  inspectionNotes: { type: String, trim: true },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvalDate: { type: Date },
  approvalNotes: { type: String, trim: true },
}, { _id: false });

const AssignedVendorSchema = new Schema<IAssignedVendor>({
  vendorId: { type: String, required: true, trim: true },
  providerId: { type: String, trim: true },
  businessName: { type: String, required: true, trim: true },
  taskName: { type: String, trim: true },
  contactPerson: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  category: { type: String, trim: true },
  workDescription: { type: String, trim: true },
  assignedDate: { type: Date, required: true, default: Date.now },
  assignedBy: { type: String, required: true, trim: true },
  estimatedCost: { type: Number, required: true, min: 0, default: 0 },
  actualCost: { type: Number, min: 0 },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'assigned',
  },
  startDate: { type: Date },
  completionDate: { type: Date },
  completedBy: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { _id: true });

const CustomerInfoSchema = new Schema<ICustomerInfo>({
  customerId: { type: String, required: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
  },
}, { _id: false });

// Default workflow steps
const DEFAULT_WORKFLOW_STEPS: IWorkflowStep[] = [
  { stepNumber: 1, name: 'Report Created', status: 'completed' },
  { stepNumber: 2, name: 'Under Review', status: 'pending' },
  { stepNumber: 3, name: 'Assign Adjuster', status: 'pending' },
  { stepNumber: 4, name: 'Adjuster Inspection & Approval', status: 'pending' },
  { stepNumber: 5, name: 'Assign Vendors', status: 'pending' },
  { stepNumber: 6, name: 'Vendor Work', status: 'pending' },
  { stepNumber: 7, name: 'Completed', status: 'pending' },
];

const DamageReportSchema = new Schema<IDamageReport>(
  {
    customer: {
      type: CustomerInfoSchema,
      required: true,
    },
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
      enum: [
        'report_created', 
        'under_review', 
        'reviewed', 
        'adjuster_assigned', 
        'adjuster_inspecting',
        'adjuster_approved', 
        'vendor_assigned', 
        'work_in_progress', 
        'completed', 
        'cancelled'
      ],
      default: 'report_created',
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
    workflowSteps: {
      type: [WorkflowStepSchema],
      default: DEFAULT_WORKFLOW_STEPS,
    },
    currentStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 7,
    },
    assignedAdjuster: {
      type: AssignedAdjusterSchema,
    },
    assignedVendors: {
      type: [AssignedVendorSchema],
      default: [],
    },
    images: {
      type: [DamageImageSchema],
      default: [],
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
DamageReportSchema.index({ 'customer.customerId': 1 });
DamageReportSchema.index({ 'customer.firstName': 1, 'customer.lastName': 1 });
DamageReportSchema.index({ 'propertyAddress.city': 1 });
DamageReportSchema.index({ 'propertyAddress.state': 1 });
DamageReportSchema.index({ 'assignedAdjuster.adjusterId': 1 });
DamageReportSchema.index({ 'assignedVendors.vendorId': 1 });
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

// Virtual for total vendor cost
DamageReportSchema.virtual('totalVendorCost').get(function() {
  return this.assignedVendors.reduce((sum, vendor) => sum + (vendor.estimatedCost || 0), 0);
});

// Virtual for vendor work progress
DamageReportSchema.virtual('vendorWorkProgress').get(function() {
  if (this.assignedVendors.length === 0) return 0;
  const completed = this.assignedVendors.filter(v => v.status === 'completed').length;
  return Math.round((completed / this.assignedVendors.length) * 100);
});

// Virtual for customer full name
DamageReportSchema.virtual('customerFullName').get(function() {
  return `${this.customer.firstName} ${this.customer.lastName}`;
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
  
  // Initialize workflow steps if empty
  if (!this.workflowSteps || this.workflowSteps.length === 0) {
    this.workflowSteps = DEFAULT_WORKFLOW_STEPS.map(step => ({
      ...step,
      startedAt: step.stepNumber === 1 ? new Date() : undefined,
      completedAt: step.stepNumber === 1 ? new Date() : undefined,
    }));
  }
});

// Model
const DamageReport: Model<IDamageReport> = 
  mongoose.models.DamageReport || mongoose.model<IDamageReport>('DamageReport', DamageReportSchema);

export default DamageReport;
