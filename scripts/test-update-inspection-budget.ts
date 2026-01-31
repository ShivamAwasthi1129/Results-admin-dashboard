/**
 * Test updating existing report's inspection budget
 * Simulates UI flow: load report, add budget item, save
 * 
 * Run: npx tsx scripts/test-update-inspection-budget.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || '';

async function testUpdate() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  const DamageReportModule = require(resolve(process.cwd(), 'src/models/DamageReport'));
  const DamageReport = DamageReportModule.default || DamageReportModule;

  try {
    // 1. Find first report
    const report = await DamageReport.findOne({}).lean();
    if (!report) {
      console.log('⚠️  No reports in DB. Run: npx tsx scripts/clear-and-reseed-damage-reports.ts');
      process.exit(0);
    }

    const id = (report as any)._id.toString();
    console.log(`📄 Using report: ${(report as any).reportNumber} (${id})`);

    const step4Before = (report as any).workflowSteps?.find((s: any) => s.stepNumber === 4);
    const budgetBefore = step4Before?.stepData?.inspectionBudget || [];
    console.log(`   Step 4 budget before: ${budgetBefore.length} items`);
    if (budgetBefore.length > 0) {
      budgetBefore.forEach((b: any) => console.log(`     - ${b.taskName}: $${b.amount}`));
    }
    console.log('');

    // 2. Simulate UI update: add a new budget item
    console.log('🔧 Simulating UI update: adding new budget item "Plumbing: $2000"');
    
    const doc = await DamageReport.findById(id);
    if (!doc) {
      console.error('❌ Document not found');
      process.exit(1);
    }

    const steps = [...(doc.workflowSteps || [])];
    const step4Index = steps.findIndex((s: any) => s.stepNumber === 4);
    if (step4Index < 0) {
      console.error('❌ Step 4 not found');
      process.exit(1);
    }

    const currentBudget = (steps[step4Index] as any).stepData?.inspectionBudget || [];
    const updatedBudget = [
      ...currentBudget,
      { taskName: 'Plumbing Repair', amount: 2000 },
    ];

    (steps[step4Index] as any).stepData = {
      ...((steps[step4Index] as any).stepData || {}),
      inspectionBudget: updatedBudget,
    };
    doc.workflowSteps = steps as any;
    doc.markModified('workflowSteps');
    await doc.save();

    console.log('✅ Saved with new budget item\n');

    // 3. Reload and verify
    console.log('🔍 Reloading to verify persistence...');
    const reloaded = await DamageReport.findById(id).lean();
    const step4After = (reloaded as any)?.workflowSteps?.find((s: any) => s.stepNumber === 4);
    const budgetAfter = step4After?.stepData?.inspectionBudget || [];

    console.log(`   Step 4 budget after: ${budgetAfter.length} items`);
    if (budgetAfter.length > 0) {
      budgetAfter.forEach((b: any) => console.log(`     - ${b.taskName}: $${b.amount}`));
    }
    console.log('');

    // Assert
    const expectedCount = budgetBefore.length + 1;
    if (budgetAfter.length !== expectedCount) {
      console.error(`❌ FAIL: Expected ${expectedCount} items, got ${budgetAfter.length}`);
      process.exit(1);
    }

    const hasPlumbing = budgetAfter.some((b: any) => b.taskName === 'Plumbing Repair' && b.amount === 2000);
    if (!hasPlumbing) {
      console.error('❌ FAIL: New budget item "Plumbing Repair" not found');
      process.exit(1);
    }

    console.log('✅ PASS: Budget updated correctly and persisted!');
    console.log(`   - Old items preserved: ${budgetBefore.length}`);
    console.log(`   - New item added: 1`);
    console.log(`   - Total: ${budgetAfter.length}`);

  } catch (error: any) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

testUpdate();
