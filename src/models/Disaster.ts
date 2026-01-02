import mongoose, { Schema, Document, Model } from 'mongoose';
import { IDisaster, DisasterType, DisasterSeverity, DisasterStatus } from '@/types';

export interface IDisasterDocument extends Omit<IDisaster, '_id'>, Document {}

const DisasterSchema = new Schema<IDisasterDocument>(
  {
    title: {
      type: String,
      required: [true, 'Disaster title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Disaster description is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'earthquake',
        'flood',
        'cyclone',
        'fire',
        'landslide',
        'tsunami',
        'drought',
        'industrial_accident',
        'epidemic',
        'other',
      ] as DisasterType[],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'] as DisasterSeverity[],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'contained', 'resolved', 'monitoring'] as DisasterStatus[],
      default: 'active',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    affectedArea: {
      type: Number,
      default: 0,
    },
    affectedPopulation: {
      type: Number,
      default: 0,
    },
    casualties: {
      deaths: { type: Number, default: 0 },
      injured: { type: Number, default: 0 },
      missing: { type: Number, default: 0 },
    },
    resources: {
      volunteersDeployed: { type: Number, default: 0 },
      serviceProvidersEngaged: { type: Number, default: 0 },
      fundsAllocated: { type: Number, default: 0 },
      suppliesDistributed: [{ type: String }],
    },
    reportedBy: {
      type: Schema.Types.ObjectId as unknown as StringConstructor,
      ref: 'User',
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    resolvedAt: {
      type: Date,
    },
    images: [{
      type: String,
    }],
    updates: [{
      message: { type: String, required: true },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      updatedAt: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
    collection: 'disasters',
  }
);

// Indexes
DisasterSchema.index({ 'location': '2dsphere' });
DisasterSchema.index({ status: 1, severity: 1 });
DisasterSchema.index({ type: 1 });
DisasterSchema.index({ createdAt: -1 });

const Disaster: Model<IDisasterDocument> =
  mongoose.models.Disaster || mongoose.model<IDisasterDocument>('Disaster', DisasterSchema);

export default Disaster;

