import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserStatus } from '@/types';

export type OpsUserRole = 'super_admin' | 'admin';

export interface IOpsUserDocument extends Document {
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  password: string;
  phone?: string;
  role: OpsUserRole;
  status: UserStatus;
  avatar?: string;
  profilePhoto?: string;
  dateOfBirth?: Date;
  bloodGroup?: '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  gender?: '' | 'male' | 'female' | 'other' | 'prefer_not_to_say';
  ssnNumber?: string;
  driversLicense?: {
    number?: string;
    state?: string;
    expiryDate?: Date;
  };
  emergencyContact?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    relation?: string;
  };
  address?: {
    street?: string;
    apartment?: string;
    city?: string;
    state?: string;
    pincode?: string;
    zipCode?: string;
    country?: string;
  };
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      emergencyAlerts?: boolean;
      disasterUpdates?: boolean;
      volunteerAssignments?: boolean;
      systemUpdates?: boolean;
      weeklyReport?: boolean;
    };
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const OpsUserSchema = new Schema<IOpsUserDocument>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [30, 'First name cannot exceed 30 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [30, 'Last name cannot exceed 30 characters'],
    },
    name: { type: String, trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    phone: { type: String, trim: true, default: '' },
    role: {
      type: String,
      enum: ['super_admin', 'admin'] as OpsUserRole[],
      default: 'admin',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'] as UserStatus[],
      default: 'active',
    },
    avatar: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    dateOfBirth: { type: Date },
    bloodGroup: {
      type: String,
      enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
      default: '',
    },
    gender: {
      type: String,
      enum: ['', 'male', 'female', 'other', 'prefer_not_to_say'],
      default: '',
    },
    ssnNumber: { type: String, trim: true, default: '' },
    driversLicense: {
      number: { type: String, default: '' },
      state: { type: String, default: '' },
      expiryDate: { type: Date },
    },
    emergencyContact: {
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: '' },
    },
    address: {
      street: { type: String, default: '' },
      apartment: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'United States' },
    },
    preferences: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true, collection: 'ops_users' }
);

OpsUserSchema.index({ email: 1 });
OpsUserSchema.index({ role: 1, status: 1 });
OpsUserSchema.index({ firstName: 1, lastName: 1 });

const OpsUser: Model<IOpsUserDocument> =
  mongoose.models.OpsUser || mongoose.model<IOpsUserDocument>('OpsUser', OpsUserSchema);

export default OpsUser;
