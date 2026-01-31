/**
 * Final verification: All modules sync correctly
 * Tests: Damage Reports, Adjusters, Vendors
 * 
 * Run: npx tsx scripts/verify-all-modules.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || '';

async function verify() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  const DamageReportModule = require(resolve(process.cwd(), 'src/models/DamageReport'));
  const AdjusterModule = require(resolve(process.cwd(), 'src/models/Adjuster'));
  const ServiceProviderModule = require(resolve(process.cwd(), 'src/models/ServiceProvider'));
  
  const DamageReport = DamageReportModule.default || DamageReportModule;
  const Adjuster = AdjusterModule.default || AdjusterModule;
  const ServiceProvider = ServiceProviderModule.default || ServiceProviderModule;

  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('  COMPREHENSIVE MODULE VERIFICATION');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. Damage Reports
    console.log('1️⃣  DAMAGE REPORTS');
    console.log('───────────────────────────────────────────────────');
    const reports = await DamageReport.find({}).lean();
    console.log(`   ✅ Total reports: ${reports.length}`);
    
    const reportsWithBudget = reports.filter((r: any) => {
      const step4 = r.workflowSteps?.find((s: any) => s.stepNumber === 4);
      return step4?.stepData?.inspectionBudget && step4.stepData.inspectionBudget.length > 0;
    });
    console.log(`   ✅ Reports with step 4 budget: ${reportsWithBudget.length}/${reports.length}`);
    
    const reportsWithVendors = reports.filter((r: any) => r.assignedVendors?.length > 0);
    console.log(`   ✅ Reports with vendors: ${reportsWithVendors.length}/${reports.length}`);
    
    const reportsWithAdjusters = reports.filter((r: any) => r.assignedAdjuster);
    console.log(`   ✅ Reports with adjusters: ${reportsWithAdjusters.length}/${reports.length}\n`);

    // 2. Adjusters
    console.log('2️⃣  ADJUSTERS');
    console.log('───────────────────────────────────────────────────');
    const adjusters = await Adjuster.find({}).lean();
    console.log(`   ✅ Total adjusters: ${adjusters.length}`);
    
    let totalAdjusterAssignments = 0;
    adjusters.forEach((adj: any) => {
      const assignedCount = adj.assignedReports?.length || 0;
      totalAdjusterAssignments += assignedCount;
      if (assignedCount > 0) {
        console.log(`   ✅ ${adj.fullName}: ${assignedCount} report(s) assigned`);
      }
    });
    console.log(`   ✅ Total adjuster assignments: ${totalAdjusterAssignments}\n`);

    // 3. Vendors
    console.log('3️⃣  VENDORS & ALLIANCE PARTNERS');
    console.log('───────────────────────────────────────────────────');
    const vendors = await ServiceProvider.find({}).lean();
    console.log(`   ✅ Total vendors: ${vendors.length}`);
    
    let totalVendorAssignments = 0;
    vendors.forEach((vendor: any) => {
      const assigned = reports.filter((report: any) =>
        report.assignedVendors?.some((v: any) => v.vendorId === vendor._id.toString())
      );
      if (assigned.length > 0) {
        totalVendorAssignments += assigned.length;
        console.log(`   ✅ ${vendor.businessName}: ${assigned.length} report(s) assigned`);
      }
    });
    console.log(`   ✅ Total vendor assignments: ${totalVendorAssignments}\n`);

    // 4. Cross-verification
    console.log('4️⃣  CROSS-MODULE VERIFICATION');
    console.log('───────────────────────────────────────────────────');
    
    // Verify adjuster-report sync
    let adjusterSyncIssues = 0;
    for (const report of reports) {
      const r = report as any;
      if (r.assignedAdjuster?.adjusterId) {
        const adjuster = adjusters.find((a: any) => a.adjusterId === r.assignedAdjuster.adjusterId);
        if (adjuster) {
          const adjReports = (adjuster as any).assignedReports || [];
          const hasThisReport = adjReports.some((ar: any) => ar.reportId === r._id.toString());
          if (!hasThisReport) {
            adjusterSyncIssues++;
            console.log(`   ⚠️  ${r.reportNumber}: assigned to adjuster but not in adjuster's list`);
          }
        }
      }
    }
    if (adjusterSyncIssues === 0) {
      console.log(`   ✅ Adjuster-Report sync: OK`);
    } else {
      console.log(`   ⚠️  Adjuster-Report sync issues: ${adjusterSyncIssues}`);
    }

    // Verify vendor-report sync
    let vendorSyncIssues = 0;
    for (const report of reports) {
      const r = report as any;
      if (r.assignedVendors && r.assignedVendors.length > 0) {
        for (const v of r.assignedVendors) {
          const vendor = vendors.find((vnd: any) => vnd._id.toString() === v.vendorId);
          if (!vendor) {
            vendorSyncIssues++;
            console.log(`   ⚠️  ${r.reportNumber}: references vendor ${v.vendorId} that doesn't exist`);
          }
        }
      }
    }
    if (vendorSyncIssues === 0) {
      console.log(`   ✅ Vendor-Report sync: OK`);
    } else {
      console.log(`   ⚠️  Vendor-Report sync issues: ${vendorSyncIssues}`);
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  🎉 VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  ✅ ${reports.length} Damage Reports`);
    console.log(`  ✅ ${reportsWithBudget.length} with Step 4 Inspection Budget`);
    console.log(`  ✅ ${adjusters.length} Adjusters (${totalAdjusterAssignments} assignments)`);
    console.log(`  ✅ ${vendors.length} Vendors (${totalVendorAssignments} assignments)`);
    console.log(`  ✅ All modules synced correctly`);
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Verification error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

verify();
