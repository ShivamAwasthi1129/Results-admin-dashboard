import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Shelter from '@/models/Shelter';

// GET - Initialize and seed shelters (runs automatically on first access)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const existingCount = await Shelter.countDocuments();
    
    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Database already initialized with ${existingCount} shelters`,
        count: existingCount,
      });
    }

    const sampleShelters = [
      {
        name: 'Government School Relief Camp',
        addressLine1: '123 Main Road',
        addressLine2: 'Near City Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India',
        capacity: 500,
        currentOccupancy: 320,
        contactPerson: 'Rajesh Kumar',
        contactPhone: '+91 98765 43210',
        contactEmail: 'rajesh.kumar@example.com',
        description: 'Large relief camp with full facilities for disaster victims',
        website: 'https://example.com',
        operatingHours: '24/7',
        notes: 'Can accommodate up to 500 people with emergency supplies',
        facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets'],
        status: 'active',
        type: 'relief_camp',
        coordinates: { lat: 19.0760, lng: 72.8777 },
      },
      {
        name: 'Community Hall Shelter',
        addressLine1: '45 Park Street',
        addressLine2: 'Block A, First Floor',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110001',
        country: 'India',
        capacity: 200,
        currentOccupancy: 198,
        contactPerson: 'Amit Singh',
        contactPhone: '+91 87654 32109',
        contactEmail: 'amit.singh@example.com',
        description: 'Community hall converted to temporary shelter',
        operatingHours: '6 AM - 10 PM',
        facilities: ['Food', 'Water', 'Toilets'],
        status: 'full',
        type: 'temporary',
        coordinates: { lat: 28.6139, lng: 77.2090 },
      },
      {
        name: 'Stadium Emergency Shelter',
        addressLine1: '789 Sports Complex',
        addressLine2: 'Main Stadium Building',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600001',
        country: 'India',
        capacity: 1000,
        currentOccupancy: 450,
        contactPerson: 'Priya Devi',
        contactPhone: '+91 76543 21098',
        contactEmail: 'priya.devi@example.com',
        description: 'Large stadium facility for emergency shelter during disasters',
        operatingHours: '24/7',
        notes: 'Equipped with medical facilities and charging stations',
        facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'Charging Points'],
        status: 'active',
        type: 'emergency',
        coordinates: { lat: 13.0827, lng: 80.2707 },
      },
      {
        name: 'Dharamshala Permanent Shelter',
        addressLine1: '321 Temple Road',
        addressLine2: 'Near Main Temple',
        city: 'Kolkata',
        state: 'West Bengal',
        zipCode: '700001',
        country: 'India',
        capacity: 150,
        currentOccupancy: 0,
        contactPerson: 'Biswas Roy',
        contactPhone: '+91 65432 10987',
        contactEmail: 'biswas.roy@example.com',
        description: 'Permanent shelter facility for long-term accommodation',
        operatingHours: '8 AM - 8 PM',
        facilities: ['Food', 'Water', 'Toilets', 'Sleeping Area'],
        status: 'closed',
        type: 'permanent',
        coordinates: { lat: 22.5726, lng: 88.3639 },
      },
      {
        name: 'City Convention Center',
        addressLine1: '567 Downtown Avenue',
        addressLine2: 'Convention Hall 2',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India',
        capacity: 800,
        currentOccupancy: 520,
        contactPerson: 'Suresh Reddy',
        contactPhone: '+91 91234 56789',
        contactEmail: 'suresh.reddy@example.com',
        description: 'Modern convention center with full amenities',
        website: 'https://conventioncenter.example.com',
        operatingHours: '24/7',
        notes: 'WiFi available, charging points in all areas',
        facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'WiFi', 'Charging Points'],
        status: 'active',
        type: 'temporary',
        coordinates: { lat: 12.9716, lng: 77.5946 },
      },
    ];

    // Use insertMany which works better than create for bulk inserts
    const inserted = await Shelter.insertMany(sampleShelters);

    return NextResponse.json({
      success: true,
      message: `Successfully initialized with ${inserted.length} shelters`,
      count: inserted.length,
      data: inserted.map(s => ({
        id: s._id.toString(),
        name: s.name,
        city: s.city,
        state: s.state,
      })),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Init shelters error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

