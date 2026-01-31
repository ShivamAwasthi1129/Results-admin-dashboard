/**
 * E2E test: Inspection budget (Step 4) persistence in damage reports
 *
 * Run: npx tsx scripts/test-inspection-budget-persistence.ts
 *
 * 1. Finds or uses first damage report
 * 2. Updates step 4 stepData.inspectionBudget
 * 3. Saves via Mongoose
 * 4. Fetches again and asserts budget is stored
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || '';

const TEST_BUDGET = [
  { taskName: 'floor cleaning', amount: 100 },
  { taskName: 'roof cleaning', amount: 200 },
];

async function runTest() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  const DamageReportModule = require(resolve(process.cwd(), 'src/models/DamageReport'));
  const DamageReport = DamageReportModule.default || DamageReportModule;

  // 1) Get first damage report
  const report = await DamageReport.findOne({}).lean();
  if (!report) {
    console.log('⚠️  No damage report in DB. Run seed first (e.g. Seed Reports in UI or POST /api/damage-reports/seed).');
    await mongoose.disconnect();
    process.exit(0);
  }

  const id = (report as any)._id.toString();
  console.log(`📄 Using report: ${(report as any).reportNumber} (${id})\n`);

  // 2) Build workflowSteps with step 4 inspection budget
  const existingSteps = ((report as any).workflowSteps || []) as any[];
  const step4Index = existingSteps.findIndex((s: any) => s.stepNumber === 4);
  if (step4Index < 0) {
    console.error('❌ Report has no step 4 in workflowSteps');
    await mongoose.disconnect();
    process.exit(1);
  }

  const updatedSteps = existingSteps.map((step: any, idx: number) => {
    if (idx === step4Index) {
      return {
        ...step,
        stepData: {
          ...(step.stepData || {}),
          inspectionBudget: TEST_BUDGET,
        },
      };
    }
    return step;
  });

  // 3) Update document (same shape as API PUT)
  const updatePayload = {
    workflowSteps: updatedSteps,
    lastModifiedBy: 'test-script',
  };

  const updated = await DamageReport.findByIdAndUpdate(
    id,
    updatePayload,
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    console.error('❌ findByIdAndUpdate returned null');
    await mongoose.disconnect();
    process.exit(1);
  }

  const stepsAfter = (updated as any).workflowSteps || [];
  const step4After = stepsAfter.find((s: any) => s.stepNumber === 4);
  const budgetAfter = step4After?.stepData?.inspectionBudget;

  // 4) Assert
  if (!Array.isArray(budgetAfter) || budgetAfter.length !== TEST_BUDGET.length) {
    console.error('❌ FAIL: Step 4 inspectionBudget not persisted or wrong length.');
    console.error('   Expected:', TEST_BUDGET);
    console.error('   Got:', budgetAfter);
    await mongoose.disconnect();
    process.exit(1);
  }

  const match =
    budgetAfter[0].taskName === TEST_BUDGET[0].taskName &&
    budgetAfter[0].amount === TEST_BUDGET[0].amount &&
    budgetAfter[1].taskName === TEST_BUDGET[1].taskName &&
    budgetAfter[1].amount === TEST_BUDGET[1].amount;

  if (!match) {
    console.error('❌ FAIL: Step 4 inspectionBudget values do not match.');
    console.error('   Expected:', TEST_BUDGET);
    console.error('   Got:', budgetAfter);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('✅ PASS: Inspection budget (Step 4) is stored and read back correctly.');
  console.log('   Step 4 stepData.inspectionBudget:', JSON.stringify(budgetAfter, null, 2));
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected.');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
