import mongoose, { Schema, Document, Model } from 'mongoose';
import { IVolunteer, VolunteerAvailability } from '@/types';

export interface IVolunteerDocument extends Omit<IVolunteer, '_id'>, Document {}

// Generate 6-digit unique ID
function generateVolunteerId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const VolunteerSchema = new Schema<IVolunteerDocument>(
  {
    volunteerId: {
      type: String,
      unique: true,
      default: generateVolunteerId,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    // Personal Details
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    },
    profileImage: {
      type: String,
      default: '',
    },
    idProofType: {
      type: String,
      enum: ['aadhar', 'pan', 'driving_license', 'passport', 'voter_id', 'other'],
    },
    idProofNumber: {
      type: String,
      trim: true,
    },
    // Address - USA based
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'United States' },
    },
    // Skills and Experience
    skills: [{
      type: String,
      trim: true,
    }],
    specializations: [{
      type: String,
      trim: true,
    }],
    languages: [{
      type: String,
      trim: true,
    }],
    experience: {
      years: { type: Number, default: 0 },
      description: { type: String, default: '' },
    },
    certifications: [{
      name: { type: String },
      issuedBy: { type: String },
      issuedDate: { type: Date },
      expiryDate: { type: Date },
      documentUrl: { type: String },
    }],
    // Training
    trainingCompleted: [{
      name: { type: String },
      completedDate: { type: Date },
      certificateUrl: { type: String },
    }],
    // Availability
    availability: {
      type: String,
      enum: ['available', 'on_mission', 'unavailable', 'on_leave'] as VolunteerAvailability[],
      default: 'available',
    },
    availabilitySchedule: {
      weekdays: { type: Boolean, default: true },
      weekends: { type: Boolean, default: true },
      nights: { type: Boolean, default: false },
      preferredShift: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'night', 'any'],
        default: 'any',
      },
    },
    // Location
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    preferredWorkAreas: [{
      type: String,
      trim: true,
    }],
    willingToTravel: {
      type: Boolean,
      default: true,
    },
    maxTravelDistance: {
      type: Number, // in km
      default: 50,
    },
    // Mission Stats
    assignedDisasters: [{
      type: String,
    }],
    currentMission: {
      type: String,
    },
    completedMissions: {
      type: Number,
      default: 0,
    },
    totalHoursServed: {
      type: Number,
      default: 0,
    },
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
    badges: [{
      name: { type: String },
      earnedAt: { type: Date },
      description: { type: String },
    }],
    // Emergency Contact
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    // Health Information
    healthInfo: {
      medicalConditions: [{ type: String }],
      allergies: [{ type: String }],
      medications: [{ type: String }],
      physicallyFit: { type: Boolean, default: true },
    },
    // Vehicle
    hasOwnVehicle: {
      type: Boolean,
      default: false,
    },
    vehicleType: {
      type: String,
      enum: ['none', 'motorcycle', 'car', 'suv', 'truck', 'van'],
    },
    vehicleNumber: {
      type: String,
      trim: true,
    },
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending_verification'],
      default: 'active',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: String,
    },
    verifiedAt: {
      type: Date,
    },
    // Timestamps
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    // Notes
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'volunteers',
  }
);

// Indexes
// Note: volunteerId and userId already have unique: true which creates indexes automatically
// Removed explicit indexes to avoid duplicate index warnings
VolunteerSchema.index({ currentLocation: '2dsphere' });
VolunteerSchema.index({ availability: 1 });
VolunteerSchema.index({ status: 1 });
VolunteerSchema.index({ 'address.city': 1 });
VolunteerSchema.index({ skills: 1 });

// Pre-save hook to ensure unique volunteerId
VolunteerSchema.pre('save', async function() {
  if (this.isNew && !this.volunteerId) {
    let isUnique = false;
    while (!isUnique) {
      const newId = generateVolunteerId();
      const existing = await mongoose.models.Volunteer.findOne({ volunteerId: newId });
      if (!existing) {
        this.volunteerId = newId;
        isUnique = true;
      }
    }
  }
});

const Volunteer: Model<IVolunteerDocument> =
  mongoose.models.Volunteer || mongoose.model<IVolunteerDocument>('Volunteer', VolunteerSchema);

export default Volunteer;

