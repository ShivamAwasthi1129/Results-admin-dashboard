/**
 * Script to add sample 3D model URLs and video URLs to existing products
 * 
 * Run with: tsx scripts/add-media-to-products.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import Product model
import Product from '../src/models/Product';

// Sample 3D model URLs (using publicly available GLB models)
const sample3DModels: Record<string, { url: string; format: 'glb' | 'gltf' }> = {
  shoes: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Shoe/glTF-Binary/Shoe.glb',
    format: 'glb',
  },
  boots: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Shoe/glTF-Binary/Shoe.glb',
    format: 'glb',
  },
  jackets: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
    format: 'glb',
  },
  watches: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
    format: 'glb',
  },
  shirts: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
    format: 'glb',
  },
  safety_suits: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
    format: 'glb',
  },
  safety_equipment: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
    format: 'glb',
  },
  accessories: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
    format: 'glb',
  },
  other: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
    format: 'glb',
  },
};

// Sample video URLs (using placeholder/demo videos)
const sampleVideos: Record<string, string> = {
  shoes: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Replace with actual product videos
  boots: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  jackets: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  watches: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  shirts: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  safety_suits: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  safety_equipment: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  accessories: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  other: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
};

// Sample key features based on category
const sampleKeyFeatures: Record<string, string[]> = {
  shoes: [
    'Durable construction',
    'Comfortable fit',
    'Safety certified',
    'Long-lasting quality',
  ],
  boots: [
    'Heavy-duty protection',
    'Weather resistant',
    'Comfortable all-day wear',
    'Industry standard approved',
  ],
  jackets: [
    'High visibility design',
    'Weather protection',
    'Comfortable fit',
    'Durable materials',
  ],
  watches: [
    'Precise timekeeping',
    'Durable construction',
    'Water resistant',
    'Long battery life',
  ],
  shirts: [
    'Comfortable fabric',
    'Professional appearance',
    'Easy care',
    'Durable construction',
  ],
  safety_suits: [
    'Full body protection',
    'Chemical resistant',
    'Comfortable fit',
    'Industry certified',
  ],
  safety_equipment: [
    'Protective design',
    'Comfortable to wear',
    'Durable materials',
    'Safety certified',
  ],
  accessories: [
    'High quality materials',
    'Practical design',
    'Durable construction',
    'Versatile use',
  ],
  other: [
    'Quality construction',
    'Reliable performance',
    'Durable materials',
    'Value for money',
  ],
};

async function addMediaToProducts() {
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
    console.log(`📦 Found ${products.length} products to update\n`);

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      const updates: any = {};
      let needsUpdate = false;

      // Add video URL if not present
      if (!product.videoUrl) {
        const videoUrl = sampleVideos[product.category] || sampleVideos.other;
        updates.videoUrl = videoUrl;
        needsUpdate = true;
      }

      // Add 3D model URL if not present
      if (!product.model3dUrl) {
        const modelData = sample3DModels[product.category] || sample3DModels.other;
        updates.model3dUrl = modelData.url;
        updates.model3dFormat = modelData.format;
        needsUpdate = true;
      }

      // Add key features if empty
      if (!product.keyFeatures || product.keyFeatures.length === 0) {
        const features = sampleKeyFeatures[product.category] || sampleKeyFeatures.other;
        updates.keyFeatures = features;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { $set: updates }
        );
        updated++;
        console.log(`✅ Updated: ${product.name} (${product.sku})`);
        if (updates.videoUrl) console.log(`   📹 Video: ${updates.videoUrl}`);
        if (updates.model3dUrl) console.log(`   🎨 3D Model: ${updates.model3dUrl}`);
        if (updates.keyFeatures) console.log(`   ✨ Key Features: ${updates.keyFeatures.length} added`);
      } else {
        skipped++;
        console.log(`⏭️  Skipped: ${product.name} (${product.sku}) - already has media`);
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`   Total products: ${products.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('\n✅ Media addition completed successfully!');
    console.log('\n💡 Note: Replace sample video URLs with actual product demonstration videos');
    console.log('💡 Note: Replace sample 3D model URLs with actual product 3D models');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run script
addMediaToProducts();
