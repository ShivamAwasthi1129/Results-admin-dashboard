import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInventoryItem {
  _id?: string;
  name: string;
  description?: string;
  category: 'medical' | 'food' | 'water' | 'shelter' | 'transport' | 'equipment' | 'clothing' | 'other';
  unit: string; // e.g., 'kits', 'liters', 'kg', 'pieces', 'units'
  sku?: string; // Stock Keeping Unit
  barcode?: string;
  image?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInventoryItemDocument extends Omit<IInventoryItem, '_id'>, Document {}

const InventoryItemSchema = new Schema<IInventoryItemDocument>(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['medical', 'food', 'water', 'shelter', 'transport', 'equipment', 'clothing', 'other'],
      required: [true, 'Category is required'],
      index: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    image: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'inventory_items',
  }
);

// Indexes
InventoryItemSchema.index({ name: 'text', description: 'text' });

const InventoryItem: Model<IInventoryItemDocument> =
  mongoose.models.InventoryItem || mongoose.model<IInventoryItemDocument>('InventoryItem', InventoryItemSchema);

export default InventoryItem;

