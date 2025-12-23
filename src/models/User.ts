import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser, UserRole, UserStatus } from '@/types';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    // Name fields - split into first and last name
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
    // Virtual field for full name (for backward compatibility)
    name: {
      type: String,
      trim: true,
    },
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
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'volunteer', 'service_provider'] as UserRole[],
      default: 'volunteer',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'] as UserStatus[],
      default: 'active',
    },
    avatar: {
      type: String,
      default: '',
    },
    // Profile Photo
    profilePhoto: {
      type: String,
      default: '',
    },
    // Personal Details
    dateOfBirth: {
      type: Date,
    },
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
    // ID Proof - USA based (SSN instead of Aadhar)
    ssnNumber: {
      type: String,
      trim: true,
      default: '',
    },
    // Legacy field for backward compatibility
    aadharNumber: {
      type: String,
      trim: true,
      default: '',
    },
    // Driver's License (USA)
    driversLicense: {
      number: { type: String, default: '' },
      state: { type: String, default: '' },
      expiryDate: { type: Date },
    },
    // Emergency Contact
    emergencyContact: {
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: '' },
    },
    // Address - USA based
    address: {
      street: { type: String, default: '' },
      apartment: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'United States' },
    },
  },
  {
    timestamps: true,
    collection: 'auth',
  }
);

// Pre-save hook to set full name from firstName + lastName
UserSchema.pre('save', function(next) {
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`;
  }
  next();
});

// Indexes
// Note: email index is automatically created by unique: true
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ firstName: 1, lastName: 1 });

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
