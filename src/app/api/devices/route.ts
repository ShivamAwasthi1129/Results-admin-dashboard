import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Device from '@/models/Device';
import { verifyAuth, canPerform } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - List all devices
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'viewDevices')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const deviceType = searchParams.get('deviceType') || 'all';

    const query: any = {};

    if (search) {
      query.$or = [
        { deviceId: { $regex: search, $options: 'i' } },
        { deviceName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') query.status = status;
    if (deviceType && deviceType !== 'all') query.deviceType = deviceType;

    const skip = (page - 1) * limit;

    const [devices, total] = await Promise.all([
      Device.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Device.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: devices.map(device => ({
        id: device._id?.toString(),
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        ownerName: device.ownerName,
        registeredDate: device.registeredDate?.toISOString() || new Date().toISOString(),
        location: device.location,
        batteryLevel: device.batteryLevel,
        signalStrength: device.signalStrength,
        firmwareVersion: device.firmwareVersion,
        lastSynced: device.lastSynced?.toISOString() || new Date().toISOString(),
        status: device.status,
        features: device.features,
        primaryOwner: device.primaryOwner,
        familyMembers: device.familyMembers || [],
        createdAt: device.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: device.updatedAt?.toISOString() || new Date().toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get devices error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new device
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageDevices')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    // Validate required fields
    const missingFields: string[] = [];
    if (!body.deviceId || !String(body.deviceId).trim()) missingFields.push('deviceId');
    if (!body.deviceName || !String(body.deviceName).trim()) missingFields.push('deviceName');
    if (!body.deviceType) missingFields.push('deviceType');
    if (!body.ownerName || !String(body.ownerName).trim()) missingFields.push('ownerName');
    if (!body.location?.address || !String(body.location.address).trim()) missingFields.push('location.address');
    if (!body.location?.city || !String(body.location.city).trim()) missingFields.push('location.city');
    if (!body.location?.state || !String(body.location.state).trim()) missingFields.push('location.state');
    if (body.location?.coordinates?.lat === undefined || body.location?.coordinates?.lng === undefined) {
      missingFields.push('location.coordinates');
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields 
        },
        { status: 400 }
      );
    }

    // Check if deviceId already exists
    const existingDevice = await Device.findOne({ deviceId: body.deviceId.toUpperCase().trim() });
    if (existingDevice) {
      return NextResponse.json(
        { success: false, error: 'Device ID already exists' },
        { status: 400 }
      );
    }

    const deviceData: any = {
      deviceId: String(body.deviceId).trim().toUpperCase(),
      deviceName: String(body.deviceName).trim(),
      deviceType: body.deviceType,
      ownerName: String(body.ownerName).trim(),
      registeredDate: body.registeredDate ? new Date(body.registeredDate) : new Date(),
      location: {
        address: String(body.location.address).trim(),
        city: String(body.location.city).trim(),
        state: String(body.location.state).trim(),
        zipCode: body.location.zipCode ? String(body.location.zipCode).trim() : '',
        coordinates: {
          lat: Number(body.location.coordinates.lat),
          lng: Number(body.location.coordinates.lng),
        },
      },
      batteryLevel: body.batteryLevel !== undefined ? Number(body.batteryLevel) : 100,
      signalStrength: body.signalStrength !== undefined ? Number(body.signalStrength) : 100,
      firmwareVersion: body.firmwareVersion || '2.4.1',
      lastSynced: body.lastSynced ? new Date(body.lastSynced) : new Date(),
      status: body.status || 'active',
      features: {
        gpsTracking: body.features?.gpsTracking !== undefined ? body.features.gpsTracking : true,
        sosButton: body.features?.sosButton !== undefined ? body.features.sosButton : true,
        heartRateMonitor: body.features?.heartRateMonitor !== undefined ? body.features.heartRateMonitor : false,
        fallDetection: body.features?.fallDetection !== undefined ? body.features.fallDetection : false,
      },
      primaryOwner: {
        name: body.primaryOwner?.name || String(body.ownerName).trim(),
        role: body.primaryOwner?.role || 'Device Owner',
        avatar: body.primaryOwner?.avatar || '',
      },
      familyMembers: Array.isArray(body.familyMembers) ? body.familyMembers.map((member: any) => ({
        name: String(member.name).trim(),
        role: member.role || 'Tracked Member',
        avatar: member.avatar || '',
      })) : [],
    };

    let device: any = await Device.create(deviceData);
    // Device.create returns an array if passed an array, but a single doc if passed an object
    if (Array.isArray(device)) {
      device = device[0];
    }

    return NextResponse.json({
      success: true,
      data: {
        id: device._id?.toString(),
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        ownerName: device.ownerName,
        registeredDate: device.registeredDate?.toISOString() || new Date().toISOString(),
        location: device.location,
        batteryLevel: device.batteryLevel,
        signalStrength: device.signalStrength,
        firmwareVersion: device.firmwareVersion,
        lastSynced: device.lastSynced?.toISOString() || new Date().toISOString(),
        status: device.status,
        features: device.features,
        primaryOwner: device.primaryOwner,
        familyMembers: device.familyMembers,
        createdAt: device.createdAt?.toISOString() || new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create device error:', error);
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

// PUT - Update device
export async function PUT(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageDevices')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Device ID is required' },
        { status: 400 }
      );
    }

    let deviceId;
    try {
      deviceId = new mongoose.Types.ObjectId(body.id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid device ID format' },
        { status: 400 }
      );
    }

    const device = await Device.findById(deviceId);

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (body.deviceName !== undefined) updateData.deviceName = String(body.deviceName).trim();
    if (body.deviceType !== undefined) updateData.deviceType = body.deviceType;
    if (body.ownerName !== undefined) updateData.ownerName = String(body.ownerName).trim();
    if (body.batteryLevel !== undefined) updateData.batteryLevel = Math.max(0, Math.min(100, Number(body.batteryLevel)));
    if (body.signalStrength !== undefined) updateData.signalStrength = Math.max(0, Math.min(100, Number(body.signalStrength)));
    if (body.firmwareVersion !== undefined) updateData.firmwareVersion = String(body.firmwareVersion).trim();
    if (body.lastSynced !== undefined) updateData.lastSynced = new Date(body.lastSynced);
    if (body.status !== undefined) updateData.status = body.status;

    if (body.location !== undefined) {
      updateData.location = {
        address: body.location.address !== undefined ? String(body.location.address).trim() : device.location.address,
        city: body.location.city !== undefined ? String(body.location.city).trim() : device.location.city,
        state: body.location.state !== undefined ? String(body.location.state).trim() : device.location.state,
        zipCode: body.location.zipCode !== undefined ? String(body.location.zipCode).trim() : device.location.zipCode,
        coordinates: {
          lat: body.location.coordinates?.lat !== undefined ? Number(body.location.coordinates.lat) : device.location.coordinates.lat,
          lng: body.location.coordinates?.lng !== undefined ? Number(body.location.coordinates.lng) : device.location.coordinates.lng,
        },
      };
    }

    if (body.features !== undefined) {
      updateData.features = {
        gpsTracking: body.features.gpsTracking !== undefined ? body.features.gpsTracking : device.features.gpsTracking,
        sosButton: body.features.sosButton !== undefined ? body.features.sosButton : device.features.sosButton,
        heartRateMonitor: body.features.heartRateMonitor !== undefined ? body.features.heartRateMonitor : device.features.heartRateMonitor,
        fallDetection: body.features.fallDetection !== undefined ? body.features.fallDetection : device.features.fallDetection,
      };
    }

    if (body.primaryOwner !== undefined) {
      updateData.primaryOwner = {
        name: body.primaryOwner.name !== undefined ? String(body.primaryOwner.name).trim() : device.primaryOwner.name,
        role: body.primaryOwner.role !== undefined ? String(body.primaryOwner.role).trim() : device.primaryOwner.role,
        avatar: body.primaryOwner.avatar !== undefined ? String(body.primaryOwner.avatar).trim() : device.primaryOwner.avatar,
      };
    }

    if (body.familyMembers !== undefined) {
      updateData.familyMembers = Array.isArray(body.familyMembers) ? body.familyMembers.map((member: any) => ({
        name: String(member.name).trim(),
        role: member.role || 'Tracked Member',
        avatar: member.avatar || '',
      })) : [];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Use collection directly for update
    const DeviceCollection = Device.collection;
    const updateResult = await DeviceCollection.updateOne(
      { _id: deviceId },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date(),
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    const updatedDevice = await Device.findById(deviceId).lean();

    if (!updatedDevice) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDevice._id.toString(),
        deviceId: updatedDevice.deviceId,
        deviceName: updatedDevice.deviceName,
        deviceType: updatedDevice.deviceType,
        ownerName: updatedDevice.ownerName,
        registeredDate: updatedDevice.registeredDate?.toISOString() || new Date().toISOString(),
        location: updatedDevice.location,
        batteryLevel: updatedDevice.batteryLevel,
        signalStrength: updatedDevice.signalStrength,
        firmwareVersion: updatedDevice.firmwareVersion,
        lastSynced: updatedDevice.lastSynced?.toISOString() || new Date().toISOString(),
        status: updatedDevice.status,
        features: updatedDevice.features,
        primaryOwner: updatedDevice.primaryOwner,
        familyMembers: updatedDevice.familyMembers,
        createdAt: updatedDevice.createdAt?.toISOString() || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Update device error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete device
export async function DELETE(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageDevices')) {
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
        { success: false, error: 'Device ID is required' },
        { status: 400 }
      );
    }

    let deviceId;
    try {
      deviceId = new mongoose.Types.ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid device ID format' },
        { status: 400 }
      );
    }

    const deleteResult = await Device.deleteOne({ _id: deviceId });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Device deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete device error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

