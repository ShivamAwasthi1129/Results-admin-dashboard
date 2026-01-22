/**
 * Seed Damage Reports Script
 * 
 * Run this script from the terminal:
 * npm run seed:damage-reports
 * 
 * Or directly:
 * npx tsx scripts/seed-damage-reports.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || '';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set!');
  console.error('   Please set MONGODB_URI in your .env.local or .env file');
  process.exit(1);
}

async function seedData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const uriDisplay = MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`   URI: ${uriDisplay}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Dynamically import DamageReport model
    const modelsPath = resolve(process.cwd(), 'src/models');
    const DamageReportModule = require(`${modelsPath}/DamageReport`);
    const DamageReport = DamageReportModule.default || DamageReportModule;

    // Clear existing damage reports
    console.log('🗑️  Clearing existing damage reports...');
    await DamageReport.deleteMany({});
    console.log('✅ Cleared existing damage reports\n');

    // Sample damage reports data
    const damageReports = [
      {
        reportNumber: 'DR-2024-001',
        reportDate: new Date('2024-08-15'),
        reportedBy: {
          name: 'John Smith',
          email: 'john.smith@example.com',
          phone: '(555) 123-4567',
        },
        propertyOwner: {
          name: 'John Smith',
          phone: '(555) 123-4567',
          email: 'john.smith@example.com',
        },
        propertyAddress: {
          street: '123 Main St',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
          country: 'USA',
        },
        damageType: 'hurricane',
        severity: 'severe',
        status: 'in_progress',
        description: 'Significant roof damage, water intrusion to second floor, broken windows, garage door destroyed',
        affectedAreas: ['Roof', 'Second Floor', 'Garage'],
        estimatedCost: 85000,
        actualCost: 78500,
        fundingSources: [
          { source: 'insurance', amount: 45000, status: 'received' },
          { source: 'fema', amount: 15000, status: 'received' },
          { source: 'non_profit', amount: 10000, status: 'received' },
          { source: 'other', amount: 5000, status: 'received' },
          { source: 'self_pay', amount: 3500, status: 'received' },
          { source: 'consolidated_non_profit', amount: 15000, status: 'received' },
        ],
        milestones: [
          { name: 'Initial Assessment', status: 'completed', completionDate: new Date('2024-08-16'), order: 1 },
          { name: 'Insurance Approval', status: 'completed', completionDate: new Date('2024-08-20'), order: 2 },
          { name: 'Contractor Assignment', status: 'completed', completionDate: new Date('2024-08-22'), order: 3 },
          { name: 'Repair Work Started', status: 'completed', completionDate: new Date('2024-08-25'), order: 4 },
          { name: 'Final Inspection', status: 'pending', order: 5 },
          { name: 'Completion & Closeout', status: 'pending', order: 6 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800', alt: 'Damage photo 1', isPrimary: true },
          { url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800', alt: 'Damage photo 2' },
          { url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800', alt: 'Damage photo 3' },
        ],
        contractor: {
          name: 'BuildRight Construction',
          contact: 'Mike Johnson',
          email: 'mike@buildright.com',
          phone: '(555) 234-5678',
          estimatedTimeline: '6-8 weeks',
          assignedDate: new Date('2024-08-22'),
        },
        priority: 'high',
        tags: ['hurricane', 'roof-damage', 'water-damage'],
      },
      {
        reportNumber: 'DR-2024-002',
        reportDate: new Date('2024-08-18'),
        reportedBy: {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          phone: '(555) 234-5678',
        },
        propertyOwner: {
          name: 'Sarah Johnson',
          phone: '(555) 234-5678',
          email: 'sarah.johnson@example.com',
        },
        propertyAddress: {
          street: '456 Oak Avenue',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33602',
          country: 'USA',
        },
        damageType: 'flood',
        severity: 'catastrophic',
        status: 'assessed',
        description: 'Complete basement flooding, structural damage to foundation, electrical system compromised',
        affectedAreas: ['Basement', 'Foundation', 'Electrical System'],
        estimatedCost: 125000,
        fundingSources: [
          { source: 'insurance', amount: 60000, status: 'pledged' },
          { source: 'flood_insurance', amount: 40000, status: 'pledged' },
          { source: 'fema', amount: 20000, status: 'pending' },
        ],
        milestones: [
          { name: 'Initial Assessment', status: 'completed', completionDate: new Date('2024-08-19'), order: 1 },
          { name: 'Insurance Approval', status: 'in_progress', order: 2 },
          { name: 'Contractor Assignment', status: 'pending', order: 3 },
          { name: 'Repair Work Started', status: 'pending', order: 4 },
          { name: 'Final Inspection', status: 'pending', order: 5 },
          { name: 'Completion & Closeout', status: 'pending', order: 6 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800', alt: 'Flood damage 1', isPrimary: true },
          { url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800', alt: 'Flood damage 2' },
        ],
        priority: 'urgent',
        tags: ['flood', 'basement', 'foundation'],
      },
      {
        reportNumber: 'DR-2024-003',
        reportDate: new Date('2024-08-20'),
        reportedBy: {
          name: 'Michael Brown',
          email: 'michael.brown@example.com',
          phone: '(555) 345-6789',
        },
        propertyOwner: {
          name: 'Michael Brown',
          phone: '(555) 345-6789',
          email: 'michael.brown@example.com',
        },
        propertyAddress: {
          street: '789 Pine Street',
          city: 'Orlando',
          state: 'FL',
          zipCode: '32801',
          country: 'USA',
        },
        damageType: 'wind',
        severity: 'moderate',
        status: 'in_review',
        description: 'Tree fell on roof, damaged siding, broken fence panels',
        affectedAreas: ['Roof', 'Siding', 'Fence'],
        estimatedCost: 35000,
        fundingSources: [
          { source: 'insurance', amount: 25000, status: 'received' },
          { source: 'self_pay', amount: 10000, status: 'received' },
        ],
        milestones: [
          { name: 'Initial Assessment', status: 'completed', completionDate: new Date('2024-08-21'), order: 1 },
          { name: 'Insurance Approval', status: 'completed', completionDate: new Date('2024-08-23'), order: 2 },
          { name: 'Contractor Assignment', status: 'pending', order: 3 },
          { name: 'Repair Work Started', status: 'pending', order: 4 },
          { name: 'Final Inspection', status: 'pending', order: 5 },
          { name: 'Completion & Closeout', status: 'pending', order: 6 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800', alt: 'Wind damage 1', isPrimary: true },
        ],
        priority: 'medium',
        tags: ['wind', 'tree-damage'],
      },
      {
        reportNumber: 'DR-2024-004',
        reportDate: new Date('2024-08-22'),
        reportedBy: {
          name: 'Emily Davis',
          email: 'emily.davis@example.com',
          phone: '(555) 456-7890',
        },
        propertyOwner: {
          name: 'Emily Davis',
          phone: '(555) 456-7890',
          email: 'emily.davis@example.com',
        },
        propertyAddress: {
          street: '321 Elm Boulevard',
          city: 'Jacksonville',
          state: 'FL',
          zipCode: '32202',
          country: 'USA',
        },
        damageType: 'storm',
        severity: 'minor',
        status: 'reported',
        description: 'Minor water leaks, damaged gutters, missing shingles',
        affectedAreas: ['Gutters', 'Roof Shingles'],
        estimatedCost: 12000,
        fundingSources: [
          { source: 'insurance', amount: 8000, status: 'pending' },
          { source: 'self_pay', amount: 4000, status: 'pending' },
        ],
        milestones: [
          { name: 'Initial Assessment', status: 'pending', order: 1 },
          { name: 'Insurance Approval', status: 'pending', order: 2 },
          { name: 'Contractor Assignment', status: 'pending', order: 3 },
          { name: 'Repair Work Started', status: 'pending', order: 4 },
          { name: 'Final Inspection', status: 'pending', order: 5 },
          { name: 'Completion & Closeout', status: 'pending', order: 6 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800', alt: 'Storm damage 1', isPrimary: true },
        ],
        priority: 'low',
        tags: ['storm', 'minor-damage'],
      },
      {
        reportNumber: 'DR-2024-005',
        reportDate: new Date('2024-08-25'),
        reportedBy: {
          name: 'Robert Wilson',
          email: 'robert.wilson@example.com',
          phone: '(555) 567-8901',
        },
        propertyOwner: {
          name: 'Robert Wilson',
          phone: '(555) 567-8901',
          email: 'robert.wilson@example.com',
        },
        propertyAddress: {
          street: '654 Maple Drive',
          city: 'Fort Lauderdale',
          state: 'FL',
          zipCode: '33301',
          country: 'USA',
        },
        damageType: 'hurricane',
        severity: 'severe',
        status: 'completed',
        description: 'Extensive roof damage, broken windows throughout, damaged garage door, fence destroyed',
        affectedAreas: ['Roof', 'Windows', 'Garage Door', 'Fence'],
        estimatedCost: 95000,
        actualCost: 92000,
        fundingSources: [
          { source: 'insurance', amount: 50000, status: 'received' },
          { source: 'fema', amount: 25000, status: 'received' },
          { source: 'non_profit', amount: 15000, status: 'received' },
          { source: 'self_pay', amount: 2000, status: 'received' },
        ],
        milestones: [
          { name: 'Initial Assessment', status: 'completed', completionDate: new Date('2024-08-26'), order: 1 },
          { name: 'Insurance Approval', status: 'completed', completionDate: new Date('2024-08-30'), order: 2 },
          { name: 'Contractor Assignment', status: 'completed', completionDate: new Date('2024-09-02'), order: 3 },
          { name: 'Repair Work Started', status: 'completed', completionDate: new Date('2024-09-05'), order: 4 },
          { name: 'Final Inspection', status: 'completed', completionDate: new Date('2024-10-15'), order: 5 },
          { name: 'Completion & Closeout', status: 'completed', completionDate: new Date('2024-10-20'), order: 6 },
        ],
        images: [
          { url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800', alt: 'Hurricane damage 1', isPrimary: true },
          { url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800', alt: 'Hurricane damage 2' },
          { url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800', alt: 'Hurricane damage 3' },
        ],
        contractor: {
          name: 'Premier Restoration Services',
          contact: 'David Martinez',
          email: 'david@premierrestoration.com',
          phone: '(555) 678-9012',
          estimatedTimeline: '8-10 weeks',
          assignedDate: new Date('2024-09-02'),
        },
        priority: 'high',
        tags: ['hurricane', 'completed'],
      },
    ];

    console.log('📝 Creating damage reports...');
    const createdReports = await DamageReport.insertMany(damageReports);
    console.log(`✅ Created ${createdReports.length} damage reports\n`);

    // Display summary
    console.log('📊 Summary:');
    console.log(`   Total Reports: ${createdReports.length}`);
    console.log(`   Status Breakdown:`);
    const statusCounts: Record<string, number> = {};
    damageReports.forEach(report => {
      statusCounts[report.status] = (statusCounts[report.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });

    console.log('\n✅ Seeding completed successfully!');
  } catch (error: any) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function
seedData()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
