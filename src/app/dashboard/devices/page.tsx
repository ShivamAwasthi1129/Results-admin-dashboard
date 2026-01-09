import { getServerAuth } from '@/lib/server-auth';
import { getApiUrl } from '@/lib/server-api';
import DevicesClient from './DevicesClient';

interface ApiDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  status: string;
  location?: {
    coordinates?: {
      lat: number;
      lng: number;
    };
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  firmwareVersion?: string;
  lastSynced?: string;
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
  updatedAt?: string;
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
  // Handle coordinates - API returns { lat, lng } object
  const coordinates = apiDevice.location?.coordinates 
    ? { 
        lat: typeof apiDevice.location.coordinates.lat === 'number' ? apiDevice.location.coordinates.lat : 0,
        lng: typeof apiDevice.location.coordinates.lng === 'number' ? apiDevice.location.coordinates.lng : 0
      }
    : { lat: 0, lng: 0 };
  
  return {
    id: apiDevice.id || '',
    deviceId: apiDevice.deviceId || '',
    deviceName: apiDevice.deviceName || 'Unknown Device',
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
    batteryLevel: apiDevice.batteryLevel ?? 0,
    signalStrength: apiDevice.signalStrength ?? 0,
    firmwareVersion: apiDevice.firmwareVersion || '1.0.0',
    lastSynced: apiDevice.lastSynced || apiDevice.createdAt || new Date().toISOString(),
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
      avatar: apiDevice.primaryOwner?.avatar || '',
    },
    familyMembers: apiDevice.familyMembers || [],
    createdAt: apiDevice.createdAt || new Date().toISOString(),
  };
}

async function fetchDevices(token: string | null): Promise<Device[]> {
  try {
    if (!token) {
      console.warn('[fetchDevices] No token provided');
      return [];
    }
    
    const apiUrl = getApiUrl('/api/devices');
    console.log(`[fetchDevices] Fetching from: ${apiUrl}`);
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(apiUrl, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`[fetchDevices] Failed to fetch devices: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[fetchDevices] Error response: ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      console.error(`[fetchDevices] API returned success: false`, data.error || 'Unknown error');
      return [];
    }
    
    const apiDevices: ApiDevice[] = data.data || [];
    console.log(`[fetchDevices] Successfully fetched ${apiDevices.length} devices`);
    return apiDevices.map(transformDevice);
  } catch (error: any) {
    console.error('[fetchDevices] Error fetching devices:', error);
    if (error.name === 'AbortError') {
      console.error('[fetchDevices] Request timed out');
    }
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
