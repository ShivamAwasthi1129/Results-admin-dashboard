import { getServerAuth } from '@/lib/server-auth';
import DevicesClient from './DevicesClient';

interface ApiDevice {
  _id: string;
  deviceId: string;
  deviceType: string;
  name: string;
  status: string;
  location?: {
    coordinates?: [number, number];
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  familyId?: string;
  firmwareVersion?: string;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
  ownerName?: string;
  registeredDate?: string;
  features?: {
    gpsTracking?: boolean;
    sosButton?: boolean;
    heartRateMonitor?: boolean;
    fallDetection?: boolean;
  };
  primaryOwner?: {
    name?: string;
    role?: string;
    avatar?: string;
  };
  familyMembers?: any[];
  createdAt?: string;
}

interface Device {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'watch_pro' | 'watch_lite' | 'tracker';
  ownerName: string;
  registeredDate: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  batteryLevel: number;
  signalStrength: number;
  firmwareVersion: string;
  lastSynced: string;
  status: 'active' | 'inactive' | 'offline' | 'maintenance';
  features: {
    gpsTracking: boolean;
    sosButton: boolean;
    heartRateMonitor: boolean;
    fallDetection: boolean;
  };
  primaryOwner: {
    name: string;
    role: string;
    avatar?: string;
  };
  familyMembers: any[];
  createdAt: string;
}

function transformDevice(apiDevice: ApiDevice): Device {
  const coordinates = apiDevice.location?.coordinates 
    ? { lat: apiDevice.location.coordinates[1], lng: apiDevice.location.coordinates[0] }
    : { lat: 0, lng: 0 };
  
  return {
    id: apiDevice._id,
    deviceId: apiDevice.deviceId || apiDevice._id,
    deviceName: apiDevice.name || 'Unknown Device',
    deviceType: (apiDevice.deviceType === 'watch_pro' || apiDevice.deviceType === 'watch_lite' || apiDevice.deviceType === 'tracker')
      ? apiDevice.deviceType
      : 'tracker',
    ownerName: apiDevice.ownerName || 'Unknown Owner',
    registeredDate: apiDevice.registeredDate || apiDevice.createdAt || new Date().toISOString(),
    location: {
      address: apiDevice.location?.address || '',
      city: apiDevice.location?.city || '',
      state: apiDevice.location?.state || '',
      zipCode: apiDevice.location?.zipCode || '',
      coordinates,
    },
    batteryLevel: apiDevice.batteryLevel || 0,
    signalStrength: apiDevice.signalStrength || 0,
    firmwareVersion: apiDevice.firmwareVersion || '1.0.0',
    lastSynced: apiDevice.lastSeen || new Date().toISOString(),
    status: (apiDevice.status === 'active' || apiDevice.status === 'inactive' || apiDevice.status === 'offline' || apiDevice.status === 'maintenance')
      ? apiDevice.status
      : 'inactive',
    features: {
      gpsTracking: apiDevice.features?.gpsTracking ?? true,
      sosButton: apiDevice.features?.sosButton ?? true,
      heartRateMonitor: apiDevice.features?.heartRateMonitor ?? false,
      fallDetection: apiDevice.features?.fallDetection ?? false,
    },
    primaryOwner: {
      name: apiDevice.primaryOwner?.name || apiDevice.ownerName || 'Unknown',
      role: apiDevice.primaryOwner?.role || 'Owner',
      avatar: apiDevice.primaryOwner?.avatar,
    },
    familyMembers: apiDevice.familyMembers || [],
    createdAt: apiDevice.createdAt || new Date().toISOString(),
  };
}

async function fetchDevices(token: string | null): Promise<Device[]> {
  try {
    if (!token) return [];
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch devices');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    const apiDevices: ApiDevice[] = data.data || [];
    return apiDevices.map(transformDevice);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return [];
  }
}

export default async function DevicesPage() {
  const { token } = await getServerAuth();
  
  const devices = await fetchDevices(token);
  
  return (
    <DevicesClient
      initialDevices={devices}
    />
  );
}
