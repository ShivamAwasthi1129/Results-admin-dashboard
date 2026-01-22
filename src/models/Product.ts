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

export interface IProductVariant {
  id: string; // Unique identifier for variant (e.g., "S-Red", "UK8-Black")
  size?: string; // Size (S, M, L, XL, XXL, XXXL, UK8, US9, etc.)
  color?: string; // Color
  strapColor?: string; // For watches
  strapWidth?: string; // For watches (e.g., "20mm", "22mm")
  ukSize?: string; // UK size for shoes
  usSize?: string; // US size for shoes
  stock: {
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  };
  sku?: string; // Variant-specific SKU
  price?: number; // Variant-specific price (optional, uses product price if not set)
}

export interface IProductCategoryAttributes {
  // Shirts
  shirtSizes?: string[]; // ["S", "M", "L", "XL", "XXL", "XXXL"]
  
  // Watches
  strapColors?: string[];
  strapWidths?: string[];
  watchCaseMaterial?: string;
  watchDialColor?: string;
  
  // Shoes
  ukSizes?: string[]; // ["UK 6", "UK 7", "UK 8", etc.]
  usSizes?: string[]; // ["US 7", "US 8", "US 9", etc.]
  shoeWidth?: string; // "Narrow", "Standard", "Wide"
  
  // General
  colors?: string[];
  materials?: string[];
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
  
  // Media
  images: IProductImage[];
  videoUrl?: string; // Video link for product demonstration
  model3dUrl?: string; // 3D model URL (GLB, GLTF, OBJ, etc.)
  model3dFormat?: string; // Format: 'glb', 'gltf', 'obj', etc.
  
  // Key Features (Bullet Points)
  keyFeatures?: string[]; // Key selling points/features
  
  // Variants (for size/color/strap combinations with individual stock)
  variants?: IProductVariant[]; // Array of variants with individual stock tracking
  
  // Category-specific attributes
  categoryAttributes?: IProductCategoryAttributes;
  
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
    videoUrl: {
      type: String,
      trim: true,
    },
    model3dUrl: {
      type: String,
      trim: true,
    },
    model3dFormat: {
      type: String,
      enum: ['glb', 'gltf', 'obj', 'fbx', 'dae'],
      trim: true,
    },
    keyFeatures: {
      type: [String],
      default: [],
    },
    variants: {
      type: [{
        id: { type: String, required: true },
        size: { type: String, trim: true },
        color: { type: String, trim: true },
        strapColor: { type: String, trim: true },
        strapWidth: { type: String, trim: true },
        ukSize: { type: String, trim: true },
        usSize: { type: String, trim: true },
        stock: {
          quantity: { type: Number, required: true, min: 0, default: 0 },
          reservedQuantity: { type: Number, required: true, min: 0, default: 0 },
          availableQuantity: { type: Number, required: true, min: 0, default: 0 },
        },
        sku: { type: String, trim: true, uppercase: true },
        price: { type: Number, min: 0 },
      }],
      default: [],
    },
    categoryAttributes: {
      shirtSizes: { type: [String], default: [] },
      strapColors: { type: [String], default: [] },
      strapWidths: { type: [String], default: [] },
      watchCaseMaterial: { type: String, trim: true },
      watchDialColor: { type: String, trim: true },
      ukSizes: { type: [String], default: [] },
      usSizes: { type: [String], default: [] },
      shoeWidth: { type: String, trim: true },
      colors: { type: [String], default: [] },
      materials: { type: [String], default: [] },
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
  // Calculate total stock from variants if they exist, otherwise use main stock
  let totalQuantity = 0;
  let totalReserved = 0;
  let totalAvailable = 0;
  
  if (this.variants && this.variants.length > 0) {
    // Calculate from variants
    this.variants.forEach((variant: any) => {
      const qty = Number(variant.stock.quantity) || 0;
      const reserved = Number(variant.stock.reservedQuantity) || 0;
      const available = Math.max(0, qty - reserved);
      
      variant.stock.availableQuantity = available;
      totalQuantity += qty;
      totalReserved += reserved;
      totalAvailable += available;
    });
    
    // Update main stock totals
    this.stock.quantity = totalQuantity;
    this.stock.reservedQuantity = totalReserved;
    this.stock.availableQuantity = totalAvailable;
  } else {
    // Use main stock (backward compatibility)
    const quantity = Number(this.stock.quantity) || 0;
    const reservedQuantity = Number(this.stock.reservedQuantity) || 0;
    const lowStockThreshold = Number(this.stock.lowStockThreshold) || 0;
    
    // Calculate available quantity
    this.stock.availableQuantity = Math.max(0, quantity - reservedQuantity);
    totalQuantity = quantity;
    totalAvailable = this.stock.availableQuantity;
  }
  
  const lowStockThreshold = Number(this.stock.lowStockThreshold) || 0;
  
  // Update status based on stock
  if (totalQuantity === 0) {
    this.status = 'out_of_stock';
  } else if (totalQuantity < lowStockThreshold) {
    // Keep current status if it's already set, but ensure out_of_stock is set when quantity is 0
    if (this.status === 'out_of_stock' && totalQuantity > 0) {
      this.status = 'active';
    }
  } else if (this.status === 'out_of_stock' && totalQuantity > 0) {
    this.status = 'active';
  }
});

const Product: Model<IProductDocument> =
  mongoose.models.Product || mongoose.model<IProductDocument>('Product', ProductSchema);

export default Product;
