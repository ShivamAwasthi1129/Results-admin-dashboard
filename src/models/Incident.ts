import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote {
  content: string;
  createdBy: string;
  createdAt: Date;
}

export interface ITimelineEvent {
  type: 'created' | 'status_updated' | 'assigned' | 'note_added' | 'priority_changed';
  title: string;
  description: string;
  createdBy: string;
  createdAt: Date;
}

export interface IIncident {
  _id?: string;
  ticketNumber: string; // e.g., "TKT-2024-01001"
  type: 'insurance_support' | 'finance_management' | 'legal_assistance' | 'housing' | 'medical' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reportedBy: {
    name: string;
    email: string;
    phone: string;
  };
  assignedTo?: string; // User ID or "Unassigned"
  attachments?: string[]; // File URLs or paths
  notes: INote[];
  timeline: ITimelineEvent[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IIncidentDocument extends Omit<IIncident, '_id'>, Document {}

const IncidentSchema = new Schema<IIncidentDocument>(
  {
    ticketNumber: {
      type: String,
      required: [true, 'Ticket number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['insurance_support', 'finance_management', 'legal_assistance', 'housing', 'medical', 'other'],
      required: [true, 'Incident type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      required: true,
    },
    reportedBy: {
      name: {
        type: String,
        required: [true, 'Reporter name is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Reporter email is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      },
      phone: {
        type: String,
        required: [true, 'Reporter phone is required'],
        trim: true,
      },
    },
    assignedTo: {
      type: String,
      trim: true,
      default: 'Unassigned',
    },
    attachments: [{
      type: String,
      trim: true,
    }],
    notes: [{
      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: [2000, 'Note cannot exceed 2000 characters'],
      },
      createdBy: {
        type: String,
        required: true,
        trim: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    timeline: [{
      type: {
        type: String,
        enum: ['created', 'status_updated', 'assigned', 'note_added', 'priority_changed'],
        required: true,
      },
      title: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        required: true,
        trim: true,
      },
      createdBy: {
        type: String,
        required: true,
        trim: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
    collection: 'incidents',
  }
);

// Indexes
IncidentSchema.index({ ticketNumber: 1 });
IncidentSchema.index({ status: 1 });
IncidentSchema.index({ priority: 1 });
IncidentSchema.index({ type: 1 });
IncidentSchema.index({ assignedTo: 1 });
IncidentSchema.index({ 'reportedBy.email': 1 });

// Pre-save hook to generate ticket number if not provided
IncidentSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Incident').countDocuments({});
    this.ticketNumber = `TKT-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Incident: Model<IIncidentDocument> = mongoose.models.Incident || mongoose.model<IIncidentDocument>('Incident', IncidentSchema);

export default Incident;

