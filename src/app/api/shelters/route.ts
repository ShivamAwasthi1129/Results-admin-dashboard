import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Shelter from '@/models/Shelter';
import { verifyAuth, canPerform } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - List all shelters
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const city = searchParams.get('city') || '';

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') query.status = status;
    if (type) query.type = type;
    if (city) query.city = { $regex: city, $options: 'i' };

    const skip = (page - 1) * limit;

    const [shelters, total] = await Promise.all([
      Shelter.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Shelter.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: shelters.map(shelter => {
        // Handle both new schema (addressLine1) and old schema (address) for backward compatibility
        // Explicitly handle null and undefined values
        const getValue = (val: any, defaultValue: any = '') => {
          return val !== null && val !== undefined ? val : defaultValue;
        };
        
        const addressLine1 = getValue(shelter.addressLine1) || getValue((shelter as any).address) || '';
        
        return {
          id: shelter._id.toString(),
          name: getValue(shelter.name),
          addressLine1: addressLine1,
          addressLine2: getValue(shelter.addressLine2),
          address: addressLine1, // For backward compatibility
          city: getValue(shelter.city),
          state: getValue(shelter.state),
          zipCode: getValue(shelter.zipCode),
          country: getValue(shelter.country, 'United States'),
          capacity: getValue(shelter.capacity, 0),
          currentOccupancy: getValue(shelter.currentOccupancy, 0),
          contactPerson: getValue(shelter.contactPerson),
          contactPhone: getValue(shelter.contactPhone),
          contactEmail: getValue(shelter.contactEmail),
          description: getValue(shelter.description),
          website: getValue(shelter.website),
          operatingHours: getValue(shelter.operatingHours),
          notes: getValue(shelter.notes),
          facilities: Array.isArray(shelter.facilities) ? shelter.facilities : [],
          status: getValue(shelter.status, 'active'),
          type: getValue(shelter.type, 'temporary'),
          coordinates: shelter.coordinates && typeof shelter.coordinates === 'object' 
            ? { lat: getValue(shelter.coordinates.lat, 0), lng: getValue(shelter.coordinates.lng, 0) }
            : { lat: 0, lng: 0 },
          createdAt: shelter.createdAt?.toISOString() || new Date().toISOString(),
        };
      }),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get shelters error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new shelter
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageShelters')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    // Log received data for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Received shelter data:', JSON.stringify(body, null, 2));
    }

    // Validate required fields with detailed error messages
    const missingFields: string[] = [];
    if (!body.name || !String(body.name).trim()) missingFields.push('name');
    if (!body.addressLine1 || !String(body.addressLine1).trim()) missingFields.push('addressLine1');
    if (!body.city || !String(body.city).trim()) missingFields.push('city');
    if (!body.state || !String(body.state).trim()) missingFields.push('state');
    if (!body.capacity || Number(body.capacity) < 1) missingFields.push('capacity');
    if (!body.contactPerson || !String(body.contactPerson).trim()) missingFields.push('contactPerson');
    if (!body.contactPhone || !String(body.contactPhone).trim()) missingFields.push('contactPhone');
    if (!body.type) missingFields.push('type');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      console.error('Received body:', body);
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields,
          receivedData: process.env.NODE_ENV === 'development' ? body : undefined
        },
        { status: 400 }
      );
    }

    // Validate occupancy (only check for negative values)
    const currentOccupancy = Number(body.currentOccupancy) || 0;
    const capacity = Number(body.capacity);
    
    if (currentOccupancy < 0) {
      return NextResponse.json(
        { success: false, error: 'Current occupancy cannot be negative' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (body.contactEmail && body.contactEmail.trim()) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(body.contactEmail)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
    }
    
    // Validate website URL format if provided
    if (body.website && body.website.trim()) {
      try {
        new URL(body.website.startsWith('http') ? body.website : `https://${body.website}`);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid website URL' },
          { status: 400 }
        );
      }
    }

    // Validate zip code format (numbers only) if provided
    if (body.zipCode && body.zipCode.trim()) {
      if (!/^\d+$/.test(body.zipCode.trim())) {
        return NextResponse.json(
          { success: false, error: 'Zip code must contain only numbers' },
          { status: 400 }
        );
      }
    }

    // Determine status based on occupancy
    let status = body.status || 'active';
    if (capacity > 0) {
      const occupancyPercentage = (currentOccupancy / capacity) * 100;
      if (occupancyPercentage >= 100) {
        status = 'full';
      }
    }

    // Prepare shelter data with proper trimming - all fields included
    const shelterData: any = {
      name: String(body.name || '').trim(),
      addressLine1: String(body.addressLine1 || '').trim(),
      addressLine2: body.addressLine2 ? String(body.addressLine2).trim() : '',
      city: String(body.city || '').trim(),
      state: String(body.state || '').trim(),
      zipCode: body.zipCode ? String(body.zipCode).trim() : '',
      country: body.country ? String(body.country).trim() : 'United States',
      capacity: capacity,
      currentOccupancy: currentOccupancy,
      contactPerson: String(body.contactPerson || '').trim(),
      contactPhone: String(body.contactPhone || '').trim(),
      contactEmail: body.contactEmail ? String(body.contactEmail).trim().toLowerCase() : '',
      description: body.description ? String(body.description).trim() : '',
      website: body.website ? String(body.website).trim() : '',
      operatingHours: body.operatingHours ? String(body.operatingHours).trim() : '',
      notes: body.notes ? String(body.notes).trim() : '',
      facilities: Array.isArray(body.facilities) ? body.facilities.map((f: any) => String(f).trim()).filter((f: string) => f) : [],
      status: status,
      type: body.type || 'temporary',
      coordinates: {
        lat: Number(body.coordinates?.lat) || 0,
        lng: Number(body.coordinates?.lng) || 0,
      },
    };

    // Create shelter using insertOne to bypass any hooks that cause "next is not a function" error
    // Add timestamps manually since insertOne bypasses Mongoose timestamps
    const now = new Date();
    const shelterDataWithTimestamps = {
      ...shelterData,
      createdAt: now,
      updatedAt: now,
    };
    
    const ShelterCollection = Shelter.collection;
    const insertResult = await ShelterCollection.insertOne(shelterDataWithTimestamps);
    
    // Fetch the created shelter using findById
    const shelter = await Shelter.findById(insertResult.insertedId);
    
    if (!shelter) {
      return NextResponse.json(
        { success: false, error: 'Failed to create shelter' },
        { status: 500 }
      );
    }

    // Helper function to handle null/undefined values
    const getValue = (val: any, defaultValue: any = '') => {
      return val !== null && val !== undefined ? val : defaultValue;
    };

    return NextResponse.json({
      success: true,
      data: {
        id: shelter._id.toString(),
        name: getValue(shelter.name),
        addressLine1: getValue(shelter.addressLine1) || getValue((shelter as any).address) || '',
        addressLine2: getValue(shelter.addressLine2),
        address: getValue(shelter.addressLine1) || getValue((shelter as any).address) || '', // For backward compatibility
        city: getValue(shelter.city),
        state: getValue(shelter.state),
        zipCode: getValue(shelter.zipCode),
        country: getValue(shelter.country, 'United States'),
        capacity: getValue(shelter.capacity, 0),
        currentOccupancy: getValue(shelter.currentOccupancy, 0),
        contactPerson: getValue(shelter.contactPerson),
        contactPhone: getValue(shelter.contactPhone),
        contactEmail: getValue(shelter.contactEmail),
        description: getValue(shelter.description),
        website: getValue(shelter.website),
        operatingHours: getValue(shelter.operatingHours),
        notes: getValue(shelter.notes),
        facilities: Array.isArray(shelter.facilities) ? shelter.facilities : [],
        status: getValue(shelter.status, 'active'),
        type: getValue(shelter.type, 'temporary'),
        coordinates: shelter.coordinates && typeof shelter.coordinates === 'object' 
          ? { lat: getValue(shelter.coordinates.lat, 0), lng: getValue(shelter.coordinates.lng, 0) }
          : { lat: 0, lng: 0 },
        createdAt: shelter.createdAt?.toISOString() || new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create shelter error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Update shelter
export async function PUT(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageShelters')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Shelter ID is required' },
        { status: 400 }
      );
    }

    // Convert string ID to ObjectId for proper MongoDB query
    let shelterId;
    try {
      shelterId = new mongoose.Types.ObjectId(body.id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid shelter ID format' },
        { status: 400 }
      );
    }

    const shelter = await Shelter.findById(shelterId);

    if (!shelter) {
      return NextResponse.json(
        { success: false, error: 'Shelter not found' },
        { status: 404 }
      );
    }

    // Validate zip code format (numbers only) - only if zipCode is provided and not empty
    if (body.zipCode !== undefined && body.zipCode !== null && String(body.zipCode).trim()) {
      const zipCodeStr = String(body.zipCode).trim();
      if (zipCodeStr && !/^\d+$/.test(zipCodeStr)) {
        return NextResponse.json(
          { success: false, error: 'Zip code must contain only numbers' },
          { status: 400 }
        );
      }
    }

    // Update ALL fields from the request body
    // The frontend sends all fields, so we update all of them
    const updateData: any = {};
    
    // Update all basic fields
    if (body.name !== undefined) updateData.name = String(body.name || '').trim();
    if (body.addressLine1 !== undefined) updateData.addressLine1 = String(body.addressLine1 || '').trim();
    if (body.addressLine2 !== undefined) updateData.addressLine2 = String(body.addressLine2 || '').trim();
    if (body.city !== undefined) updateData.city = String(body.city || '').trim();
    if (body.state !== undefined) updateData.state = String(body.state || '').trim();
    if (body.zipCode !== undefined) updateData.zipCode = String(body.zipCode || '').trim();
    if (body.country !== undefined) updateData.country = String(body.country || 'United States').trim();
    
    // Update capacity and occupancy
    if (body.capacity !== undefined) {
      const newCapacity = Number(body.capacity);
      if (newCapacity < 1) {
        return NextResponse.json(
          { success: false, error: 'Capacity must be at least 1' },
          { status: 400 }
        );
      }
      updateData.capacity = newCapacity;
    }
    if (body.currentOccupancy !== undefined) {
      const newOccupancy = Number(body.currentOccupancy) || 0;
      if (newOccupancy < 0) {
        return NextResponse.json(
          { success: false, error: 'Occupancy cannot be negative' },
          { status: 400 }
        );
      }
      updateData.currentOccupancy = newOccupancy;
    }
    
    const newCapacity = updateData.capacity !== undefined ? updateData.capacity : shelter.capacity;
    const newOccupancy = updateData.currentOccupancy !== undefined ? updateData.currentOccupancy : shelter.currentOccupancy;
    
    // Update status based on occupancy
    if (newCapacity > 0) {
      const occupancyPercentage = (newOccupancy / newCapacity) * 100;
      if (occupancyPercentage >= 100) {
        updateData.status = 'full';
      } else if (body.status !== undefined) {
        updateData.status = body.status;
      } else if (shelter.status === 'full' && occupancyPercentage < 100) {
        updateData.status = 'active';
      }
    } else if (body.status !== undefined) {
      updateData.status = body.status;
    }
    
    // Update contact information
    if (body.contactPerson !== undefined) updateData.contactPerson = String(body.contactPerson || '').trim();
    if (body.contactPhone !== undefined) updateData.contactPhone = String(body.contactPhone || '').trim();
    if (body.contactEmail !== undefined) {
      const email = String(body.contactEmail || '').trim().toLowerCase();
      if (email) {
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
          return NextResponse.json(
            { success: false, error: 'Please enter a valid email address' },
            { status: 400 }
          );
        }
        updateData.contactEmail = email;
      } else {
        updateData.contactEmail = '';
      }
    }
    
    // Update additional information
    if (body.description !== undefined) updateData.description = String(body.description || '').trim();
    if (body.website !== undefined) {
      const website = String(body.website || '').trim();
      if (website) {
        try {
          new URL(website.startsWith('http') ? website : `https://${website}`);
          updateData.website = website;
        } catch {
          return NextResponse.json(
            { success: false, error: 'Please enter a valid website URL' },
            { status: 400 }
          );
        }
      } else {
        updateData.website = '';
      }
    }
    if (body.operatingHours !== undefined) updateData.operatingHours = String(body.operatingHours || '').trim();
    if (body.notes !== undefined) updateData.notes = String(body.notes || '').trim();
    if (body.facilities !== undefined) {
      updateData.facilities = Array.isArray(body.facilities) 
        ? body.facilities.map((f: any) => String(f).trim()).filter((f: string) => f)
        : [];
    }
    if (body.type !== undefined) updateData.type = body.type;
    if (body.coordinates !== undefined) {
      updateData.coordinates = {
        lat: Number(body.coordinates.lat) || shelter.coordinates.lat,
        lng: Number(body.coordinates.lng) || shelter.coordinates.lng,
      };
    }

    // Ensure we have at least one field to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Log before update for debugging
    console.log('=== UPDATE OPERATION DEBUG ===');
    console.log('Shelter ID (string):', body.id);
    console.log('Shelter ID (ObjectId):', shelterId.toString());
    console.log('Update data keys:', Object.keys(updateData));
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    console.log('Original shelter data:', {
      name: shelter.name,
      capacity: shelter.capacity,
      currentOccupancy: shelter.currentOccupancy,
      city: shelter.city,
      state: shelter.state,
    });

    // Use collection.updateOne directly to bypass Mongoose middleware and ensure update happens
    // This is similar to how we use insertOne for creates
    const ShelterCollection = Shelter.collection;
    
    // Add updatedAt timestamp manually
    const updateDataWithTimestamp = {
      ...updateData,
      updatedAt: new Date(),
    };

    console.log('Update data with timestamp:', JSON.stringify(updateDataWithTimestamp, null, 2));

    const updateResult = await ShelterCollection.updateOne(
      { _id: shelterId },
      { 
        $set: updateDataWithTimestamp
      }
    );

    console.log('Update operation result:', {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged,
      upsertedCount: updateResult.upsertedCount,
      updateDataKeys: Object.keys(updateData),
      updateDataSample: {
        name: updateData.name,
        capacity: updateData.capacity,
        currentOccupancy: updateData.currentOccupancy,
        zipCode: updateData.zipCode,
      }
    });

    if (updateResult.matchedCount === 0) {
      console.error('ERROR: No document matched the query. ID might be incorrect.');
      console.error('Query used:', { _id: shelterId });
      console.error('Shelter ID string:', body.id);
      return NextResponse.json(
        { success: false, error: 'Shelter not found' },
        { status: 404 }
      );
    }

    if (updateResult.modifiedCount === 0 && Object.keys(updateData).length > 0) {
      console.error('ERROR: Update matched but no fields were modified!');
      console.error('This indicates the update did not save to the database.');
      console.error('Update data that should have been saved:', JSON.stringify(updateData, null, 2));
      
      // Try to fetch the current document to see what's in the database
      const currentDoc = await ShelterCollection.findOne({ _id: shelterId });
      console.error('Current document in database:', JSON.stringify(currentDoc, null, 2));
      
      // Force the update by using replaceOne or trying again with explicit values
      console.log('Attempting force update...');
      const forceUpdateResult = await ShelterCollection.updateOne(
        { _id: shelterId },
        { 
          $set: updateDataWithTimestamp
        },
        { upsert: false }
      );
      console.log('Force update result:', forceUpdateResult);
    }

    // Wait a moment to ensure write is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Fetch the updated shelter from database to verify the update
    // Use collection directly to get raw data
    const updatedShelterRaw = await ShelterCollection.findOne({ _id: shelterId });
    
    if (!updatedShelterRaw) {
      console.error('ERROR: Could not fetch updated shelter from database');
      return NextResponse.json(
        { success: false, error: 'Shelter not found after update' },
        { status: 404 }
      );
    }

    // Convert to plain object for easier handling
    const updatedShelter = updatedShelterRaw as any;
    
    console.log('Updated shelter from DB (raw):', {
      name: updatedShelter?.name,
      capacity: updatedShelter?.capacity,
      currentOccupancy: updatedShelter?.currentOccupancy,
      city: updatedShelter?.city,
      state: updatedShelter?.state,
      zipCode: updatedShelter?.zipCode,
      addressLine1: updatedShelter?.addressLine1,
    });
    
    // Verify the update actually happened
    const updateVerified = (
      updateData.name === undefined || updatedShelter.name === updateData.name
    ) && (
      updateData.capacity === undefined || updatedShelter.capacity === updateData.capacity
    ) && (
      updateData.zipCode === undefined || updatedShelter.zipCode === updateData.zipCode
    );
    
    if (!updateVerified && Object.keys(updateData).length > 0) {
      console.error('WARNING: Update may not have been saved correctly!');
      console.error('Expected vs Actual:');
      console.error('Expected name:', updateData.name, 'Actual:', updatedShelter.name);
      console.error('Expected capacity:', updateData.capacity, 'Actual:', updatedShelter.capacity);
      console.error('Expected zipCode:', updateData.zipCode, 'Actual:', updatedShelter.zipCode);
    }
    
    console.log('=== END UPDATE DEBUG ===');

    // Helper function to handle null/undefined values
    const getValue = (val: any, defaultValue: any = '') => {
      return val !== null && val !== undefined ? val : defaultValue;
    };

    // Return the data from the database (what was actually saved)
    // This ensures the response shows what's actually in the database
    return NextResponse.json({
      success: true,
      data: {
        id: updatedShelter._id.toString(),
        // Return values from database (what was actually saved)
        name: getValue(updatedShelter.name),
        addressLine1: getValue(updatedShelter.addressLine1) || getValue((updatedShelter as any).address) || '',
        addressLine2: getValue(updatedShelter.addressLine2),
        city: getValue(updatedShelter.city),
        state: getValue(updatedShelter.state),
        zipCode: getValue(updatedShelter.zipCode),
        country: getValue(updatedShelter.country, 'United States'),
        capacity: getValue(updatedShelter.capacity, 0),
        currentOccupancy: getValue(updatedShelter.currentOccupancy, 0),
        contactPerson: getValue(updatedShelter.contactPerson),
        contactPhone: getValue(updatedShelter.contactPhone),
        contactEmail: getValue(updatedShelter.contactEmail),
        description: getValue(updatedShelter.description),
        website: getValue(updatedShelter.website),
        operatingHours: getValue(updatedShelter.operatingHours),
        notes: getValue(updatedShelter.notes),
        facilities: Array.isArray(updatedShelter.facilities) ? updatedShelter.facilities : [],
        type: getValue(updatedShelter.type, 'temporary'),
        coordinates: updatedShelter.coordinates && typeof updatedShelter.coordinates === 'object' 
          ? { lat: getValue(updatedShelter.coordinates.lat, 0), lng: getValue(updatedShelter.coordinates.lng, 0) }
          : { lat: 0, lng: 0 },
        // System fields from database
        status: getValue(updatedShelter.status, 'active'),
        createdAt: updatedShelter.createdAt?.toISOString() || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Update shelter error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete shelter
export async function DELETE(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageShelters')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Shelter ID is required' },
        { status: 400 }
      );
    }

    // Convert string ID to ObjectId for proper MongoDB query
    let shelterId;
    try {
      shelterId = new mongoose.Types.ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid shelter ID format' },
        { status: 400 }
      );
    }

    console.log('Deleting shelter:', id, 'ObjectId:', shelterId.toString());

    const deleteResult = await Shelter.deleteOne({ _id: shelterId });

    console.log('Delete operation result:', {
      deletedCount: deleteResult.deletedCount,
      acknowledged: deleteResult.acknowledged,
    });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Shelter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Shelter deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete shelter error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

