import mongoose, { Schema, Document, Model } from 'mongoose';
import { IEmergency, EmergencyStatus, EmergencyPriority } from '@/types';

export interface IEmergencyDocument extends Omit<IEmergency, '_id'>, Document {}

const EmergencySchema = new Schema<IEmergencyDocument>(
  {
    title: {
      type: String,
      required: [true, 'Emergency title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Emergency description is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['evacuation', 'rescue', 'medical', 'supply_delivery', 'shelter', 'other'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'] as EmergencyPriority[],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'dispatched', 'in_progress', 'resolved', 'cancelled'] as EmergencyStatus[],
      default: 'pending',
    },
    disasterId: {
      type: Schema.Types.ObjectId,
      ref: 'Disaster',
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
    },
    requestedBy: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
    },
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: 'Volunteer',
    }],
    numberOfPeople: {
      type: Number,
      default: 1,
    },
    specialRequirements: [{
      type: String,
    }],
    estimatedTime: {
      type: String,
    },
    actualCompletionTime: {
      type: Date,
    },
    notes: [{
      type: String,
    }],
  },
  {
    timestamps: true,
    collection: 'emergencies',
  }
);

// Indexes
EmergencySchema.index({ 'location': '2dsphere' });
EmergencySchema.index({ status: 1, priority: -1 });
EmergencySchema.index({ disasterId: 1 });
EmergencySchema.index({ createdAt: -1 });

const Emergency: Model<IEmergencyDocument> =
  mongoose.models.Emergency || mongoose.model<IEmergencyDocument>('Emergency', EmergencySchema);

export default Emergency;

