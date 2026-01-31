/**
 * Comprehensive E2E test for Damage Reports CRUD operations
 * Tests: Create, Read, Update (especially inspection budget), Delete
 * 
 * Run: npx tsx scripts/test-damage-reports-crud.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || '';

async function runTests() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  const DamageReportModule = require(resolve(process.cwd(), 'src/models/DamageReport'));
  const DamageReport = DamageReportModule.default || DamageReportModule;

  let testReportId: string | null = null;

  try {
    // TEST 1: CREATE with step 4 inspection budget
    console.log('📝 TEST 1: Create damage report with inspection budget');
    const newReport = await DamageReport.create({
      reportNumber: `DR-TEST-${Date.now()}`,
      reportDate: new Date(),
      customer: {
        customerId: 'test-customer-001',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      },
      reportedBy: { userId: 'test-admin', name: 'Test Admin', email: 'admin@test.com' },
      propertyAddress: { street: '123 Test St', city: 'TestCity', state: 'TX', zipCode: '12345' },
      damageType: 'flood',
      severity: 'moderate',
      status: 'report_created',
      description: 'Test damage report',
      affectedAreas: ['Living Room', 'Kitchen'],
      estimatedCost: 15000,
      fundingSources: [{ source: 'insurance', amount: 10000, status: 'pending' }],
      workflowSteps: [
        { stepNumber: 1, name: 'Report Created', status: 'completed', completedAt: new Date() },
        { stepNumber: 2, name: 'Under Review', status: 'pending' },
        { stepNumber: 3, name: 'Assign Adjuster', status: 'pending' },
        {
          stepNumber: 4,
          name: 'Adjuster Inspection & Approval',
          status: 'pending',
          stepData: {
            inspectionBudget: [
              { taskName: 'Living Room Repair', amount: 5000 },
              { taskName: 'Kitchen Repair', amount: 7000 },
            ],
          },
        },
        { stepNumber: 5, name: 'Assign Vendors', status: 'pending' },
        { stepNumber: 6, name: 'Vendor Work', status: 'pending' },
        { stepNumber: 7, name: 'Completed', status: 'pending' },
      ],
      currentStep: 1,
      assignedVendors: [],
      images: [],
      tags: [],
      priority: 'medium',
      createdBy: 'test-admin',
      lastModifiedBy: 'test-admin',
    });

    testReportId = newReport._id.toString();
    console.log(`✅ Created report: ${newReport.reportNumber} (${testReportId})`);

    // Verify step 4 has budget
    const step4 = newReport.workflowSteps?.find((s: any) => s.stepNumber === 4);
    if (!step4?.stepData?.inspectionBudget || step4.stepData.inspectionBudget.length !== 2) {
      console.error('❌ FAIL: Step 4 inspection budget not created correctly');
      console.error('   Expected 2 items, got:', step4?.stepData?.inspectionBudget);
      process.exit(1);
    }
    console.log('✅ Step 4 inspection budget created: 2 items\n');

    // TEST 2: READ and verify
    console.log('📖 TEST 2: Read damage report and verify step 4 budget');
    const fetched = await DamageReport.findById(testReportId).lean();
    const fetchedStep4 = (fetched as any)?.workflowSteps?.find((s: any) => s.stepNumber === 4);
    if (!fetchedStep4?.stepData?.inspectionBudget || fetchedStep4.stepData.inspectionBudget.length !== 2) {
      console.error('❌ FAIL: Step 4 budget not readable from DB');
      process.exit(1);
    }
    console.log('✅ Read successful, step 4 has 2 budget items\n');

    // TEST 3: UPDATE - Add a 3rd budget item (simulates user adding more items)
    console.log('🔧 TEST 3: Update - Add a 3rd inspection budget item');
    const doc = await DamageReport.findById(testReportId);
    if (!doc) {
      console.error('❌ Document not found for update');
      process.exit(1);
    }

    const steps = [...(doc.workflowSteps || [])];
    const step4Index = steps.findIndex((s: any) => s.stepNumber === 4);
    if (step4Index < 0) {
      console.error('❌ Step 4 not found in workflowSteps');
      process.exit(1);
    }

    const currentBudget = (steps[step4Index] as any).stepData?.inspectionBudget || [];
    const updatedBudget = [
      ...currentBudget,
      { taskName: 'Basement Repair', amount: 3000 },
    ];

    (steps[step4Index] as any).stepData = {
      ...((steps[step4Index] as any).stepData || {}),
      inspectionBudget: updatedBudget,
    };
    doc.workflowSteps = steps as any;
    doc.markModified('workflowSteps');
    await doc.save();

    console.log('✅ Updated report with 3rd budget item\n');

    // TEST 4: Verify update persisted
    console.log('🔍 TEST 4: Verify 3rd budget item was saved');
    const afterUpdate = await DamageReport.findById(testReportId).lean();
    const afterStep4 = (afterUpdate as any)?.workflowSteps?.find((s: any) => s.stepNumber === 4);
    const budgetAfter = afterStep4?.stepData?.inspectionBudget;

    if (!budgetAfter || budgetAfter.length !== 3) {
      console.error('❌ FAIL: Budget not updated correctly. Expected 3 items, got:', budgetAfter?.length);
      console.error('   Budget:', budgetAfter);
      process.exit(1);
    }

    const hasBasementRepair = budgetAfter.some((b: any) => b.taskName === 'Basement Repair' && b.amount === 3000);
    if (!hasBasementRepair) {
      console.error('❌ FAIL: 3rd budget item not found in DB');
      console.error('   Budget:', budgetAfter);
      process.exit(1);
    }

    console.log('✅ All 3 budget items persisted correctly');
    console.log('   Budget items:', budgetAfter.map((b: any) => `${b.taskName}: $${b.amount}`).join(', '));
    console.log('');

    // TEST 5: UPDATE other fields - verify budget is NOT lost
    console.log('🔧 TEST 5: Update other fields (description) - budget should remain');
    const doc2 = await DamageReport.findById(testReportId);
    if (!doc2) {
      console.error('❌ Document not found');
      process.exit(1);
    }
    doc2.description = 'Updated description for testing';
    doc2.estimatedCost = 16000;
    await doc2.save();

    const afterUpdate2 = await DamageReport.findById(testReportId).lean();
    const step4After2 = (afterUpdate2 as any)?.workflowSteps?.find((s: any) => s.stepNumber === 4);
    const budgetAfter2 = step4After2?.stepData?.inspectionBudget;

    if (!budgetAfter2 || budgetAfter2.length !== 3) {
      console.error('❌ FAIL: Budget lost after updating other fields');
      console.error('   Expected 3 items, got:', budgetAfter2?.length);
      process.exit(1);
    }
    console.log('✅ Budget preserved after updating other fields\n');

    // TEST 6: DELETE
    console.log('🗑️  TEST 6: Delete test report');
    await DamageReport.findByIdAndDelete(testReportId);
    const deleted = await DamageReport.findById(testReportId);
    if (deleted) {
      console.error('❌ FAIL: Report not deleted');
      process.exit(1);
    }
    console.log('✅ Report deleted successfully\n');

    console.log('🎉 ALL TESTS PASSED!');
    console.log('   ✅ Create with inspection budget');
    console.log('   ✅ Read inspection budget');
    console.log('   ✅ Update - add more budget items');
    console.log('   ✅ Update other fields - budget preserved');
    console.log('   ✅ Delete');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

runTests();
