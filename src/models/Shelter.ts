import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShelter {
  _id?: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode?: string;
  country?: string;
  capacity: number;
  currentOccupancy: number;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  description?: string;
  website?: string;
  operatingHours?: string;
  notes?: string;
  facilities: string[];
  status: 'active' | 'full' | 'closed' | 'maintenance';
  type: 'temporary' | 'permanent' | 'emergency' | 'relief_camp';
  coordinates: {
    lat: number;
    lng: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IShelterDocument extends Omit<IShelter, '_id'>, Document {}

const ShelterSchema = new Schema<IShelterDocument>(
  {
    name: {
      type: String,
      required: [true, 'Shelter name is required'],
      trim: true,
      minlength: [2, 'Shelter name must be at least 2 characters'],
      maxlength: [200, 'Shelter name cannot exceed 200 characters'],
    },
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true,
      maxlength: [200, 'Address line 1 cannot exceed 200 characters'],
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: [200, 'Address line 2 cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      minlength: [2, 'City must be at least 2 characters'],
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      minlength: [2, 'State must be at least 2 characters'],
      maxlength: [100, 'State cannot exceed 100 characters'],
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Zip code cannot exceed 20 characters'],
    },
    country: {
      type: String,
      default: 'United States',
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [100000, 'Capacity cannot exceed 100,000'],
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: [0, 'Occupancy cannot be negative'],
      validate: {
        validator: function(value: number) {
          // Allow any occupancy value (no capacity check)
          return value >= 0;
        },
        message: 'Occupancy cannot be negative'
      }
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
      trim: true,
      minlength: [2, 'Contact person name must be at least 2 characters'],
      maxlength: [100, 'Contact person name cannot exceed 100 characters'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      maxlength: [200, 'Email cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, 'Website URL cannot exceed 200 characters'],
    },
    operatingHours: {
      type: String,
      trim: true,
      maxlength: [200, 'Operating hours cannot exceed 200 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    facilities: [{
      type: String,
      trim: true,
    }],
    status: {
      type: String,
      enum: ['active', 'full', 'closed', 'maintenance'],
      default: 'active',
    },
    type: {
      type: String,
      enum: ['temporary', 'permanent', 'emergency', 'relief_camp'],
      required: true,
    },
    coordinates: {
      lat: {
        type: Number,
        required: true,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
      },
      lng: {
        type: Number,
        required: true,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
      },
    },
  },
  {
    timestamps: true,
    collection: 'shelters',
  }
);

// Indexes
ShelterSchema.index({ city: 1, state: 1 });
ShelterSchema.index({ status: 1 });
ShelterSchema.index({ type: 1 });

// Remove any schema-level validation that checks occupancy vs capacity
// The custom validator on currentOccupancy field only checks for negative values

const Shelter: Model<IShelterDocument> = mongoose.models.Shelter || mongoose.model<IShelterDocument>('Shelter', ShelterSchema);

export default Shelter;

