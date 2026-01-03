import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StockEntry, { IStockEntryDocument, IBatch } from '@/models/StockEntry';
import mongoose from 'mongoose';
import { verifyAuth } from '@/lib/auth';

// POST - Seed sample stock data
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get the collection directly to drop old indexes
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    const collection = mongoose.connection.db.collection('stock_entries');
    
    // Try to drop old indexes that might cause conflicts
    try {
      const indexes = await collection.indexes();
      for (const index of indexes) {
        // Drop any index that contains itemId or locationId (old schema)
        if (index.name && (index.name.includes('itemId') || index.name.includes('locationId'))) {
          try {
            await collection.dropIndex(index.name);
            console.log(`Dropped old index: ${index.name}`);
          } catch (idxError: any) {
            // Index might not exist, continue
            console.log(`Could not drop index ${index.name}:`, idxError.message);
          }
        }
      }
    } catch (error: any) {
      console.log('Error checking/dropping indexes:', error.message);
    }

    // Clear all existing data from the collection
    const deleteResult = await StockEntry.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing stock entries`);

    // Drop the entire collection to remove all old indexes
    try {
      await collection.drop();
      console.log('Dropped stock_entries collection to remove old indexes');
    } catch (error: any) {
      // Collection might not exist, which is fine
      if (error.codeName !== 'NamespaceNotFound') {
        console.log('Note: Could not drop collection (will recreate indexes):', error.message);
      }
    }

    // Generate comprehensive sample data
    const sampleData = [
      {
        item: {
          name: 'Portable Water Filtration Kit',
          category: 'Water & Sanitation',
          sku: 'WASH-FIL-001',
          description: 'Family-sized gravity filter, 20L capacity',
        },
        location: {
          warehouseId: 'WH-NORTH-01',
          name: 'Northern Relief Hub',
          address: '42 Logistics Park, Sector 18, Gurugram, HR',
          coordinates: {
            latitude: 28.4595,
            longitude: 77.0266,
          },
          manager: {
            name: 'Sarah Chen',
            contact: '+91-9998887776',
            email: 's.chen@relief.org',
          },
        },
        inventory: {
          currentQuantity: 450,
          unit: 'Units',
          threshold: 100,
          reservedQuantity: 50,
          availableQuantity: 400,
        },
        status: 'In-Stock',
        batches: [
          {
            batchNumber: 'B-2025-X',
            quantity: 450,
            expiryDate: new Date('2028-12-31'),
            receivedDate: new Date('2025-10-15'),
            condition: 'New',
          },
        ],
        actions: [
          {
            type: 'Restock',
            triggeredBy: 'System (Threshold Breach)',
            timestamp: new Date('2026-01-02T10:00:00Z'),
            status: 'Pending',
          },
        ],
        auditLog: [
          {
            userId: user.userId,
            change: 'Dispatched 50 units to Flood Zone A',
            timestamp: new Date('2026-01-02T16:00:00Z'),
          },
        ],
        tags: ['Urgent', 'Flood-Response', 'WASH'],
        lastUpdated: new Date('2026-01-02T17:30:00Z'),
      },
      {
        item: {
          name: 'Emergency Food Rations',
          category: 'Food & Nutrition',
          sku: 'FOOD-RAT-002',
          description: 'Ready-to-eat meals, 2000 calories per pack',
        },
        location: {
          warehouseId: 'WH-SOUTH-01',
          name: 'Southern Distribution Center',
          address: '15 Industrial Estate, Phase 2, Chennai, TN',
          coordinates: {
            latitude: 13.0827,
            longitude: 80.2707,
          },
          manager: {
            name: 'Rajesh Kumar',
            contact: '+91-9876543210',
            email: 'r.kumar@relief.org',
          },
        },
        inventory: {
          currentQuantity: 1200,
          unit: 'Packs',
          threshold: 300,
          reservedQuantity: 200,
          availableQuantity: 1000,
        },
        status: 'In-Stock',
        batches: [
          {
            batchNumber: 'B-2025-Y',
            quantity: 1200,
            expiryDate: new Date('2027-06-30'),
            receivedDate: new Date('2025-11-20'),
            condition: 'New',
          },
        ],
        actions: [],
        auditLog: [
          {
            userId: user.userId,
            change: 'Initial stock entry created',
            timestamp: new Date(),
          },
        ],
        tags: ['Emergency', 'Food-Security'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Medical First Aid Kit',
          category: 'Medical Supplies',
          sku: 'MED-FAK-003',
          description: 'Comprehensive first aid kit with bandages, antiseptics, and basic medications',
        },
        location: {
          warehouseId: 'WH-NORTH-01',
          name: 'Northern Relief Hub',
          address: '42 Logistics Park, Sector 18, Gurugram, HR',
          coordinates: {
            latitude: 28.4595,
            longitude: 77.0266,
          },
          manager: {
            name: 'Sarah Chen',
            contact: '+91-9998887776',
            email: 's.chen@relief.org',
          },
        },
        inventory: {
          currentQuantity: 85,
          unit: 'Kits',
          threshold: 100,
          reservedQuantity: 10,
          availableQuantity: 75,
        },
        status: 'Low Stock',
        batches: [
          {
            batchNumber: 'B-2025-Z',
            quantity: 85,
            expiryDate: new Date('2026-12-31'),
            receivedDate: new Date('2025-09-10'),
            condition: 'Good',
          },
        ],
        actions: [
          {
            type: 'Restock',
            triggeredBy: 'System (Threshold Breach)',
            timestamp: new Date(),
            status: 'Pending',
          },
        ],
        auditLog: [
          {
            userId: user.userId,
            change: 'Stock level below threshold',
            timestamp: new Date(),
          },
        ],
        tags: ['Medical', 'Critical', 'Restock-Required'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Emergency Shelter Tents',
          category: 'Shelter & Housing',
          sku: 'SHEL-TEN-004',
          description: 'Weather-resistant family tents, 4-person capacity',
        },
        location: {
          warehouseId: 'WH-EAST-01',
          name: 'Eastern Logistics Hub',
          address: '88 Warehouse Complex, Salt Lake, Kolkata, WB',
          coordinates: {
            latitude: 22.5726,
            longitude: 88.3639,
          },
          manager: {
            name: 'Priya Sharma',
            contact: '+91-9123456789',
            email: 'p.sharma@relief.org',
          },
        },
        inventory: {
          currentQuantity: 250,
          unit: 'Tents',
          threshold: 50,
          reservedQuantity: 0,
          availableQuantity: 250,
        },
        status: 'In-Stock',
        batches: [
          {
            batchNumber: 'B-2025-A',
            quantity: 250,
            expiryDate: new Date('2030-01-01'),
            receivedDate: new Date('2025-12-01'),
            condition: 'New',
          },
        ],
        actions: [],
        auditLog: [
          {
            userId: user.userId,
            change: 'Initial stock entry created',
            timestamp: new Date(),
          },
        ],
        tags: ['Shelter', 'Disaster-Response'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Portable Water Filtration Kit',
          category: 'Water & Sanitation',
          sku: 'WASH-FIL-001',
          description: 'Family-sized gravity filter, 20L capacity',
        },
        location: {
          warehouseId: 'WH-SOUTH-01',
          name: 'Southern Distribution Center',
          address: '15 Industrial Estate, Phase 2, Chennai, TN',
          coordinates: {
            latitude: 13.0827,
            longitude: 80.2707,
          },
          manager: {
            name: 'Rajesh Kumar',
            contact: '+91-9876543210',
            email: 'r.kumar@relief.org',
          },
        },
        inventory: {
          currentQuantity: 320,
          unit: 'Units',
          threshold: 100,
          reservedQuantity: 30,
          availableQuantity: 290,
        },
        status: 'In-Stock',
        batches: [
          {
            batchNumber: 'B-2025-B',
            quantity: 320,
            expiryDate: new Date('2028-12-31'),
            receivedDate: new Date('2025-11-15'),
            condition: 'New',
          },
        ],
        actions: [],
        auditLog: [
          {
            userId: user.userId,
            change: 'Initial stock entry created',
            timestamp: new Date(),
          },
        ],
        tags: ['WASH', 'Water-Safety'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Blankets & Warm Clothing',
          category: 'Clothing & Bedding',
          sku: 'CLOTH-BLK-005',
          description: 'Heavy-duty blankets and winter clothing sets',
        },
        location: {
          warehouseId: 'WH-NORTH-01',
          name: 'Northern Relief Hub',
          address: '42 Logistics Park, Sector 18, Gurugram, HR',
          coordinates: {
            latitude: 28.4595,
            longitude: 77.0266,
          },
          manager: {
            name: 'Sarah Chen',
            contact: '+91-9998887776',
            email: 's.chen@relief.org',
          },
        },
        inventory: {
          currentQuantity: 45,
          unit: 'Sets',
          threshold: 100,
          reservedQuantity: 5,
          availableQuantity: 40,
        },
        status: 'Critical',
        batches: [
          {
            batchNumber: 'B-2025-C',
            quantity: 45,
            expiryDate: new Date('2027-01-01'),
            receivedDate: new Date('2025-10-01'),
            condition: 'Good',
          },
        ],
        actions: [
          {
            type: 'Restock',
            triggeredBy: 'System (Critical Stock)',
            timestamp: new Date(),
            status: 'Pending',
          },
        ],
        auditLog: [
          {
            userId: user.userId,
            change: 'Stock level critical - urgent restock required',
            timestamp: new Date(),
          },
        ],
        tags: ['Urgent', 'Winter-Supplies', 'Critical'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Emergency Communication Devices',
          category: 'Communication Equipment',
          sku: 'COMM-RAD-006',
          description: 'Satellite phones and two-way radios for emergency communication',
        },
        location: {
          warehouseId: 'WH-WEST-01',
          name: 'Western Operations Center',
          address: '25 Tech Park, Andheri East, Mumbai, MH',
          coordinates: {
            latitude: 19.0760,
            longitude: 72.8777,
          },
          manager: {
            name: 'Amit Patel',
            contact: '+91-9988776655',
            email: 'a.patel@relief.org',
          },
        },
        inventory: {
          currentQuantity: 0,
          unit: 'Devices',
          threshold: 20,
          reservedQuantity: 0,
          availableQuantity: 0,
        },
        status: 'Depleted',
        batches: [],
        actions: [
          {
            type: 'Restock',
            triggeredBy: 'System (Depleted Stock)',
            timestamp: new Date(),
            status: 'Pending',
          },
        ],
        auditLog: [
          {
            userId: user.userId,
            change: 'All stock depleted - urgent restock required',
            timestamp: new Date(),
          },
        ],
        tags: ['Communication', 'Depleted', 'Urgent-Restock'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Hygiene Kits',
          category: 'Water & Sanitation',
          sku: 'WASH-HYG-007',
          description: 'Personal hygiene kits with soap, shampoo, toothbrush, and sanitary items',
        },
        location: {
          warehouseId: 'WH-EAST-01',
          name: 'Eastern Logistics Hub',
          address: '88 Warehouse Complex, Salt Lake, Kolkata, WB',
          coordinates: {
            latitude: 22.5726,
            longitude: 88.3639,
          },
          manager: {
            name: 'Priya Sharma',
            contact: '+91-9123456789',
            email: 'p.sharma@relief.org',
          },
        },
        inventory: {
          currentQuantity: 800,
          unit: 'Kits',
          threshold: 200,
          reservedQuantity: 100,
          availableQuantity: 700,
        },
        status: 'In-Stock',
        batches: [
          {
            batchNumber: 'B-2025-D',
            quantity: 800,
            expiryDate: new Date('2027-12-31'),
            receivedDate: new Date('2025-11-01'),
            condition: 'New',
          },
        ],
        actions: [],
        auditLog: [
          {
            userId: user.userId,
            change: 'Initial stock entry created',
            timestamp: new Date(),
          },
        ],
        tags: ['WASH', 'Hygiene'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Portable Generators',
          category: 'Power & Energy',
          sku: 'PWR-GEN-008',
          description: '5kW portable diesel generators for emergency power supply',
        },
        location: {
          warehouseId: 'WH-WEST-01',
          name: 'Western Operations Center',
          address: '25 Tech Park, Andheri East, Mumbai, MH',
          coordinates: {
            latitude: 19.0760,
            longitude: 72.8777,
          },
          manager: {
            name: 'Amit Patel',
            contact: '+91-9988776655',
            email: 'a.patel@relief.org',
          },
        },
        inventory: {
          currentQuantity: 35,
          unit: 'Units',
          threshold: 15,
          reservedQuantity: 5,
          availableQuantity: 30,
        },
        status: 'In-Stock',
        batches: [
          {
            batchNumber: 'B-2025-E',
            quantity: 35,
            expiryDate: new Date('2030-01-01'),
            receivedDate: new Date('2025-10-20'),
            condition: 'New',
          },
        ],
        actions: [],
        auditLog: [
          {
            userId: user.userId,
            change: 'Initial stock entry created',
            timestamp: new Date(),
          },
        ],
        tags: ['Power', 'Emergency', 'Critical-Infrastructure'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Medical Oxygen Cylinders',
          category: 'Medical Supplies',
          sku: 'MED-OXY-009',
          description: 'Portable medical oxygen cylinders, 10L capacity',
        },
        location: {
          warehouseId: 'WH-NORTH-01',
          name: 'Northern Relief Hub',
          address: '42 Logistics Park, Sector 18, Gurugram, HR',
          coordinates: {
            latitude: 28.4595,
            longitude: 77.0266,
          },
          manager: {
            name: 'Sarah Chen',
            contact: '+91-9998887776',
            email: 's.chen@relief.org',
          },
        },
        inventory: {
          currentQuantity: 120,
          unit: 'Cylinders',
          threshold: 50,
          reservedQuantity: 20,
          availableQuantity: 100,
        },
        status: 'In-Stock',
        batches: [
          {
            batchNumber: 'B-2025-F',
            quantity: 120,
            expiryDate: new Date('2026-06-30'),
            receivedDate: new Date('2025-12-10'),
            condition: 'New',
          },
        ],
        actions: [],
        auditLog: [
          {
            userId: user.userId,
            change: 'Initial stock entry created',
            timestamp: new Date(),
          },
        ],
        tags: ['Medical', 'Critical', 'Life-Support'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Emergency Food Rations',
          category: 'Food & Nutrition',
          sku: 'FOOD-RAT-002',
          description: 'Ready-to-eat meals, 2000 calories per pack',
        },
        location: {
          warehouseId: 'WH-EAST-01',
          name: 'Eastern Logistics Hub',
          address: '88 Warehouse Complex, Salt Lake, Kolkata, WB',
          coordinates: {
            latitude: 22.5726,
            longitude: 88.3639,
          },
          manager: {
            name: 'Priya Sharma',
            contact: '+91-9123456789',
            email: 'p.sharma@relief.org',
          },
        },
        inventory: {
          currentQuantity: 950,
          unit: 'Packs',
          threshold: 300,
          reservedQuantity: 150,
          availableQuantity: 800,
        },
        status: 'In-Stock',
        batches: [
          {
            batchNumber: 'B-2025-G',
            quantity: 950,
            expiryDate: new Date('2027-08-31'),
            receivedDate: new Date('2025-11-25'),
            condition: 'New',
          },
        ],
        actions: [],
        auditLog: [
          {
            userId: user.userId,
            change: 'Initial stock entry created',
            timestamp: new Date(),
          },
        ],
        tags: ['Emergency', 'Food-Security'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Rescue Boats',
          category: 'Rescue Equipment',
          sku: 'RESC-BOT-010',
          description: 'Inflatable rescue boats, 8-person capacity',
        },
        location: {
          warehouseId: 'WH-SOUTH-01',
          name: 'Southern Distribution Center',
          address: '15 Industrial Estate, Phase 2, Chennai, TN',
          coordinates: {
            latitude: 13.0827,
            longitude: 80.2707,
          },
          manager: {
            name: 'Rajesh Kumar',
            contact: '+91-9876543210',
            email: 'r.kumar@relief.org',
          },
        },
        inventory: {
          currentQuantity: 18,
          unit: 'Boats',
          threshold: 10,
          reservedQuantity: 3,
          availableQuantity: 15,
        },
        status: 'In-Stock',
        batches: [
          {
            batchNumber: 'B-2025-H',
            quantity: 18,
            expiryDate: new Date('2028-01-01'),
            receivedDate: new Date('2025-09-15'),
            condition: 'Good',
          },
        ],
        actions: [],
        auditLog: [
          {
            userId: user.userId,
            change: 'Initial stock entry created',
            timestamp: new Date(),
          },
        ],
        tags: ['Rescue', 'Flood-Response', 'Water-Rescue'],
        lastUpdated: new Date(),
      },
      {
        item: {
          name: 'Portable Water Filtration Kit',
          category: 'Water & Sanitation',
          sku: 'WASH-FIL-001',
          description: 'Family-sized gravity filter, 20L capacity',
        },
        location: {
          warehouseId: 'WH-WEST-01',
          name: 'Western Operations Center',
          address: '25 Tech Park, Andheri East, Mumbai, MH',
          coordinates: {
            latitude: 19.0760,
            longitude: 72.8777,
          },
          manager: {
            name: 'Amit Patel',
            contact: '+91-9988776655',
            email: 'a.patel@relief.org',
          },
        },
        inventory: {
          currentQuantity: 280,
          unit: 'Units',
          threshold: 100,
          reservedQuantity: 25,
          availableQuantity: 255,
        },
        status: 'In-Stock',
        batches: [
          {
            batchNumber: 'B-2025-I',
            quantity: 280,
            expiryDate: new Date('2028-12-31'),
            receivedDate: new Date('2025-12-05'),
            condition: 'New',
          },
        ],
        actions: [],
        auditLog: [
          {
            userId: user.userId,
            change: 'Initial stock entry created',
            timestamp: new Date(),
          },
        ],
        tags: ['WASH', 'Water-Safety'],
        lastUpdated: new Date(),
      },
    ];

    // Insert data one by one to handle any errors gracefully
    const createdEntries: any[] = [];
    for (const entry of sampleData) {
      try {
        const created = await StockEntry.create(entry as any);
        createdEntries.push(created);
      } catch (error: any) {
        console.error(`Error creating entry for SKU ${entry.item.sku}:`, error.message);
        // Continue with other entries even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${createdEntries.length} stock entries`,
      data: createdEntries,
      totalAttempted: sampleData.length,
    });
  } catch (error: any) {
    console.error('Error seeding stock data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to seed stock data' },
      { status: 500 }
    );
  }
}
