import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Shelter from '@/models/Shelter';

// POST - Seed sample shelters (for testing)
// This endpoint can be called without authentication for seeding purposes
export async function POST(request: NextRequest) {
  try {
    console.log('Starting shelter seed...');
    await connectDB();
    console.log('Database connected');

    const sampleShelters = [
      {
        name: 'Government School Relief Camp',
        address: '123 Main Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        capacity: 500,
        currentOccupancy: 320,
        contactPerson: 'Rajesh Kumar',
        contactPhone: '+91 98765 43210',
        facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets'],
        status: 'active',
        type: 'relief_camp',
        coordinates: {
          lat: 19.0760,
          lng: 72.8777,
        },
      },
      {
        name: 'Community Hall Shelter',
        address: '45 Park Street',
        city: 'Delhi',
        state: 'Delhi',
        capacity: 200,
        currentOccupancy: 198,
        contactPerson: 'Amit Singh',
        contactPhone: '+91 87654 32109',
        facilities: ['Food', 'Water', 'Toilets'],
        status: 'full',
        type: 'temporary',
        coordinates: {
          lat: 28.6139,
          lng: 77.2090,
        },
      },
      {
        name: 'Stadium Emergency Shelter',
        address: '789 Sports Complex',
        city: 'Chennai',
        state: 'Tamil Nadu',
        capacity: 1000,
        currentOccupancy: 450,
        contactPerson: 'Priya Devi',
        contactPhone: '+91 76543 21098',
        facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'Charging Points'],
        status: 'active',
        type: 'emergency',
        coordinates: {
          lat: 13.0827,
          lng: 80.2707,
        },
      },
      {
        name: 'Dharamshala Permanent Shelter',
        address: '321 Temple Road',
        city: 'Kolkata',
        state: 'West Bengal',
        capacity: 150,
        currentOccupancy: 0,
        contactPerson: 'Biswas Roy',
        contactPhone: '+91 65432 10987',
        facilities: ['Food', 'Water', 'Toilets', 'Sleeping Area'],
        status: 'closed',
        type: 'permanent',
        coordinates: {
          lat: 22.5726,
          lng: 88.3639,
        },
      },
      {
        name: 'City Convention Center',
        address: '567 Downtown Avenue',
        city: 'Bangalore',
        state: 'Karnataka',
        capacity: 800,
        currentOccupancy: 520,
        contactPerson: 'Suresh Reddy',
        contactPhone: '+91 91234 56789',
        facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'WiFi', 'Charging Points'],
        status: 'active',
        type: 'temporary',
        coordinates: {
          lat: 12.9716,
          lng: 77.5946,
        },
      },
    ];

    // Check if shelters already exist
    const existingCount = await Shelter.countDocuments();
    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Shelters already exist in database (${existingCount} shelters). Use DELETE to clear first.`,
        count: existingCount,
      });
    }

    // Insert sample shelters using insertMany with raw data (bypasses validation issues)
    console.log('Inserting shelters...');
    const inserted = await Shelter.insertMany(sampleShelters, { 
      ordered: false, // Continue even if one fails
      rawResult: false 
    });
    console.log(`Successfully inserted ${inserted.length} shelters`);

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${inserted.length} shelters`,
      data: inserted.map(shelter => ({
        id: shelter._id.toString(),
        name: shelter.name,
        city: shelter.city,
        state: shelter.state,
        capacity: shelter.capacity,
        currentOccupancy: shelter.currentOccupancy,
        status: shelter.status,
      })),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Seed shelters error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        errorName: error.name
      },
      { status: 500 }
    );
  }
}

// DELETE - Clear all shelters (for testing)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const result = await Shelter.deleteMany({});
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} shelters`,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('Clear shelters error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
