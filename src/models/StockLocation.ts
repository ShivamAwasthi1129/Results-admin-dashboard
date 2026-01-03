import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStockLocation {
  _id?: string;
  name: string;
  address: {
    street: string;
    suite?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  coordinates: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  contactPerson?: {
    name: string;
    phone: string;
    email?: string;
  };
  capacity?: {
    total: number;
    unit: string;
  };
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStockLocationDocument extends Omit<IStockLocation, '_id'>, Document {}

const StockLocationSchema = new Schema<IStockLocationDocument>(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
      index: true,
    },
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true,
      },
      suite: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
        index: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
        index: true,
      },
      zipCode: {
        type: String,
        required: [true, 'Zip code is required'],
        trim: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        default: 'United States',
        trim: true,
      },
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates are required'],
        validate: {
          validator: function(value: number[]) {
            return value.length === 2 && 
                   value[0] >= -180 && value[0] <= 180 && 
                   value[1] >= -90 && value[1] <= 90;
          },
          message: 'Invalid coordinates. Must be [longitude, latitude]',
        },
      },
    },
    contactPerson: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },
    capacity: {
      total: {
        type: Number,
        default: 0,
      },
      unit: {
        type: String,
        default: 'sqft',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'stock_locations',
  }
);

// Geospatial index for location queries
StockLocationSchema.index({ coordinates: '2dsphere' });
StockLocationSchema.index({ 'address.city': 1, 'address.state': 1 });

const StockLocation: Model<IStockLocationDocument> =
  mongoose.models.StockLocation || mongoose.model<IStockLocationDocument>('StockLocation', StockLocationSchema);

export default StockLocation;

