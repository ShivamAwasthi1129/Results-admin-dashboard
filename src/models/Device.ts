import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFamilyMember {
  name: string;
  role: 'Tracked Member' | 'Guardian' | 'Caregiver';
  avatar?: string;
}

export interface IDevice {
  _id?: string;
  deviceId: string; // e.g., "R3S-WR-0001"
  deviceName: string; // e.g., "R3sults Watch Pro"
  deviceType: 'watch_pro' | 'watch_lite' | 'tracker';
  ownerName: string;
  registeredDate: Date;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  batteryLevel: number; // 0-100
  signalStrength: number; // 0-100
  firmwareVersion: string;
  lastSynced: Date;
  status: 'active' | 'inactive' | 'offline' | 'maintenance';
  features: {
    gpsTracking: boolean;
    sosButton: boolean;
    heartRateMonitor: boolean;
    fallDetection: boolean;
  };
  primaryOwner: {
    name: string;
    role: string;
    avatar?: string;
  };
  familyMembers: IFamilyMember[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDeviceDocument extends Omit<IDevice, '_id'>, Document {}

const DeviceSchema = new Schema<IDeviceDocument>(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    deviceName: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
    },
    deviceType: {
      type: String,
      enum: ['watch_pro', 'watch_lite', 'tracker'],
      required: true,
    },
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
    },
    registeredDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    location: {
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
      coordinates: {
        lat: {
          type: Number,
          required: true,
        },
        lng: {
          type: Number,
          required: true,
        },
      },
    },
    batteryLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 100,
    },
    signalStrength: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 100,
    },
    firmwareVersion: {
      type: String,
      required: true,
      trim: true,
      default: '2.4.1',
    },
    lastSynced: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'offline', 'maintenance'],
      default: 'active',
    },
    features: {
      gpsTracking: {
        type: Boolean,
        default: true,
      },
      sosButton: {
        type: Boolean,
        default: true,
      },
      heartRateMonitor: {
        type: Boolean,
        default: false,
      },
      fallDetection: {
        type: Boolean,
        default: false,
      },
    },
    primaryOwner: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      role: {
        type: String,
        default: 'Device Owner',
        trim: true,
      },
      avatar: {
        type: String,
        trim: true,
      },
    },
    familyMembers: [{
      name: {
        type: String,
        required: true,
        trim: true,
      },
      role: {
        type: String,
        enum: ['Tracked Member', 'Guardian', 'Caregiver'],
        default: 'Tracked Member',
      },
      avatar: {
        type: String,
        trim: true,
      },
    }],
  },
  {
    timestamps: true,
    collection: 'devices',
  }
);

// Indexes
DeviceSchema.index({ deviceId: 1 });
DeviceSchema.index({ ownerName: 1 });
DeviceSchema.index({ status: 1 });
DeviceSchema.index({ 'location.coordinates': '2dsphere' });

const Device: Model<IDeviceDocument> = mongoose.models.Device || mongoose.model<IDeviceDocument>('Device', DeviceSchema);

export default Device;

