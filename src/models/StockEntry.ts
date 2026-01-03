import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBatch {
  batchNumber: string;
  quantity: number;
  expiryDate: Date;
  receivedDate: Date;
  condition: 'New' | 'Good' | 'Fair' | 'Damaged';
}

export interface IAction {
  type: 'Restock' | 'Dispatch' | 'Transfer' | 'Adjustment' | 'Expiry';
  triggeredBy: string; // User ID or "System (Threshold Breach)" etc.
  timestamp: Date;
  status: 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface IAuditLog {
  userId: string;
  change: string;
  timestamp: Date;
}

export interface IStockEntry {
  _id?: string;
  item: {
    name: string;
    category: string;
    sku: string;
    description?: string;
  };
  location: {
    warehouseId: string;
    name: string;
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    manager: {
      name: string;
      contact: string;
      email: string;
    };
  };
  inventory: {
    currentQuantity: number;
    unit: string;
    threshold: number;
    reservedQuantity: number;
    availableQuantity: number; // Calculated: currentQuantity - reservedQuantity
  };
  status: 'In-Stock' | 'Low Stock' | 'Critical' | 'Depleted' | 'Expired';
  batches: IBatch[];
  actions: IAction[];
  auditLog: IAuditLog[];
  tags: string[];
  lastUpdated?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStockEntryDocument extends Omit<IStockEntry, '_id'>, Document {}

const BatchSchema = new Schema<IBatch>({
  batchNumber: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  receivedDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  condition: {
    type: String,
    enum: ['New', 'Good', 'Fair', 'Damaged'],
    default: 'New',
  },
}, { _id: false });

const ActionSchema = new Schema<IAction>({
  type: {
    type: String,
    enum: ['Restock', 'Dispatch', 'Transfer', 'Adjustment', 'Expiry'],
    required: true,
  },
  triggeredBy: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  notes: {
    type: String,
    trim: true,
  },
}, { _id: false });

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: String,
    required: true,
    trim: true,
  },
  change: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false });

const StockEntrySchema = new Schema<IStockEntryDocument>(
  {
    item: {
      name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
        index: true,
      },
      category: {
        type: String,
        required: [true, 'Item category is required'],
        trim: true,
        index: true,
      },
      sku: {
        type: String,
        required: [true, 'SKU is required'],
        unique: true,
        trim: true,
        index: true,
      },
      description: {
        type: String,
        trim: true,
      },
    },
    location: {
      warehouseId: {
        type: String,
        required: [true, 'Warehouse ID is required'],
        trim: true,
        index: true,
      },
      name: {
        type: String,
        required: [true, 'Location name is required'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
      },
      coordinates: {
        latitude: {
          type: Number,
          required: [true, 'Latitude is required'],
          min: -90,
          max: 90,
        },
        longitude: {
          type: Number,
          required: [true, 'Longitude is required'],
          min: -180,
          max: 180,
        },
      },
      manager: {
        name: {
          type: String,
          required: [true, 'Manager name is required'],
          trim: true,
        },
        contact: {
          type: String,
          required: [true, 'Manager contact is required'],
          trim: true,
        },
        email: {
          type: String,
          required: [true, 'Manager email is required'],
          trim: true,
          lowercase: true,
        },
      },
    },
    inventory: {
      currentQuantity: {
        type: Number,
        required: [true, 'Current quantity is required'],
        min: [0, 'Quantity cannot be negative'],
        default: 0,
      },
      unit: {
        type: String,
        required: [true, 'Unit is required'],
        trim: true,
      },
      threshold: {
        type: Number,
        required: [true, 'Threshold is required'],
        min: [0, 'Threshold cannot be negative'],
        default: 0,
      },
      reservedQuantity: {
        type: Number,
        required: true,
        min: [0, 'Reserved quantity cannot be negative'],
        default: 0,
      },
      availableQuantity: {
        type: Number,
        required: true,
        min: [0, 'Available quantity cannot be negative'],
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ['In-Stock', 'Low Stock', 'Critical', 'Depleted', 'Expired'],
      default: 'In-Stock',
      index: true,
    },
    batches: {
      type: [BatchSchema],
      default: [],
    },
    actions: {
      type: [ActionSchema],
      default: [],
    },
    auditLog: {
      type: [AuditLogSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'stock_entries',
  }
);

// Indexes
StockEntrySchema.index({ 'item.sku': 1, 'location.warehouseId': 1 }, { unique: true });
StockEntrySchema.index({ 'location.warehouseId': 1 });
StockEntrySchema.index({ status: 1 });
StockEntrySchema.index({ tags: 1 });
StockEntrySchema.index({ 'item.category': 1 });

// Pre-save hook to calculate availableQuantity and update status
StockEntrySchema.pre('save', async function() {
  // Ensure quantities are numbers
  const currentQuantity = Number(this.inventory.currentQuantity) || 0;
  const reservedQuantity = Number(this.inventory.reservedQuantity) || 0;
  const threshold = Number(this.inventory.threshold) || 0;
  
  // Update the values to ensure they're stored as numbers
  this.inventory.currentQuantity = currentQuantity;
  this.inventory.reservedQuantity = reservedQuantity;
  this.inventory.threshold = threshold;
  
  // Calculate available quantity
  this.inventory.availableQuantity = Math.max(0, currentQuantity - reservedQuantity);
  
  // Update status based on quantity and threshold
  if (currentQuantity === 0) {
    this.status = 'Depleted';
  } else if (currentQuantity < threshold * 0.2) {
    this.status = 'Critical';
  } else if (currentQuantity < threshold) {
    this.status = 'Low Stock';
  } else {
    // Check for expired batches
    const now = new Date();
    const hasExpiredBatches = this.batches.some(batch => batch.expiryDate < now);
    if (hasExpiredBatches && currentQuantity > 0) {
      this.status = 'Expired';
    } else if (this.status !== 'In-Stock') {
      this.status = 'In-Stock';
    }
  }
  
  // Update lastUpdated timestamp
  this.lastUpdated = new Date();
});

const StockEntry: Model<IStockEntryDocument> =
  mongoose.models.StockEntry || mongoose.model<IStockEntryDocument>('StockEntry', StockEntrySchema);

export default StockEntry;
