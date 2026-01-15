import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProductSpecification {
  key: string;
  value: string;
}

export interface IProductImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

export interface IProduct {
  _id?: string;
  name: string;
  description?: string;
  sku: string; // Stock Keeping Unit - unique identifier
  barcode?: string; // Barcode for scanning
  category: 'shoes' | 'boots' | 'jackets' | 'watches' | 'shirts' | 'safety_suits' | 'safety_equipment' | 'accessories' | 'other';
  subcategory?: string; // e.g., "Work Boots", "Safety Watches", "Reflective Jackets"
  
  // Pricing
  costPrice: number; // Cost to company
  sellingPrice: number; // Selling price to customers
  discount?: number; // Discount percentage
  taxRate?: number; // Tax rate percentage
  
  // Stock Management
  stock: {
    quantity: number; // Current stock quantity
    lowStockThreshold: number; // Alert when stock goes below this
    reservedQuantity: number; // Quantity reserved for orders
    availableQuantity: number; // Calculated: quantity - reservedQuantity
    reorderPoint: number; // When to reorder
    maxStock: number; // Maximum stock capacity
  };
  
  // Product Details
  brand?: string;
  model?: string;
  size?: string[]; // Available sizes (e.g., ["S", "M", "L", "XL"] or ["8", "9", "10"])
  color?: string[]; // Available colors
  material?: string; // Material composition
  weight?: number; // Weight in kg
  dimensions?: {
    length?: number; // in cm
    width?: number; // in cm
    height?: number; // in cm
  };
  
  // Safety Features (for safety products)
  safetyFeatures?: string[]; // e.g., ["Waterproof", "Fire Resistant", "Reflective"]
  safetyStandards?: string[]; // e.g., ["ANSI Z87.1", "OSHA Approved"]
  certifications?: string[]; // e.g., ["CE Certified", "ISO 9001"]
  
  // Images
  images: IProductImage[];
  
  // Specifications
  specifications?: IProductSpecification[];
  
  // Vendor/Supplier Information
  vendor?: {
    name: string;
    contact: string;
    email?: string;
    address?: string;
  };
  
  // Status
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  isFeatured?: boolean; // Featured product
  tags?: string[]; // For searchability
  
  // Additional Info
  warrantyPeriod?: number; // Warranty in months
  returnPolicy?: string;
  shippingInfo?: {
    weight: number;
    dimensions: string;
    shippingClass: string; // e.g., "Standard", "Express", "Overnight"
  };
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string; // User ID who created the product
  lastModifiedBy?: string; // User ID who last modified
}

export interface IProductDocument extends Omit<IProduct, '_id'>, Omit<Document, 'model'> {
  model?: string; // Product model name
}

const ProductSpecificationSchema = new Schema<IProductSpecification>({
  key: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
}, { _id: false });

const ProductImageSchema = new Schema<IProductImage>({
  url: { type: String, required: true },
  alt: { type: String, trim: true },
  isPrimary: { type: Boolean, default: false },
}, { _id: false });

const ProductSchema = new Schema<IProductDocument>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['shoes', 'boots', 'jackets', 'watches', 'shirts', 'safety_suits', 'safety_equipment', 'accessories', 'other'],
      required: [true, 'Category is required'],
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      index: true,
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
      default: 0,
    },
    taxRate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100%'],
      default: 0,
    },
    stock: {
      quantity: {
        type: Number,
        required: true,
        min: [0, 'Stock quantity cannot be negative'],
        default: 0,
      },
      lowStockThreshold: {
        type: Number,
        required: true,
        min: [0, 'Low stock threshold cannot be negative'],
        default: 10,
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
      reorderPoint: {
        type: Number,
        min: [0, 'Reorder point cannot be negative'],
        default: 0,
      },
      maxStock: {
        type: Number,
        min: [0, 'Max stock cannot be negative'],
      },
    },
    brand: {
      type: String,
      trim: true,
      index: true,
    },
    model: {
      type: String,
      trim: true,
    },
    size: {
      type: [String],
      default: [],
    },
    color: {
      type: [String],
      default: [],
    },
    material: {
      type: String,
      trim: true,
    },
    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
    safetyFeatures: {
      type: [String],
      default: [],
    },
    safetyStandards: {
      type: [String],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    images: {
      type: [ProductImageSchema],
      default: [],
    },
    specifications: {
      type: [ProductSpecificationSchema],
      default: [],
    },
    vendor: {
      name: { type: String, trim: true },
      contact: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      address: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'discontinued', 'out_of_stock'],
      default: 'active',
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    warrantyPeriod: {
      type: Number,
      min: [0, 'Warranty period cannot be negative'],
    },
    returnPolicy: {
      type: String,
      trim: true,
    },
    shippingInfo: {
      weight: { type: Number, min: 0 },
      dimensions: { type: String, trim: true },
      shippingClass: { type: String, trim: true },
    },
    createdBy: {
      type: String,
      trim: true,
    },
    lastModifiedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'products',
  }
);

// Indexes for better query performance
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ 'stock.quantity': 1 });
ProductSchema.index({ isFeatured: 1, status: 1 });

// Pre-save hook to calculate availableQuantity and update status
ProductSchema.pre('save', async function() {
  const quantity = Number(this.stock.quantity) || 0;
  const reservedQuantity = Number(this.stock.reservedQuantity) || 0;
  const lowStockThreshold = Number(this.stock.lowStockThreshold) || 0;
  
  // Calculate available quantity
  this.stock.availableQuantity = Math.max(0, quantity - reservedQuantity);
  
  // Update status based on stock
  if (quantity === 0) {
    this.status = 'out_of_stock';
  } else if (quantity < lowStockThreshold) {
    // Keep current status if it's already set, but ensure out_of_stock is set when quantity is 0
    if (this.status === 'out_of_stock' && quantity > 0) {
      this.status = 'active';
    }
  } else if (this.status === 'out_of_stock' && quantity > 0) {
    this.status = 'active';
  }
});

const Product: Model<IProductDocument> =
  mongoose.models.Product || mongoose.model<IProductDocument>('Product', ProductSchema);

export default Product;
