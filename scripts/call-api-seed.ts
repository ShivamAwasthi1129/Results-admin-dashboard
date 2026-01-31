/**
 * Call API seed endpoint to properly seed with adjuster sync
 * Run: npx tsx scripts/call-api-seed.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN || '';

async function callAPISeed() {
  console.log('🌐 Calling API seed endpoint...');
  console.log(`   URL: ${API_URL}/api/damage-reports/seed\n`);

  if (!ADMIN_TOKEN) {
    console.log('⚠️  No TEST_ADMIN_TOKEN in env, will try without auth (may fail)\n');
  }

  try {
    // Delete first
    console.log('🗑️  Clearing existing reports...');
    const deleteRes = await fetch(`${API_URL}/api/damage-reports/seed`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
      },
    });

    if (deleteRes.ok) {
      const data = await deleteRes.json();
      console.log(`✅ Cleared: ${data.data?.deletedCount || 0} reports\n`);
    } else {
      console.log(`⚠️  Delete response: ${deleteRes.status} ${deleteRes.statusText}\n`);
    }

    // Seed
    console.log('📝 Seeding new reports...');
    const seedRes = await fetch(`${API_URL}/api/damage-reports/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
      },
    });

    if (seedRes.ok) {
      const data = await seedRes.json();
      console.log(`✅ Seeded: ${data.data?.damageReportsCount || 0} reports`);
      if (data.data?.reports) {
        data.data.reports.forEach((r: any) => {
          const flags = [];
          if (r.hasAdjuster) flags.push('ADJ');
          if (r.vendorCount > 0) flags.push(`${r.vendorCount}V`);
          console.log(`   - ${r.reportNumber}: ${r.customerName} [${flags.join(', ') || 'NEW'}]`);
        });
      }
      console.log('\n✅ API seed completed successfully!');
    } else {
      const error = await seedRes.text();
      console.error(`❌ Seed failed: ${seedRes.status} ${seedRes.statusText}`);
      console.error(`   Response: ${error}`);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Error calling API:', error.message);
    process.exit(1);
  }
}

callAPISeed();
