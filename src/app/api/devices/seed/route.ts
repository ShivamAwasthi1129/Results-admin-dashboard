import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Device from '@/models/Device';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Clear existing devices
    await Device.deleteMany({});

    // Sample device data based on the images
    const sampleDevices = [
      {
        deviceId: 'R3S-WR-0001',
        deviceName: 'R3sults Watch Pro',
        deviceType: 'watch_pro',
        ownerName: 'John Smith',
        registeredDate: new Date('2024-01-15'),
        location: {
          address: '123 Main St',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
          coordinates: {
            lat: 25.7617,
            lng: -80.1918,
          },
        },
        batteryLevel: 85,
        signalStrength: 92,
        firmwareVersion: '2.4.1',
        lastSynced: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        status: 'active',
        features: {
          gpsTracking: true,
          sosButton: true,
          heartRateMonitor: true,
          fallDetection: true,
        },
        primaryOwner: {
          name: 'John Smith',
          role: 'Device Owner',
          avatar: '',
        },
        familyMembers: [
          {
            name: 'Jane Smith',
            role: 'Tracked Member',
            avatar: '',
          },
          {
            name: 'Emily Smith',
            role: 'Tracked Member',
            avatar: '',
          },
          {
            name: 'Michael Smith',
            role: 'Tracked Member',
            avatar: '',
          },
        ],
      },
      {
        deviceId: 'R3S-WR-0002',
        deviceName: 'R3sults Watch Lite',
        deviceType: 'watch_lite',
        ownerName: 'Sarah Johnson',
        registeredDate: new Date('2024-01-20'),
        location: {
          address: '456 Oak Ave',
          city: 'Tampa',
          state: 'FL',
          zipCode: '33602',
          coordinates: {
            lat: 27.9506,
            lng: -82.4572,
          },
        },
        batteryLevel: 45,
        signalStrength: 78,
        firmwareVersion: '2.4.1',
        lastSynced: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        status: 'active',
        features: {
          gpsTracking: true,
          sosButton: true,
          heartRateMonitor: false,
          fallDetection: false,
        },
        primaryOwner: {
          name: 'Sarah Johnson',
          role: 'Device Owner',
          avatar: '',
        },
        familyMembers: [
          {
            name: 'David Johnson',
            role: 'Tracked Member',
            avatar: '',
          },
          {
            name: 'Lisa Johnson',
            role: 'Guardian',
            avatar: '',
          },
        ],
      },
      {
        deviceId: 'R3S-WR-0003',
        deviceName: 'R3sults Watch Pro',
        deviceType: 'watch_pro',
        ownerName: 'Michael Brown',
        registeredDate: new Date('2024-02-01'),
        location: {
          address: '789 Pine St',
          city: 'Orlando',
          state: 'FL',
          zipCode: '32801',
          coordinates: {
            lat: 28.5383,
            lng: -81.3792,
          },
        },
        batteryLevel: 92,
        signalStrength: 88,
        firmwareVersion: '2.3.5',
        lastSynced: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        status: 'active',
        features: {
          gpsTracking: true,
          sosButton: true,
          heartRateMonitor: true,
          fallDetection: true,
        },
        primaryOwner: {
          name: 'Michael Brown',
          role: 'Device Owner',
          avatar: '',
        },
        familyMembers: [
          {
            name: 'Emma Brown',
            role: 'Tracked Member',
            avatar: '',
          },
        ],
      },
      {
        deviceId: 'R3S-WR-0004',
        deviceName: 'R3sults Watch Lite',
        deviceType: 'watch_lite',
        ownerName: 'Jennifer Davis',
        registeredDate: new Date('2024-02-10'),
        location: {
          address: '321 Elm St',
          city: 'Jacksonville',
          state: 'FL',
          zipCode: '32202',
          coordinates: {
            lat: 30.3322,
            lng: -81.6557,
          },
        },
        batteryLevel: 67,
        signalStrength: 95,
        firmwareVersion: '2.4.1',
        lastSynced: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
        status: 'active',
        features: {
          gpsTracking: true,
          sosButton: true,
          heartRateMonitor: false,
          fallDetection: false,
        },
        primaryOwner: {
          name: 'Jennifer Davis',
          role: 'Device Owner',
          avatar: '',
        },
        familyMembers: [],
      },
      {
        deviceId: 'R3S-WR-0005',
        deviceName: 'R3sults Watch Pro',
        deviceType: 'watch_pro',
        ownerName: 'Robert Wilson',
        registeredDate: new Date('2024-02-15'),
        location: {
          address: '654 Maple Dr',
          city: 'Fort Lauderdale',
          state: 'FL',
          zipCode: '33301',
          coordinates: {
            lat: 26.1224,
            lng: -80.1373,
          },
        },
        batteryLevel: 23,
        signalStrength: 65,
        firmwareVersion: '2.4.0',
        lastSynced: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        status: 'offline',
        features: {
          gpsTracking: true,
          sosButton: true,
          heartRateMonitor: true,
          fallDetection: true,
        },
        primaryOwner: {
          name: 'Robert Wilson',
          role: 'Device Owner',
          avatar: '',
        },
        familyMembers: [
          {
            name: 'Olivia Wilson',
            role: 'Tracked Member',
            avatar: '',
          },
          {
            name: 'James Wilson',
            role: 'Tracked Member',
            avatar: '',
          },
          {
            name: 'Sophia Wilson',
            role: 'Guardian',
            avatar: '',
          },
        ],
      },
    ];

    const devices = await Device.insertMany(sampleDevices);

    return NextResponse.json({
      success: true,
      message: `Seeded ${devices.length} devices`,
      count: devices.length,
    });
  } catch (error: any) {
    console.error('Seed devices error:', error);
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

