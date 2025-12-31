'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Modal, Input, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPinIcon,
  EyeIcon,
  Cog6ToothIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { BsSmartwatch, BsBatteryFull, BsBatteryHalf, BsBattery, BsSignal } from 'react-icons/bs';

interface FamilyMember {
  name: string;
  role: 'Tracked Member' | 'Guardian' | 'Caregiver';
  avatar?: string;
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
  familyMembers: FamilyMember[];
  createdAt: string;
}

export default function DevicesPage() {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFirmwareModalOpen, setIsFirmwareModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'family' | 'location'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDeviceType, setFilterDeviceType] = useState('all');
  const [editingField, setEditingField] = useState<{ deviceId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [firmwareFormData, setFirmwareFormData] = useState({
    targetType: 'all',
    firmwareVersion: '2.5.0',
  });

  // Fetch devices from API
  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/devices', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setDevices(data.data);
        
        // Auto-seed if no devices exist
        if (data.data.length === 0) {
          try {
            const seedResponse = await fetch('/api/devices/seed', { method: 'POST' });
            const seedData = await seedResponse.json();
            if (seedData.success) {
              await fetchDevices();
              toast.success(`Auto-seeded ${seedData.count} devices`);
            }
          } catch (seedError) {
            console.error('Auto-seed error:', seedError);
          }
        }
      } else {
        toast.error(data.error || 'Failed to fetch devices');
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to fetch devices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDevices();
    }
  }, [token]);

  // Initialize map when location tab is opened
  useEffect(() => {
    if (activeTab === 'location' && selectedDevice && mapContainerRef.current && !mapRef.current) {
      const { lat, lng } = selectedDevice.location.coordinates;
      
      mapRef.current = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Create custom icon
      const customIcon = L.divIcon({
        className: 'custom-device-marker',
        html: `<div style="
          width: 40px;
          height: 40px;
          background: #ef4444;
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [activeTab, selectedDevice]);

  const handleView = (device: Device) => {
    setSelectedDevice(device);
    setActiveTab('overview');
    setIsDetailModalOpen(true);
  };

  const handleFirmwareUpdate = () => {
    setIsFirmwareModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this device?')) {
      return;
    }
    try {
      const response = await fetch(`/api/devices?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Device deleted successfully');
        await fetchDevices();
      } else {
        toast.error(data.error || 'Failed to delete device');
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Failed to delete device');
    }
  };

  const handleInlineEdit = (device: Device, field: string, currentValue: any) => {
    setEditingField({ deviceId: device.id, field });
    setEditValue(String(currentValue));
  };

  const handleInlineSave = async (device: Device) => {
    if (!editingField) return;

    try {
      const updateData: any = {};
      
      // Handle different field types
      if (editingField.field === 'batteryLevel' || editingField.field === 'signalStrength') {
        const numValue = Number(editValue);
        if (isNaN(numValue) || numValue < 0 || numValue > 100) {
          toast.error('Value must be between 0 and 100');
          return;
        }
        updateData[editingField.field] = numValue;
      } else if (editingField.field === 'status') {
        updateData.status = editValue;
      } else if (editingField.field === 'firmwareVersion') {
        updateData.firmwareVersion = editValue.trim();
      } else if (editingField.field === 'ownerName') {
        updateData.ownerName = editValue.trim();
      } else if (editingField.field === 'deviceName') {
        updateData.deviceName = editValue.trim();
      }

      const response = await fetch('/api/devices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: device.id,
          ...updateData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Device updated successfully');
        setEditingField(null);
        setEditValue('');
        await fetchDevices();
      } else {
        toast.error(data.error || 'Failed to update device');
      }
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error('Failed to update device');
    }
  };

  const handleInlineCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleFirmwareUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get devices to update based on target type
      let devicesToUpdate: Device[] = [];
      
      if (firmwareFormData.targetType === 'all') {
        devicesToUpdate = devices;
      } else {
        devicesToUpdate = devices.filter(d => d.deviceType === firmwareFormData.targetType);
      }

      if (devicesToUpdate.length === 0) {
        toast.error('No devices found to update');
        return;
      }

      // Update all selected devices in parallel
      const updatePromises = devicesToUpdate.map(device =>
        fetch('/api/devices', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: device.id,
            firmwareVersion: firmwareFormData.firmwareVersion,
            lastSynced: new Date().toISOString(),
          }),
        }).then(async res => {
          const data = await res.json();
          return { success: data.success, deviceId: device.deviceId };
        }).catch(error => {
          console.error(`Error updating device ${device.deviceId}:`, error);
          return { success: false, deviceId: device.deviceId };
        })
      );

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;

      if (failedCount === 0) {
        toast.success(`Firmware updated successfully for ${successCount} device(s)`);
        setIsFirmwareModalOpen(false);
        setFirmwareFormData({ targetType: 'all', firmwareVersion: '2.5.0' });
        await fetchDevices();
      } else {
        toast.warning(`Updated ${successCount} device(s), ${failedCount} failed`);
        await fetchDevices();
      }
    } catch (error) {
      console.error('Error updating firmware:', error);
      toast.error('Failed to update firmware');
    }
  };

  const filteredDevices = devices.filter(device => {
    if (filterStatus !== 'all' && device.status !== filterStatus) return false;
    if (filterDeviceType !== 'all' && device.deviceType !== filterDeviceType) return false;
    if (searchQuery && 
        !device.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !device.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !device.ownerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, { variant: 'success' | 'danger' | 'warning' | 'info'; dot: string }> = {
      active: { variant: 'success', dot: 'bg-emerald-500' },
      inactive: { variant: 'warning', dot: 'bg-amber-500' },
      offline: { variant: 'danger', dot: 'bg-red-500' },
      maintenance: { variant: 'info', dot: 'bg-blue-500' },
    };
    return colors[status] || colors.active;
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return 'text-emerald-500';
    if (level > 30) return 'text-amber-500';
    return 'text-red-500';
  };

  const getSignalColor = (strength: number) => {
    if (strength > 70) return 'text-emerald-500';
    if (strength > 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDeviceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      watch_pro: 'Watch Pro',
      watch_lite: 'Watch Lite',
      tracker: 'Tracker',
    };
    return labels[type] || type;
  };

  const getDeviceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      watch_pro: 'bg-gradient-to-br from-red-500 to-pink-600',
      watch_lite: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      tracker: 'bg-gradient-to-br from-purple-500 to-indigo-600',
    };
    return colors[type] || 'bg-gray-500';
  };

  const stats = {
    total: devices.length,
    active: devices.filter(d => d.status === 'active').length,
    offline: devices.filter(d => d.status === 'offline').length,
    lowBattery: devices.filter(d => d.batteryLevel < 30).length,
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Device Management" subtitle="Manage and monitor all devices">
        <div className="flex items-center justify-center h-64">
          <p className="text-[var(--text-muted)]">Loading devices...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Device Management" subtitle="Manage and monitor all devices">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">Total Devices</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">Offline</p>
          <p className="text-2xl font-bold text-red-400">{stats.offline}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">Low Battery</p>
          <p className="text-2xl font-bold text-amber-400">{stats.lowBattery}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'offline', label: 'Offline' },
            { value: 'maintenance', label: 'Maintenance' },
          ]}
          value={filterStatus}
          onChange={(val) => setFilterStatus(val)}
        />
        <Select
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'watch_pro', label: 'Watch Pro' },
            { value: 'watch_lite', label: 'Watch Lite' },
            { value: 'tracker', label: 'Tracker' },
          ]}
          value={filterDeviceType}
          onChange={(val) => setFilterDeviceType(val)}
        />
        <Button onClick={handleFirmwareUpdate} variant="primary">
          <Cog6ToothIcon className="w-4 h-4 mr-2" />
          Firmware Update
        </Button>
      </div>

      {/* Devices Table - Redesigned */}
      <Card className="overflow-hidden border border-[var(--border-color)] shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[var(--primary-500)]/15 via-[var(--primary-500)]/10 to-[var(--primary-500)]/5 border-b-2 border-[var(--primary-500)]/30">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Device</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Owner</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Location</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Battery</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Signal</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Firmware</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-primary)]">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[var(--text-muted)]">
                    No devices found
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => {
                  const statusColor = getStatusColor(device.status);
                  const isEditing = editingField?.deviceId === device.id;
                  const isEditingField = (field: string) => isEditing && editingField?.field === field;

                  return (
                    <tr key={device.id} className="hover:bg-[var(--bg-secondary)]/60 transition-all duration-200 group border-b border-[var(--border-color)]/50">
                      {/* Device Column - Non-editable */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {/* Watch Icon - No Background */}
                          <BsSmartwatch className="w-5 h-5 text-[var(--primary-500)] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                              {device.deviceName}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] font-mono truncate">{device.deviceId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Owner Column - Non-editable */}
                      <td className="px-3 py-2">
                        <p className="font-semibold text-sm text-[var(--text-primary)]">
                          {device.ownerName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          +{device.familyMembers.length} family member{device.familyMembers.length !== 1 ? 's' : ''}
                        </p>
                      </td>

                      {/* Location Column - Non-editable */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-[var(--text-primary)] truncate">
                              {device.location.city}, {device.location.state}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Battery Column - Non-editable */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {device.batteryLevel > 75 ? (
                            <BsBatteryFull className={`w-4 h-4 ${getBatteryColor(device.batteryLevel)}`} />
                          ) : device.batteryLevel > 30 ? (
                            <BsBatteryHalf className={`w-4 h-4 ${getBatteryColor(device.batteryLevel)}`} />
                          ) : (
                            <BsBattery className={`w-4 h-4 ${getBatteryColor(device.batteryLevel)}`} />
                          )}
                          <span className={`font-semibold text-xs ${getBatteryColor(device.batteryLevel)}`}>
                            {device.batteryLevel}%
                          </span>
                        </div>
                      </td>

                      {/* Signal Column - Non-editable */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <BsSignal className={`w-4 h-4 ${getSignalColor(device.signalStrength)}`} />
                          <span className={`font-semibold text-xs ${getSignalColor(device.signalStrength)}`}>
                            {device.signalStrength}%
                          </span>
                        </div>
                      </td>

                      {/* Firmware Column - Editable */}
                      <td className="px-3 py-2">
                        {isEditingField('firmwareVersion') ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleInlineSave(device)}
                              className="p-1"
                            >
                              <CheckIcon className="w-4 h-4 text-emerald-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleInlineCancel}
                              className="p-1"
                            >
                              <XMarkIcon className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <div className="group/firmware">
                            <div 
                              className="font-semibold text-[var(--text-primary)] cursor-pointer hover:text-[var(--primary-500)] transition-colors flex items-center gap-2"
                              onClick={() => handleInlineEdit(device, 'firmwareVersion', device.firmwareVersion)}
                              title="Click to edit"
                            >
                              <span>{device.firmwareVersion}</span>
                              <PencilIcon className="w-3 h-3 opacity-0 group-hover/firmware:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatTimeAgo(device.lastSynced)}</p>
                          </div>
                        )}
                      </td>

                      {/* Status Column - Editable */}
                      <td className="px-3 py-2">
                        {isEditingField('status') ? (
                          <div className="flex items-center gap-2">
                            <Select
                              options={[
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'offline', label: 'Offline' },
                                { value: 'maintenance', label: 'Maintenance' },
                              ]}
                              value={editValue}
                              onChange={(val) => {
                                setEditValue(val);
                                handleInlineSave(device);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleInlineCancel}
                              className="p-1"
                            >
                              <XMarkIcon className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <Badge 
                            variant={statusColor.variant}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleInlineEdit(device, 'status', device.status)}
                            title="Click to edit"
                          >
                            {device.status}
                          </Badge>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(device)}
                            title="View Details"
                            className="hover:bg-[var(--primary-500)]/10 hover:text-[var(--primary-500)]"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(device.id)}
                            title="Delete Device"
                            className="hover:bg-red-500/10 hover:text-red-500"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Device Detail Modal */}
      {selectedDevice && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedDevice(null);
            if (mapRef.current) {
              mapRef.current.remove();
              mapRef.current = null;
              markerRef.current = null;
            }
          }}
          title={`${selectedDevice.deviceName} - ${selectedDevice.deviceId}`}
          subtitle={`Registered to ${selectedDevice.ownerName} on ${new Date(selectedDevice.registeredDate).toLocaleDateString()}`}
          size="lg"
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'text-[var(--primary-500)] border-b-2 border-[var(--primary-500)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('family')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'family'
                  ? 'text-[var(--primary-500)] border-b-2 border-[var(--primary-500)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Family Members
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'location'
                  ? 'text-[var(--primary-500)] border-b-2 border-[var(--primary-500)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Location
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className={`w-6 h-6 ${getBatteryColor(selectedDevice.batteryLevel)}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15.67 4H14V2c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
                    </svg>
                    <span className="text-sm text-[var(--text-muted)]">Battery Level</span>
                  </div>
                  <p className={`text-3xl font-bold ${getBatteryColor(selectedDevice.batteryLevel)}`}>
                    {selectedDevice.batteryLevel}%
                  </p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className={`w-6 h-6 ${getSignalColor(selectedDevice.signalStrength)}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                    </svg>
                    <span className="text-sm text-[var(--text-muted)]">Signal Strength</span>
                  </div>
                  <p className={`text-3xl font-bold ${getSignalColor(selectedDevice.signalStrength)}`}>
                    {selectedDevice.signalStrength}%
                  </p>
                </Card>
              </div>

              {/* Device Features */}
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Device Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(selectedDevice.features).map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center gap-2">
                      {enabled ? (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="text-sm text-[var(--text-primary)] capitalize">
                        {feature.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Firmware Version */}
              <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Cog6ToothIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Firmware Version</p>
                    <p className="text-xs text-[var(--text-muted)]">Last synced: {formatTimeAgo(selectedDevice.lastSynced)}</p>
                  </div>
                </div>
                <Badge variant="info">{selectedDevice.firmwareVersion}</Badge>
              </div>
            </div>
          )}

          {activeTab === 'family' && (
            <div className="space-y-6">
              {/* Primary Owner */}
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Primary Owner</h3>
                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--primary-500)] flex items-center justify-center text-white font-semibold">
                      {getInitials(selectedDevice.primaryOwner.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedDevice.primaryOwner.name}</p>
                      <p className="text-sm text-[var(--text-muted)]">{selectedDevice.primaryOwner.role}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Family Members */}
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">
                  Family Members ({selectedDevice.familyMembers.length})
                </h3>
                <div className="space-y-3">
                  {selectedDevice.familyMembers.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">No family members added</p>
                  ) : (
                    selectedDevice.familyMembers.map((member, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{member.name}</p>
                            <p className="text-sm text-[var(--text-muted)]">{member.role}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-4">
              {/* Current Location Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPinIcon className="w-5 h-5 text-[var(--primary-500)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">Current Location</h3>
                </div>
                <Card className="p-4">
                  <p className="text-[var(--text-primary)] mb-2">
                    {selectedDevice.location.address}, {selectedDevice.location.city}, {selectedDevice.location.state} {selectedDevice.location.zipCode}
                  </p>
                  <div className="text-sm text-[var(--text-muted)] space-y-1">
                    <p>Latitude: {selectedDevice.location.coordinates.lat}</p>
                    <p>Longitude: {selectedDevice.location.coordinates.lng}</p>
                  </div>
                </Card>
              </div>

              {/* Interactive Map */}
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Interactive Map</h3>
                <div 
                  ref={mapContainerRef}
                  className="w-full h-96 rounded-lg border border-[var(--border)]"
                  style={{ minHeight: '400px' }}
                />
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Firmware Update Modal - Bulk Update by Model */}
      <Modal
        isOpen={isFirmwareModalOpen}
        onClose={() => {
          setIsFirmwareModalOpen(false);
          setFirmwareFormData({ targetType: 'all', firmwareVersion: '2.5.0' });
        }}
        title="Firmware Update"
        subtitle="Push firmware updates to all devices or specific models"
        size="md"
      >
        <form onSubmit={handleFirmwareUpdateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Target Devices
            </label>
            <Select
              options={[
                { value: 'all', label: `All Devices (${devices.length})` },
                { value: 'watch_pro', label: `Watch Pro (${devices.filter(d => d.deviceType === 'watch_pro').length})` },
                { value: 'watch_lite', label: `Watch Lite (${devices.filter(d => d.deviceType === 'watch_lite').length})` },
                { value: 'tracker', label: `Tracker (${devices.filter(d => d.deviceType === 'tracker').length})` },
              ]}
              value={firmwareFormData.targetType}
              onChange={(val) => setFirmwareFormData(prev => ({ ...prev, targetType: val }))}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {firmwareFormData.targetType === 'all' 
                ? `This will update all ${devices.length} devices`
                : `This will update all ${getDeviceTypeLabel(firmwareFormData.targetType)} devices (${devices.filter(d => d.deviceType === firmwareFormData.targetType).length})`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              New Firmware Version
            </label>
            <Input
              placeholder="2.5.0"
              value={firmwareFormData.firmwareVersion}
              onChange={(e) => setFirmwareFormData(prev => ({ ...prev, firmwareVersion: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Firmware File
            </label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm">
                <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                Choose file
              </Button>
              <span className="text-sm text-[var(--text-muted)]">No file chosen</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
              Update Features
            </label>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Enhanced GPS Accuracy</p>
                  <p className="text-sm text-[var(--text-muted)]">Improved location tracking precision</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Battery Optimization</p>
                  <p className="text-sm text-[var(--text-muted)]">Extended battery life up to 15%</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Security Patches</p>
                  <p className="text-sm text-[var(--text-muted)]">Critical security updates included</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsFirmwareModalOpen(false);
                setFirmwareFormData({ targetType: 'all', firmwareVersion: '2.5.0' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              Push Update
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
