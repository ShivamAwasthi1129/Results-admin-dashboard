/**
 * Seed Products Script
 * 
 * Run this script from the terminal:
 * npm run seed:products
 * 
 * Or directly:
 * npx tsx scripts/seed-products.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || '';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set!');
  console.error('   Please set MONGODB_URI in your .env.local or .env file');
  process.exit(1);
}

async function seedData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const uriDisplay = MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`   URI: ${uriDisplay}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Dynamically import Product model
    const modelsPath = resolve(process.cwd(), 'src/models');
    const ProductModule = require(`${modelsPath}/Product`);
    const Product = ProductModule.default || ProductModule;

    // Clear existing products
    console.log('🗑️  Clearing existing products...');
    await Product.deleteMany({});
    console.log('✅ Cleared existing products\n');

    // Product data
    const products = [
      // SHOES
      {
        name: 'Professional Safety Work Boots',
        description: 'Heavy-duty steel toe work boots with slip-resistant sole. Perfect for construction and industrial work.',
        sku: 'SHOES-001',
        barcode: '1234567890123',
        category: 'shoes',
        subcategory: 'Work Boots',
        costPrice: 45.00,
        sellingPrice: 89.99,
        discount: 0,
        taxRate: 8.5,
        stock: {
          quantity: 150,
          lowStockThreshold: 20,
          reservedQuantity: 5,
          availableQuantity: 145,
          reorderPoint: 25,
          maxStock: 200,
        },
        brand: 'SafetyPro',
        model: 'SP-WB-2024',
        size: ['7', '8', '9', '10', '11', '12'],
        color: ['Black', 'Brown'],
        material: 'Leather with Steel Toe',
        weight: 1.2,
        dimensions: { length: 32, width: 12, height: 15 },
        safetyFeatures: ['Steel Toe', 'Slip Resistant', 'Waterproof', 'Puncture Resistant'],
        safetyStandards: ['ANSI Z41', 'OSHA Approved'],
        certifications: ['CE Certified'],
        images: [
          { url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', alt: 'Safety Work Boots', isPrimary: true },
        ],
        specifications: [
          { key: 'Toe Type', value: 'Steel Toe' },
          { key: 'Sole Material', value: 'Rubber' },
          { key: 'Upper Material', value: 'Leather' },
          { key: 'Closure', value: 'Lace-up' },
        ],
        vendor: {
          name: 'Safety Equipment Co.',
          contact: '+1-555-0101',
          email: 'sales@safetyequip.com',
          address: '123 Industrial Blvd, Safety City, SC 12345',
        },
        status: 'active',
        isFeatured: true,
        tags: ['safety', 'work boots', 'steel toe', 'industrial'],
        warrantyPeriod: 12,
        returnPolicy: '30 days return policy',
        shippingInfo: {
          weight: 1.2,
          dimensions: '32x12x15 cm',
          shippingClass: 'Standard',
        },
      },
      {
        name: 'Comfortable Athletic Safety Shoes',
        description: 'Lightweight athletic shoes with safety features for active workers.',
        sku: 'SHOES-002',
        barcode: '1234567890124',
        category: 'shoes',
        subcategory: 'Athletic Safety',
        costPrice: 35.00,
        sellingPrice: 69.99,
        discount: 10,
        taxRate: 8.5,
        stock: {
          quantity: 200,
          lowStockThreshold: 30,
          reservedQuantity: 10,
          availableQuantity: 190,
          reorderPoint: 35,
          maxStock: 250,
        },
        brand: 'ActiveSafe',
        model: 'AS-ATH-2024',
        size: ['6', '7', '8', '9', '10', '11', '12'],
        color: ['Black', 'White', 'Gray'],
        material: 'Synthetic Mesh',
        weight: 0.8,
        safetyFeatures: ['Non-slip', 'Breathable', 'Lightweight'],
        images: [
          { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', alt: 'Athletic Safety Shoes', isPrimary: true },
        ],
        vendor: {
          name: 'Active Gear Inc.',
          contact: '+1-555-0102',
          email: 'info@activegear.com',
        },
        status: 'active',
        tags: ['athletic', 'comfort', 'lightweight'],
        warrantyPeriod: 6,
      },
      
      // BOOTS
      {
        name: 'Heavy Duty Waterproof Boots',
        description: 'Full-grain leather waterproof boots for extreme conditions.',
        sku: 'BOOTS-001',
        barcode: '1234567890125',
        category: 'boots',
        subcategory: 'Waterproof Boots',
        costPrice: 65.00,
        sellingPrice: 129.99,
        discount: 0,
        taxRate: 8.5,
        stock: {
          quantity: 80,
          lowStockThreshold: 15,
          reservedQuantity: 3,
          availableQuantity: 77,
          reorderPoint: 20,
          maxStock: 120,
        },
        brand: 'ToughFoot',
        model: 'TF-WP-2024',
        size: ['8', '9', '10', '11', '12'],
        color: ['Black', 'Brown'],
        material: 'Full Grain Leather',
        weight: 1.5,
        safetyFeatures: ['Waterproof', 'Insulated', 'Steel Shank'],
        images: [
          { url: 'https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=400', alt: 'Waterproof Boots', isPrimary: true },
        ],
        vendor: {
          name: 'ToughFoot Manufacturing',
          contact: '+1-555-0103',
          email: 'sales@toughfoot.com',
        },
        status: 'active',
        isFeatured: true,
        tags: ['waterproof', 'heavy duty', 'extreme conditions'],
        warrantyPeriod: 18,
      },
      {
        name: 'Insulated Winter Safety Boots',
        description: 'Warm insulated boots perfect for cold weather work environments.',
        sku: 'BOOTS-002',
        barcode: '1234567890126',
        category: 'boots',
        subcategory: 'Winter Boots',
        costPrice: 55.00,
        sellingPrice: 109.99,
        discount: 15,
        taxRate: 8.5,
        stock: {
          quantity: 120,
          lowStockThreshold: 25,
          reservedQuantity: 8,
          availableQuantity: 112,
          reorderPoint: 30,
          maxStock: 150,
        },
        brand: 'WinterPro',
        model: 'WP-INS-2024',
        size: ['7', '8', '9', '10', '11', '12'],
        color: ['Black'],
        material: 'Leather with Thinsulate',
        weight: 1.3,
        safetyFeatures: ['Insulated', 'Waterproof', 'Slip Resistant'],
        images: [
          { url: 'https://images.unsplash.com/photo-1608256246200-53e6092ffdbe?w=400', alt: 'Winter Boots', isPrimary: true },
        ],
        vendor: {
          name: 'Winter Gear Co.',
          contact: '+1-555-0104',
          email: 'info@wintergear.com',
        },
        status: 'active',
        tags: ['winter', 'insulated', 'cold weather'],
        warrantyPeriod: 12,
      },
      
      // JACKETS
      {
        name: 'High-Visibility Reflective Jacket',
        description: 'ANSI Class 3 high-visibility safety jacket with reflective strips.',
        sku: 'JACKET-001',
        barcode: '1234567890127',
        category: 'jackets',
        subcategory: 'High-Visibility',
        costPrice: 40.00,
        sellingPrice: 79.99,
        discount: 0,
        taxRate: 8.5,
        stock: {
          quantity: 180,
          lowStockThreshold: 30,
          reservedQuantity: 12,
          availableQuantity: 168,
          reorderPoint: 35,
          maxStock: 220,
        },
        brand: 'VisSafe',
        model: 'VS-HV-2024',
        size: ['S', 'M', 'L', 'XL', 'XXL'],
        color: ['Yellow', 'Orange', 'Lime Green'],
        material: 'Polyester with Reflective Tape',
        weight: 0.6,
        safetyFeatures: ['High Visibility', 'Reflective Strips', 'Water Resistant'],
        safetyStandards: ['ANSI/ISEA 107 Class 3'],
        certifications: ['CE Certified'],
        images: [
          { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', alt: 'High-Visibility Jacket', isPrimary: true },
        ],
        vendor: {
          name: 'Visibility Solutions Inc.',
          contact: '+1-555-0105',
          email: 'sales@visibilitysolutions.com',
        },
        status: 'active',
        isFeatured: true,
        tags: ['high visibility', 'reflective', 'safety'],
        warrantyPeriod: 12,
      },
      {
        name: 'Waterproof Work Jacket',
        description: 'Durable waterproof jacket for outdoor work in all weather conditions.',
        sku: 'JACKET-002',
        barcode: '1234567890128',
        category: 'jackets',
        subcategory: 'Waterproof',
        costPrice: 50.00,
        sellingPrice: 99.99,
        discount: 10,
        taxRate: 8.5,
        stock: {
          quantity: 150,
          lowStockThreshold: 25,
          reservedQuantity: 7,
          availableQuantity: 143,
          reorderPoint: 30,
          maxStock: 180,
        },
        brand: 'WeatherGuard',
        model: 'WG-WP-2024',
        size: ['S', 'M', 'L', 'XL', 'XXL'],
        color: ['Black', 'Navy Blue', 'Gray'],
        material: 'Polyester with PVC Coating',
        weight: 0.8,
        safetyFeatures: ['Waterproof', 'Windproof', 'Breathable'],
        images: [
          { url: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400', alt: 'Waterproof Jacket', isPrimary: true },
        ],
        vendor: {
          name: 'Weather Protection Co.',
          contact: '+1-555-0106',
          email: 'info@weatherguard.com',
        },
        status: 'active',
        tags: ['waterproof', 'work jacket', 'outdoor'],
        warrantyPeriod: 12,
      },
      
      // WATCHES
      {
        name: 'Rugged Safety Smartwatch',
        description: 'Durable smartwatch with safety features including SOS button and location tracking.',
        sku: 'WATCH-001',
        barcode: '1234567890129',
        category: 'watches',
        subcategory: 'Smartwatch',
        costPrice: 120.00,
        sellingPrice: 249.99,
        discount: 0,
        taxRate: 8.5,
        stock: {
          quantity: 60,
          lowStockThreshold: 10,
          reservedQuantity: 2,
          availableQuantity: 58,
          reorderPoint: 15,
          maxStock: 100,
        },
        brand: 'SafeTech',
        model: 'ST-SW-2024',
        size: ['One Size'],
        color: ['Black', 'Silver'],
        material: 'Stainless Steel & Silicone',
        weight: 0.05,
        safetyFeatures: ['SOS Button', 'GPS Tracking', 'Heart Rate Monitor', 'Fall Detection'],
        certifications: ['IP68 Waterproof', 'MIL-STD-810G'],
        images: [
          { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', alt: 'Safety Smartwatch', isPrimary: true },
        ],
        specifications: [
          { key: 'Battery Life', value: '7 days' },
          { key: 'Water Resistance', value: '50m' },
          { key: 'Display', value: '1.4" AMOLED' },
        ],
        vendor: {
          name: 'SafeTech Electronics',
          contact: '+1-555-0107',
          email: 'sales@safetech.com',
        },
        status: 'active',
        isFeatured: true,
        tags: ['smartwatch', 'GPS', 'SOS', 'safety'],
        warrantyPeriod: 24,
      },
      {
        name: 'Classic Safety Watch',
        description: 'Traditional analog watch with large numbers and luminous hands for visibility.',
        sku: 'WATCH-002',
        barcode: '1234567890130',
        category: 'watches',
        subcategory: 'Analog',
        costPrice: 25.00,
        sellingPrice: 49.99,
        discount: 20,
        taxRate: 8.5,
        stock: {
          quantity: 200,
          lowStockThreshold: 40,
          reservedQuantity: 15,
          availableQuantity: 185,
          reorderPoint: 50,
          maxStock: 250,
        },
        brand: 'TimeSafe',
        model: 'TS-CL-2024',
        size: ['One Size'],
        color: ['Black', 'Silver', 'Blue'],
        material: 'Stainless Steel',
        weight: 0.08,
        safetyFeatures: ['Luminous Hands', 'Shock Resistant'],
        images: [
          { url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400', alt: 'Classic Watch', isPrimary: true },
        ],
        vendor: {
          name: 'TimeSafe Watches',
          contact: '+1-555-0108',
          email: 'info@timesafe.com',
        },
        status: 'active',
        tags: ['analog', 'classic', 'durable'],
        warrantyPeriod: 12,
      },
      
      // SHIRTS
      {
        name: 'Flame-Resistant Work Shirt',
        description: 'FR-rated work shirt for protection against flames and heat.',
        sku: 'SHIRT-001',
        barcode: '1234567890131',
        category: 'shirts',
        subcategory: 'Flame Resistant',
        costPrice: 35.00,
        sellingPrice: 69.99,
        discount: 0,
        taxRate: 8.5,
        stock: {
          quantity: 250,
          lowStockThreshold: 50,
          reservedQuantity: 20,
          availableQuantity: 230,
          reorderPoint: 60,
          maxStock: 300,
        },
        brand: 'FlameGuard',
        model: 'FG-FR-2024',
        size: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
        color: ['Navy Blue', 'Gray', 'Khaki'],
        material: 'FR-Treated Cotton',
        weight: 0.4,
        safetyFeatures: ['Flame Resistant', 'Arc Rated', 'Comfortable Fit'],
        safetyStandards: ['NFPA 70E', 'ASTM F1506'],
        certifications: ['FR Certified'],
        images: [
          { url: 'https://images.unsplash.com/photo-1594938291221-94f18ab4d1df?w=400', alt: 'FR Work Shirt', isPrimary: true },
        ],
        vendor: {
          name: 'FlameGuard Apparel',
          contact: '+1-555-0109',
          email: 'sales@flameguard.com',
        },
        status: 'active',
        isFeatured: true,
        tags: ['flame resistant', 'FR', 'work shirt'],
        warrantyPeriod: 6,
      },
      {
        name: 'Moisture-Wicking Safety Shirt',
        description: 'Breathable moisture-wicking shirt for hot work environments.',
        sku: 'SHIRT-002',
        barcode: '1234567890132',
        category: 'shirts',
        subcategory: 'Performance',
        costPrice: 20.00,
        sellingPrice: 39.99,
        discount: 15,
        taxRate: 8.5,
        stock: {
          quantity: 300,
          lowStockThreshold: 60,
          reservedQuantity: 25,
          availableQuantity: 275,
          reorderPoint: 70,
          maxStock: 350,
        },
        brand: 'CoolWork',
        model: 'CW-MW-2024',
        size: ['S', 'M', 'L', 'XL', 'XXL'],
        color: ['White', 'Gray', 'Navy Blue'],
        material: 'Polyester Blend',
        weight: 0.3,
        safetyFeatures: ['Moisture Wicking', 'UV Protection', 'Breathable'],
        images: [
          { url: 'https://images.unsplash.com/photo-1603252109303-2751441dd159?w=400', alt: 'Performance Shirt', isPrimary: true },
        ],
        vendor: {
          name: 'CoolWork Apparel',
          contact: '+1-555-0110',
          email: 'info@coolwork.com',
        },
        status: 'active',
        tags: ['moisture wicking', 'breathable', 'performance'],
        warrantyPeriod: 6,
      },
      
      // SAFETY SUITS
      {
        name: 'Hazmat Chemical Protection Suit',
        description: 'Full-body chemical protection suit for hazardous material handling.',
        sku: 'SUIT-001',
        barcode: '1234567890133',
        category: 'safety_suits',
        subcategory: 'Hazmat',
        costPrice: 150.00,
        sellingPrice: 299.99,
        discount: 0,
        taxRate: 8.5,
        stock: {
          quantity: 40,
          lowStockThreshold: 8,
          reservedQuantity: 2,
          availableQuantity: 38,
          reorderPoint: 10,
          maxStock: 60,
        },
        brand: 'ChemSafe',
        model: 'CS-HM-2024',
        size: ['S', 'M', 'L', 'XL'],
        color: ['White', 'Yellow'],
        material: 'Tyvek with Sealed Seams',
        weight: 0.5,
        safetyFeatures: ['Chemical Resistant', 'Liquid Tight', 'Breathable'],
        safetyStandards: ['NFPA 1991', 'EN 943'],
        certifications: ['CE Certified', 'OSHA Approved'],
        images: [
          { url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400', alt: 'Hazmat Suit', isPrimary: true },
        ],
        vendor: {
          name: 'ChemSafe Protection',
          contact: '+1-555-0111',
          email: 'sales@chemsafe.com',
        },
        status: 'active',
        isFeatured: true,
        tags: ['hazmat', 'chemical protection', 'full body'],
        warrantyPeriod: 12,
      },
      {
        name: 'Arc Flash Protection Suit',
        description: 'Multi-layer arc flash protection suit for electrical workers.',
        sku: 'SUIT-002',
        barcode: '1234567890134',
        category: 'safety_suits',
        subcategory: 'Arc Flash',
        costPrice: 200.00,
        sellingPrice: 399.99,
        discount: 0,
        taxRate: 8.5,
        stock: {
          quantity: 30,
          lowStockThreshold: 6,
          reservedQuantity: 1,
          availableQuantity: 29,
          reorderPoint: 8,
          maxStock: 50,
        },
        brand: 'ArcGuard',
        model: 'AG-AF-2024',
        size: ['M', 'L', 'XL', 'XXL'],
        color: ['Yellow', 'Orange'],
        material: 'Nomex with Arc Flash Protection',
        weight: 1.2,
        safetyFeatures: ['Arc Flash Rated', 'Fire Resistant', 'Multi-Layer'],
        safetyStandards: ['NFPA 70E', 'ASTM F1506'],
        certifications: ['ATPV Rated', 'CE Certified'],
        images: [
          { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', alt: 'Arc Flash Suit', isPrimary: true },
        ],
        vendor: {
          name: 'ArcGuard Safety',
          contact: '+1-555-0112',
          email: 'sales@arcguard.com',
        },
        status: 'active',
        tags: ['arc flash', 'electrical safety', 'fire resistant'],
        warrantyPeriod: 18,
      },
      
      // SAFETY EQUIPMENT
      {
        name: 'Hard Hat with Face Shield',
        description: 'ANSI Type I hard hat with integrated face shield for head and face protection.',
        sku: 'EQUIP-001',
        barcode: '1234567890135',
        category: 'safety_equipment',
        subcategory: 'Head Protection',
        costPrice: 30.00,
        sellingPrice: 59.99,
        discount: 0,
        taxRate: 8.5,
        stock: {
          quantity: 200,
          lowStockThreshold: 40,
          reservedQuantity: 15,
          availableQuantity: 185,
          reorderPoint: 50,
          maxStock: 250,
        },
        brand: 'HeadSafe',
        model: 'HS-FS-2024',
        size: ['One Size (Adjustable)'],
        color: ['White', 'Yellow', 'Blue'],
        material: 'HDPE with Polycarbonate Shield',
        weight: 0.4,
        safetyFeatures: ['Impact Resistant', 'Face Shield', 'Adjustable'],
        safetyStandards: ['ANSI Z89.1 Type I'],
        certifications: ['CE Certified'],
        images: [
          { url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400', alt: 'Hard Hat', isPrimary: true },
        ],
        vendor: {
          name: 'HeadSafe Equipment',
          contact: '+1-555-0113',
          email: 'sales@headsafe.com',
        },
        status: 'active',
        isFeatured: true,
        tags: ['hard hat', 'face shield', 'head protection'],
        warrantyPeriod: 12,
      },
      {
        name: 'Safety Glasses with Anti-Fog',
        description: 'ANSI Z87.1 certified safety glasses with anti-fog coating.',
        sku: 'EQUIP-002',
        barcode: '1234567890136',
        category: 'safety_equipment',
        subcategory: 'Eye Protection',
        costPrice: 8.00,
        sellingPrice: 19.99,
        discount: 25,
        taxRate: 8.5,
        stock: {
          quantity: 500,
          lowStockThreshold: 100,
          reservedQuantity: 50,
          availableQuantity: 450,
          reorderPoint: 120,
          maxStock: 600,
        },
        brand: 'EyeGuard',
        model: 'EG-AF-2024',
        size: ['One Size'],
        color: ['Clear', 'Tinted', 'Yellow'],
        material: 'Polycarbonate',
        weight: 0.02,
        safetyFeatures: ['Anti-Fog', 'UV Protection', 'Scratch Resistant'],
        safetyStandards: ['ANSI Z87.1'],
        certifications: ['CE Certified'],
        images: [
          { url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400', alt: 'Safety Glasses', isPrimary: true },
        ],
        vendor: {
          name: 'EyeGuard Optics',
          contact: '+1-555-0114',
          email: 'info@eyeguard.com',
        },
        status: 'active',
        tags: ['safety glasses', 'eye protection', 'anti-fog'],
        warrantyPeriod: 6,
      },
      {
        name: 'Heavy Duty Work Gloves',
        description: 'Leather work gloves with reinforced palms for maximum durability.',
        sku: 'EQUIP-003',
        barcode: '1234567890137',
        category: 'safety_equipment',
        subcategory: 'Hand Protection',
        costPrice: 12.00,
        sellingPrice: 24.99,
        discount: 0,
        taxRate: 8.5,
        stock: {
          quantity: 400,
          lowStockThreshold: 80,
          reservedQuantity: 30,
          availableQuantity: 370,
          reorderPoint: 100,
          maxStock: 500,
        },
        brand: 'HandGuard',
        model: 'HG-HD-2024',
        size: ['S', 'M', 'L', 'XL'],
        color: ['Brown', 'Black'],
        material: 'Leather with Reinforced Palms',
        weight: 0.15,
        safetyFeatures: ['Cut Resistant', 'Abrasion Resistant', 'Reinforced Palms'],
        images: [
          { url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400', alt: 'Work Gloves', isPrimary: true },
        ],
        vendor: {
          name: 'HandGuard Gloves',
          contact: '+1-555-0115',
          email: 'sales@handguard.com',
        },
        status: 'active',
        tags: ['gloves', 'hand protection', 'durable'],
        warrantyPeriod: 3,
      },
      
      // ACCESSORIES
      {
        name: 'Safety Reflective Vest',
        description: 'ANSI Class 2 reflective safety vest for high visibility.',
        sku: 'ACC-001',
        barcode: '1234567890138',
        category: 'accessories',
        subcategory: 'High-Visibility',
        costPrice: 15.00,
        sellingPrice: 29.99,
        discount: 0,
        taxRate: 8.5,
        stock: {
          quantity: 350,
          lowStockThreshold: 70,
          reservedQuantity: 25,
          availableQuantity: 325,
          reorderPoint: 80,
          maxStock: 400,
        },
        brand: 'VisVest',
        model: 'VV-SV-2024',
        size: ['S', 'M', 'L', 'XL', 'XXL'],
        color: ['Yellow', 'Orange', 'Lime Green'],
        material: 'Polyester Mesh with Reflective Tape',
        weight: 0.2,
        safetyFeatures: ['High Visibility', 'Reflective Strips', 'Breathable'],
        safetyStandards: ['ANSI/ISEA 107 Class 2'],
        images: [
          { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', alt: 'Safety Vest', isPrimary: true },
        ],
        vendor: {
          name: 'VisVest Manufacturing',
          contact: '+1-555-0116',
          email: 'info@visvest.com',
        },
        status: 'active',
        tags: ['safety vest', 'high visibility', 'reflective'],
        warrantyPeriod: 6,
      },
      {
        name: 'Safety Belt with Tool Pouch',
        description: 'Heavy-duty work belt with multiple tool pouches and D-rings.',
        sku: 'ACC-002',
        barcode: '1234567890139',
        category: 'accessories',
        subcategory: 'Tool Belt',
        costPrice: 25.00,
        sellingPrice: 49.99,
        discount: 10,
        taxRate: 8.5,
        stock: {
          quantity: 180,
          lowStockThreshold: 35,
          reservedQuantity: 12,
          availableQuantity: 168,
          reorderPoint: 40,
          maxStock: 220,
        },
        brand: 'ToolPro',
        model: 'TP-BT-2024',
        size: ['S', 'M', 'L', 'XL'],
        color: ['Black', 'Brown'],
        material: 'Nylon with Leather Accents',
        weight: 0.6,
        images: [
          { url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400', alt: 'Tool Belt', isPrimary: true },
        ],
        vendor: {
          name: 'ToolPro Accessories',
          contact: '+1-555-0117',
          email: 'sales@toolpro.com',
        },
        status: 'active',
        tags: ['tool belt', 'work belt', 'accessories'],
        warrantyPeriod: 12,
      },
    ];

    console.log(`📦 Seeding ${products.length} products...\n`);

    // Insert products
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      try {
        await Product.create(product);
        console.log(`✅ [${i + 1}/${products.length}] Created: ${product.name} (${product.sku})`);
      } catch (error: any) {
        console.error(`❌ [${i + 1}/${products.length}] Failed to create ${product.name}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully seeded ${products.length} products!`);
    console.log('\n📊 Summary:');
    const categoryCounts: Record<string, number> = {};
    products.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} products`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error seeding products:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedData();
