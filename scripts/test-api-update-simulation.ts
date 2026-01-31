/**
 * Simulate API PUT update for inspection budget
 * This mimics exactly what the UI sends when updating budget items
 * 
 * Run: npx tsx scripts/test-api-update-simulation.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || '';

async function simulateAPIUpdate() {
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
    // Get first report
    const report = await DamageReport.findOne({}).lean();
    if (!report) {
      console.log('⚠️  No reports. Run seed first.');
      process.exit(0);
    }

    const id = (report as any)._id.toString();
    console.log(`📄 Using report: ${(report as any).reportNumber} (${id})`);

    const step4Before = (report as any).workflowSteps?.find((s: any) => s.stepNumber === 4);
    const budgetBefore = step4Before?.stepData?.inspectionBudget || [];
    console.log(`   Step 4 budget before: ${budgetBefore.length} items`);
    budgetBefore.forEach((b: any) => console.log(`     - ${b.taskName}: $${b.amount}`));
    console.log('');

    // Simulate UI sending payload (full formData with updated step 4 budget)
    console.log('🔧 Simulating API PUT request from UI...');
    const payload: any = JSON.parse(JSON.stringify(report)); // Deep copy
    delete payload._id;
    delete payload.__v;
    delete payload.id;

    // Add a new budget item to step 4
    const workflowSteps = payload.workflowSteps || [];
    const step4Index = workflowSteps.findIndex((s: any) => s.stepNumber === 4);
    if (step4Index < 0) {
      console.error('❌ Step 4 not found');
      process.exit(1);
    }

    const currentBudget = workflowSteps[step4Index].stepData?.inspectionBudget || [];
    workflowSteps[step4Index].stepData = {
      ...(workflowSteps[step4Index].stepData || {}),
      inspectionBudget: [
        ...currentBudget,
        { taskName: 'Electrical System', amount: 4500 },
      ],
    };
    payload.workflowSteps = workflowSteps;

    console.log('   Added new item: "Electrical System: $4500"');
    console.log('   Payload step 4 budget:', payload.workflowSteps[step4Index].stepData.inspectionBudget.length, 'items\n');

    // Apply normalization (same as API PUT handler)
    console.log('🔄 Applying API normalization...');
    if (payload.workflowSteps && Array.isArray(payload.workflowSteps)) {
      payload.workflowSteps = payload.workflowSteps.map((step: any) => {
        const normalized: any = { ...step };
        
        if (step.stepData && typeof step.stepData === 'object') {
          const { vendorAssignments: _v, ...stepDataRest } = step.stepData;
          normalized.stepData = { ...stepDataRest };
        } else if (step.stepNumber === 4 || step.stepNumber === 3) {
          normalized.stepData = {};
        }

        if (step.stepNumber === 4) {
          normalized.stepData = normalized.stepData || {};
          const budget = Array.isArray(step.stepData?.inspectionBudget) ? step.stepData.inspectionBudget : [];
          normalized.stepData.inspectionBudget = budget.map((item: any) => ({
            taskName: String(item.taskName ?? '').trim(),
            amount: Number(item.amount) || 0,
          }));
        }

        return normalized;
      });
    }

    console.log('   Normalized step 4 budget:', payload.workflowSteps[step4Index].stepData.inspectionBudget.length, 'items\n');

    // Save (same as API PUT handler)
    console.log('💾 Saving to database...');
    const doc = await DamageReport.findById(id);
    if (!doc) {
      console.error('❌ Document not found');
      process.exit(1);
    }

    Object.keys(payload).forEach((key) => {
      if (key === 'workflowSteps') {
        doc.workflowSteps = payload.workflowSteps;
        doc.markModified('workflowSteps');
      } else if (key === 'reportDate' && payload.reportDate) {
        doc.reportDate = new Date(payload.reportDate);
      } else if (Object.prototype.hasOwnProperty.call(payload, key)) {
        (doc as any).set(key, payload[key]);
      }
    });

    await doc.save({ validateBeforeSave: true });
    console.log('✅ Saved\n');

    // Verify
    console.log('🔍 Verifying...');
    const afterSave = await DamageReport.findById(id).lean();
    const step4After = (afterSave as any)?.workflowSteps?.find((s: any) => s.stepNumber === 4);
    const budgetAfter = step4After?.stepData?.inspectionBudget || [];

    console.log(`   Step 4 budget after: ${budgetAfter.length} items`);
    budgetAfter.forEach((b: any) => console.log(`     - ${b.taskName}: $${b.amount}`));
    console.log('');

    const expectedCount = budgetBefore.length + 1;
    if (budgetAfter.length !== expectedCount) {
      console.error(`❌ FAIL: Expected ${expectedCount} items, got ${budgetAfter.length}`);
      process.exit(1);
    }

    const hasElectrical = budgetAfter.some((b: any) => b.taskName === 'Electrical System' && b.amount === 4500);
    if (!hasElectrical) {
      console.error('❌ FAIL: New budget item not found');
      process.exit(1);
    }

    console.log('✅ PASS: Inspection budget update via API simulation successful!');
    console.log(`   Old items preserved: ${budgetBefore.length}`);
    console.log(`   New item added: 1`);
    console.log(`   Total: ${budgetAfter.length}`);

  } catch (error: any) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

simulateAPIUpdate();
