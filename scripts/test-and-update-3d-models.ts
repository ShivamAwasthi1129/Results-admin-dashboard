import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import Product model after env is loaded
const Product = require('../src/models/Product').default;

// Test if a URL is accessible and returns valid content
async function testModelUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    if (!response.ok) {
      console.log(`❌ URL failed: ${url} - Status: ${response.status}`);
      return false;
    }
    
    const contentType = response.headers.get('content-type') || '';
    const isBinary = contentType.includes('application/octet-stream') || 
                     contentType.includes('model/gltf-binary') ||
                     url.endsWith('.glb');
    
    if (isBinary || response.status === 200) {
      console.log(`✅ URL works: ${url}`);
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.log(`❌ URL error: ${url} - ${error.message}`);
    return false;
  }
}

// Working 3D model URLs from glTF-Sample-Assets (actively maintained repository)
const working3DModels: Record<string, { url: string; format: 'glb' | 'gltf' }> = {
  shoes: {
    // MaterialsVariantsShoe from glTF-Sample-Assets
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb',
    format: 'glb',
  },
  boots: {
    // Using MaterialsVariantsShoe as boot placeholder
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb',
    format: 'glb',
  },
  jackets: {
    // Sponza model (large scene, but works) - or use a simpler model
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/EmissiveStrengthTest/glTF-Binary/EmissiveStrengthTest.glb',
    format: 'glb',
  },
  watches: {
    // Simple working model
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/EmissiveStrengthTest/glTF-Binary/EmissiveStrengthTest.glb',
    format: 'glb',
  },
  shirts: {
    // Simple working model
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/EmissiveStrengthTest/glTF-Binary/EmissiveStrengthTest.glb',
    format: 'glb',
  },
  safety_suits: {
    // Simple working model
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/EmissiveStrengthTest/glTF-Binary/EmissiveStrengthTest.glb',
    format: 'glb',
  },
  safety_equipment: {
    // Simple working model
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/EmissiveStrengthTest/glTF-Binary/EmissiveStrengthTest.glb',
    format: 'glb',
  },
  accessories: {
    // Simple working model
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/EmissiveStrengthTest/glTF-Binary/EmissiveStrengthTest.glb',
    format: 'glb',
  },
  other: {
    // Simple working model
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/EmissiveStrengthTest/glTF-Binary/EmissiveStrengthTest.glb',
    format: 'glb',
  },
};

async function testAndUpdate3DModels() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Test all URLs first
    console.log('🧪 Testing 3D model URLs...\n');
    const testedModels: Record<string, { url: string; format: 'glb' | 'gltf' }> = {};
    
    for (const [category, model] of Object.entries(working3DModels)) {
      const isValid = await testModelUrl(model.url);
      if (isValid) {
        testedModels[category] = model;
        console.log(`✅ ${category}: ${model.url}\n`);
      } else {
        // Use a fallback URL that we know works
        const fallbackUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/EmissiveStrengthTest/glTF-Binary/EmissiveStrengthTest.glb';
        const fallbackValid = await testModelUrl(fallbackUrl);
        if (fallbackValid) {
          testedModels[category] = { url: fallbackUrl, format: 'glb' };
          console.log(`⚠️  ${category}: Using fallback URL\n`);
        } else {
          console.log(`❌ ${category}: No working URL found, skipping\n`);
        }
      }
    }

    console.log('\n📦 Fetching products from database...\n');
    const products = await Product.find({});
    console.log(`Found ${products.length} products to update\n`);

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      const category = product.category || 'other';
      const modelData = testedModels[category] || testedModels.other;

      if (!modelData) {
        console.log(`⏭️  Skipped: ${product.name} (${product.sku}) - No working model URL available`);
        skipped++;
        continue;
      }

      // Check if update is needed
      if (product.model3dUrl === modelData.url && product.model3dFormat === modelData.format) {
        console.log(`⏭️  Skipped: ${product.name} (${product.sku}) - Already has correct URL`);
        skipped++;
        continue;
      }

      // Update product
      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            model3dUrl: modelData.url,
            model3dFormat: modelData.format,
          },
        }
      );

      updated++;
      console.log(`✅ Updated: ${product.name} (${product.sku})`);
      console.log(`   🎨 3D Model: ${modelData.url}\n`);
    }

    console.log('\n📊 Update Summary:');
    console.log(`   Total products: ${products.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('\n✅ 3D model update completed successfully!');
    console.log('💡 All URLs have been tested and verified to work');

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
testAndUpdate3DModels();
