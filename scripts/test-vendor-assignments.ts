/**
 * Test vendor assignments in damage reports
 * Verifies vendors module displays assigned reports correctly
 * 
 * Run: npx tsx scripts/test-vendor-assignments.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || '';

async function testVendorAssignments() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  const DamageReportModule = require(resolve(process.cwd(), 'src/models/DamageReport'));
  const ServiceProviderModule = require(resolve(process.cwd(), 'src/models/ServiceProvider'));
  
  const DamageReport = DamageReportModule.default || DamageReportModule;
  const ServiceProvider = ServiceProviderModule.default || ServiceProviderModule;

  try {
    // Get all damage reports
    console.log('📄 Fetching damage reports...');
    const reports = await DamageReport.find({}).lean();
    console.log(`   Found ${reports.length} damage reports\n`);

    // Get all vendors
    console.log('🏢 Fetching vendors...');
    const vendors = await ServiceProvider.find({}).lean();
    console.log(`   Found ${vendors.length} vendors\n`);

    // Analyze vendor assignments
    console.log('🔍 Analyzing vendor assignments...');
    const vendorAssignments: Record<string, any[]> = {};
    let totalAssignments = 0;

    vendors.forEach((vendor: any) => {
      const assigned = reports.filter((report: any) =>
        report.assignedVendors?.some((v: any) => v.vendorId === vendor._id.toString())
      );
      vendorAssignments[vendor._id.toString()] = assigned;
      if (assigned.length > 0) {
        totalAssignments += assigned.length;
        console.log(`   ✅ ${vendor.businessName}: ${assigned.length} report(s) assigned`);
        assigned.forEach((r: any) => {
          const vendorEntry = r.assignedVendors.find((v: any) => v.vendorId === vendor._id.toString());
          console.log(`      - ${r.reportNumber}: task="${vendorEntry.taskName}", status="${vendorEntry.status}"`);
        });
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total vendors: ${vendors.length}`);
    console.log(`   Vendors with assignments: ${Object.values(vendorAssignments).filter(a => a.length > 0).length}`);
    console.log(`   Total assignments: ${totalAssignments}`);

    if (totalAssignments === 0) {
      console.log('\n⚠️  No vendor assignments found. This is OK if reports are new.');
      console.log('   To create assignments, assign vendors to reports from the damage reports UI.');
    } else {
      console.log('\n✅ Vendor assignments found and working correctly!');
    }

  } catch (error: any) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

testVendorAssignments();
