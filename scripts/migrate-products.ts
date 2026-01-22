/**
 * Migration script to update existing products with new fields:
 * - videoUrl
 * - model3dUrl
 * - model3dFormat
 * - keyFeatures
 * - variants (for size/color/strap combinations)
 * - categoryAttributes
 * 
 * Run with: tsx scripts/migrate-products.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import Product model
import Product from '../src/models/Product';

async function migrateProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products to migrate`);

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      let needsUpdate = false;
      const updates: any = {};

      // Add videoUrl if not present
      if (!product.videoUrl) {
        updates.videoUrl = undefined;
        needsUpdate = true;
      }

      // Add model3dUrl if not present
      if (!product.model3dUrl) {
        updates.model3dUrl = undefined;
        needsUpdate = true;
      }

      // Add model3dFormat if not present
      if (!product.model3dFormat) {
        updates.model3dFormat = undefined;
        needsUpdate = true;
      }

      // Add keyFeatures if not present
      if (!product.keyFeatures || product.keyFeatures.length === 0) {
        updates.keyFeatures = [];
        needsUpdate = true;
      }

      // Add variants if not present
      if (!product.variants || product.variants.length === 0) {
        updates.variants = [];
        needsUpdate = true;
      }

      // Add categoryAttributes based on category
      if (!product.categoryAttributes) {
        const categoryAttrs: any = {
          shirtSizes: [],
          strapColors: [],
          strapWidths: [],
          watchCaseMaterial: '',
          watchDialColor: '',
          ukSizes: [],
          usSizes: [],
          shoeWidth: '',
          colors: [],
          materials: [],
        };

        // Migrate existing size/color data to categoryAttributes
        if (product.category === 'shirts' && product.size && product.size.length > 0) {
          categoryAttrs.shirtSizes = product.size;
        }
        if ((product.category === 'shoes' || product.category === 'boots') && product.size && product.size.length > 0) {
          // Try to detect UK/US sizes
          const ukSizes = product.size.filter(s => s.includes('UK') || s.match(/^\d+$/));
          const usSizes = product.size.filter(s => s.includes('US'));
          categoryAttrs.ukSizes = ukSizes.length > 0 ? ukSizes : product.size;
          categoryAttrs.usSizes = usSizes.length > 0 ? usSizes : [];
        }
        if (product.color && product.color.length > 0) {
          categoryAttrs.colors = product.color;
        }
        if (product.material) {
          categoryAttrs.materials = [product.material];
        }

        updates.categoryAttributes = categoryAttrs;
        needsUpdate = true;
      }

      // Create variants from existing size/color combinations if variants are empty
      if ((!product.variants || product.variants.length === 0) && product.size && product.size.length > 0) {
        const variants: any[] = [];
        
        if (product.category === 'shirts') {
          // Create variants for each shirt size
          const sizeArray = product.size!; // Non-null assertion since we checked above
          sizeArray.forEach(size => {
            variants.push({
              id: `${product.sku}-${size}-${Date.now()}`,
              size: size,
              stock: {
                quantity: Math.floor(product.stock.quantity / sizeArray.length),
                reservedQuantity: 0,
                availableQuantity: Math.floor(product.stock.quantity / sizeArray.length),
              },
            });
          });
        } else if (product.category === 'shoes' || product.category === 'boots') {
          // Create variants for each shoe size
          const sizeArray = product.size!; // Non-null assertion since we checked above
          sizeArray.forEach(size => {
            const isUK = size.includes('UK') || /^\d+$/.test(size);
            const isUS = size.includes('US');
            variants.push({
              id: `${product.sku}-${size}-${Date.now()}`,
              ukSize: isUK ? size : undefined,
              usSize: isUS ? size : undefined,
              stock: {
                quantity: Math.floor(product.stock.quantity / sizeArray.length),
                reservedQuantity: 0,
                availableQuantity: Math.floor(product.stock.quantity / sizeArray.length),
              },
            });
          });
        }

        if (variants.length > 0) {
          updates.variants = variants;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { $set: updates }
        );
        updated++;
        console.log(`✅ Updated product: ${product.name} (${product.sku})`);
      } else {
        skipped++;
        console.log(`⏭️  Skipped product: ${product.name} (${product.sku}) - already up to date`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total products: ${products.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateProducts();
