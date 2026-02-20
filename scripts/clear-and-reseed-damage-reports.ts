/**
 * Clear and reseed damage reports
 * Run: npx tsx scripts/clear-and-reseed-damage-reports.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || '';
const EXTERNAL_CUSTOMERS_API_URL = 'https://r3sults-backend.vercel.app/api/admin/users';

async function clearAndReseed() {
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
    // Clear existing damage reports
    console.log('🗑️  Clearing existing damage reports...');
    await DamageReport.deleteMany({});
    console.log('✅ Cleared\n');

    // Fetch external customers
    console.log('🌐 Fetching customers from external API...');
    const externalRes = await fetch(EXTERNAL_CUSTOMERS_API_URL);
    if (!externalRes.ok) {
      console.error('❌ Failed to fetch customers');
      process.exit(1);
    }
    const externalData = await externalRes.json();
    const externalUsers = externalData?.data?.users ?? externalData?.users ?? [];
    if (externalUsers.length === 0) {
      console.error('❌ No customers from API');
      process.exit(1);
    }
    console.log(`✅ Fetched ${externalUsers.length} customers\n`);

    const mapCustomer = (u: any) => {
      const fullName = u.fullName || u.email || 'Unknown';
      const parts = String(fullName).trim().split(/\s+/);
      return {
        customerId: u.id,
        firstName: parts[0] || 'Unknown',
        lastName: parts.slice(1).join(' ') || '',
        email: u.email || undefined,
        phone: u.phoneNumber || undefined,
        address: {
          street: u.address || undefined,
          city: u.city || undefined,
          state: u.state || undefined,
          zipCode: u.pincode || undefined,
        },
      };
    };
    const customers = externalUsers.map(mapCustomer);

    // Fetch adjusters and vendors
    console.log('📋 Fetching adjusters and vendors from DB...');
    const [adjusters, vendors] = await Promise.all([
      Adjuster.find({}).limit(10).lean(),
      ServiceProvider.find({}).limit(10).lean(),
    ]);
    console.log(`✅ Found ${adjusters.length} adjusters, ${vendors.length} vendors\n`);

    const TEMPLATES = [
      { propertyAddress: { street: '123 Oak St', city: 'Houston', state: 'TX', zipCode: '77001', country: 'USA' }, damageType: 'hurricane', severity: 'severe', description: 'Severe hurricane damage to roof', affectedAreas: ['Roof', 'Second Floor', 'Exterior Walls'], estimatedCost: 45000, fundingSources: [{ source: 'insurance', amount: 30000, status: 'received' }, { source: 'fema', amount: 10000, status: 'pending' }] },
      { propertyAddress: { street: '456 Pine Ave', city: 'Miami', state: 'FL', zipCode: '33101', country: 'USA' }, damageType: 'flood', severity: 'moderate', description: 'Flood damage to ground floor', affectedAreas: ['Ground Floor', 'Basement', 'HVAC'], estimatedCost: 28000, fundingSources: [{ source: 'flood_insurance', amount: 20000, status: 'received' }, { source: 'self_pay', amount: 5000, status: 'received' }] },
      { propertyAddress: { street: '789 Maple Dr', city: 'New Orleans', state: 'LA', zipCode: '70112', country: 'USA' }, damageType: 'wind', severity: 'minor', description: 'Wind damage to fence and garage', affectedAreas: ['Fence', 'Garage', 'Porch'], estimatedCost: 8500, fundingSources: [{ source: 'insurance', amount: 6000, status: 'received' }] },
      { propertyAddress: { street: '321 Cedar Ln', city: 'Austin', state: 'TX', zipCode: '78701', country: 'USA' }, damageType: 'fire', severity: 'catastrophic', description: 'Kitchen fire spread to living area', affectedAreas: ['Kitchen', 'Living Room', 'Master Bedroom', 'Electrical'], estimatedCost: 125000, fundingSources: [{ source: 'insurance', amount: 80000, status: 'received' }, { source: 'non_profit', amount: 25000, status: 'pledged' }] },
      { propertyAddress: { street: '555 Birch Rd', city: 'Dallas', state: 'TX', zipCode: '75201', country: 'USA' }, damageType: 'hail', severity: 'moderate', description: 'Hail damage to roof and vehicles', affectedAreas: ['Roof', 'Skylights', 'Gutters'], estimatedCost: 18000, fundingSources: [{ source: 'insurance', amount: 15000, status: 'pending' }] },
      { propertyAddress: { street: '100 Elm St', city: 'Houston', state: 'TX', zipCode: '77002', country: 'USA' }, damageType: 'storm', severity: 'moderate', description: 'Storm damage to windows', affectedAreas: ['Windows', 'Siding', 'Landscaping'], estimatedCost: 15000, fundingSources: [{ source: 'insurance', amount: 12000, status: 'pending' }] },
      { propertyAddress: { street: '200 Willow Way', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India' }, damageType: 'flood', severity: 'severe', description: 'Flood damage to ground floor', affectedAreas: ['Ground Floor', 'Basement', 'HVAC'], estimatedCost: 32000, fundingSources: [{ source: 'insurance', amount: 25000, status: 'received' }] },
      { propertyAddress: { street: '300 Sector 5', city: 'Delhi', state: 'Delhi', zipCode: '110001', country: 'India' }, damageType: 'other', severity: 'moderate', description: 'Structural damage', affectedAreas: ['Foundation', 'Walls'], estimatedCost: 22000, fundingSources: [{ source: 'self_pay', amount: 10000, status: 'received' }, { source: 'insurance', amount: 12000, status: 'pending' }] },
    ];

    const year = new Date().getFullYear();
    const reportsToCreate: any[] = [];
    const adminId = 'test-admin-seed';
    const adminName = 'Seed Admin';
    const adminEmail = 'admin@test.com';

    for (let i = 0; i < 8; i++) {
      const customer = customers[i % customers.length];
      const template = TEMPLATES[i];
      const reportNumber = `DR-${year}-${String(i + 1).padStart(3, '0')}`;

      // Build inspection budget from affected areas
      const inspectionBudget = template.affectedAreas.map(area => ({
        taskName: `${area} Repair`,
        amount: Math.round((template.estimatedCost / template.affectedAreas.length) * (0.8 + Math.random() * 0.4)),
      }));

      const steps: any[] = [
        { stepNumber: 1, name: 'Report Created', status: 'completed', completedAt: new Date(), completedBy: adminId },
        { stepNumber: 2, name: 'Under Review', status: 'pending' },
        { stepNumber: 3, name: 'Assign Adjuster', status: 'pending' },
        { stepNumber: 4, name: 'Adjuster Inspection & Approval', status: 'pending', stepData: { inspectionBudget } },
        { stepNumber: 5, name: 'Assign Vendors', status: 'pending' },
        { stepNumber: 6, name: 'Vendor Work', status: 'pending' },
        { stepNumber: 7, name: 'Completed', status: 'pending' },
      ];

      let currentStep = 1;
      let status = 'report_created';
      let assignedAdjuster: any = undefined;
      let assignedVendors: any[] = [];

      // Some reports get adjuster
      if (i >= 2 && i <= 5 && adjusters.length > 0) {
        const adj = adjusters[i % adjusters.length] as any;
        assignedAdjuster = {
          adjusterId: adj.adjusterId || adj._id.toString(),
          adjusterDbId: adj._id.toString(),
          fullName: adj.fullName || `${adj.firstName} ${adj.lastName}`,
          email: adj.email,
          phone: adj.phone,
          companyName: adj.companyName,
          assignedDate: new Date(),
          assignedBy: adminId,
          approvalStatus: i === 3 ? 'approved' : 'pending',
        };
        currentStep = 4;
        status = 'adjuster_assigned';
        steps[2].status = 'completed';
        steps[2].completedAt = new Date();
        steps[3].status = 'in_progress';
      }

      // Some reports get vendors
      if (i >= 3 && vendors.length > 0) {
        const v1 = vendors[i % vendors.length] as any;
        assignedVendors.push({
          vendorId: v1._id.toString(),
          providerId: v1.providerId,
          businessName: v1.businessName || 'Vendor',
          taskName: inspectionBudget[0]?.taskName || 'General Repair',
          category: v1.category,
          assignedDate: new Date(),
          assignedBy: adminId,
          estimatedCost: inspectionBudget[0]?.amount || 5000,
          status: i >= 6 ? 'completed' : 'in_progress',
        });
        if (i === 4 && vendors.length > 1 && inspectionBudget.length > 1) {
          const v2 = vendors[(i + 1) % vendors.length] as any;
          assignedVendors.push({
            vendorId: v2._id.toString(),
            providerId: v2.providerId,
            businessName: v2.businessName || 'Vendor 2',
            taskName: inspectionBudget[1]?.taskName || 'Secondary Repair',
            category: v2.category,
            assignedDate: new Date(),
            assignedBy: adminId,
            estimatedCost: inspectionBudget[1]?.amount || 3000,
            status: 'in_progress',
          });
        }
        currentStep = 6;
        status = 'work_in_progress';
        steps[4].status = 'completed';
        steps[5].status = 'in_progress';
      }

      reportsToCreate.push({
        customer,
        reportNumber,
        reportDate: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        reportedBy: { userId: adminId, name: adminName, email: adminEmail },
        ...template,
        status,
        workflowSteps: steps,
        currentStep,
        assignedAdjuster,
        assignedVendors,
        images: [],
        tags: [],
        priority: ['low', 'medium', 'high', 'urgent'][i % 4],
        createdBy: adminId,
        lastModifiedBy: adminId,
      });
    }

    console.log('📝 Creating damage reports...');
    const inserted = await DamageReport.insertMany(reportsToCreate);
    console.log(`✅ Created ${inserted.length} damage reports\n`);

    // Verify step 4 budget for all reports
    console.log('🔍 Verifying step 4 inspection budget...');
    let budgetCount = 0;
    for (const r of inserted) {
      const step4 = (r as any).workflowSteps?.find((s: any) => s.stepNumber === 4);
      if (step4?.stepData?.inspectionBudget && Array.isArray(step4.stepData.inspectionBudget) && step4.stepData.inspectionBudget.length > 0) {
        budgetCount++;
      }
    }
    console.log(`✅ ${budgetCount}/${inserted.length} reports have step 4 inspection budget\n`);

    // Display summary
    console.log('📊 Summary:');
    console.log(`   Total Reports: ${inserted.length}`);
    console.log(`   With Adjusters: ${inserted.filter((r: any) => r.assignedAdjuster).length}`);
    console.log(`   With Vendors: ${inserted.filter((r: any) => r.assignedVendors?.length > 0).length}`);
    console.log(`   With Step 4 Budget: ${budgetCount}`);
    console.log('\n✅ Seeding completed successfully!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

clearAndReseed();
