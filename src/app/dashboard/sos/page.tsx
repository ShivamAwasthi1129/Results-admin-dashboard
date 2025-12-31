'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Modal, Input, Select, Table } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import Image from 'next/image';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BellAlertIcon,
  PhoneIcon,
  MapPinIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DevicePhoneMobileIcon,
  HeartIcon,
  SignalIcon,
  BoltIcon,
  PlusIcon,
  CameraIcon,
  EyeIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface WearableDevice {
  id: string;
  type: 'smartwatch' | 'fitness_tracker' | 'medical_alert' | 'gps_tracker';
  brand: string;
  model: string;
  batteryLevel: number;
  lastSync: string;
  isOnline: boolean;
  heartRate?: number;
  steps?: number;
  location?: { lat: number; lng: number };
}

interface SOSAlert {
  id: string;
  name: string;
  phone: string;
  email: string;
  photo?: string;
  location: { lat: number; lng: number; address: string; city: string; state: string; zipcode: string };
  lastKnownLocation?: { lat: number; lng: number; address: string; timestamp: string };
  type: 'medical' | 'rescue' | 'evacuation' | 'food_water' | 'shelter' | 'fire' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'cancelled';
  message: string;
  createdAt: string;
  assignedTo?: string;
  peopleCount?: number;
  wearableDevice?: WearableDevice;
  medicalInfo?: {
    bloodType?: string;
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    emergencyContact?: { name: string; phone: string; relation: string };
  };
}

interface ResponseTeam {
  id: string;
  name: string;
  type: string;
  members: number;
  location: string;
  status: 'available' | 'busy' | 'on_mission';
}

export default function SOSPage() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  
  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Mock response teams
  const responseTeams: ResponseTeam[] = [
    { id: '1', name: 'Medical Team Alpha - Houston', type: 'Medical', members: 8, location: 'Houston, TX', status: 'available' },
    { id: '2', name: 'FEMA Response Unit B', type: 'Rescue', members: 12, location: 'Oklahoma City, OK', status: 'available' },
    { id: '3', name: 'Red Cross Supply Unit', type: 'Supply', members: 6, location: 'New Orleans, LA', status: 'available' },
    { id: '4', name: 'Fire Rescue Team Delta', type: 'Fire', members: 10, location: 'Los Angeles, CA', status: 'available' },
    { id: '5', name: 'Emergency Medical Services', type: 'Medical', members: 15, location: 'Miami, FL', status: 'available' },
    { id: '6', name: 'Search & Rescue Unit', type: 'Rescue', members: 20, location: 'National', status: 'busy' },
  ];

  // Form data for adding new SOS alert
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    photo: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    type: 'rescue',
    priority: 'high',
    message: '',
    peopleCount: 1,
    wearableDeviceId: '',
    wearableType: '',
    bloodType: '',
    allergies: '',
    medications: '',
    conditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });

  // Mock data for SOS alerts - USA based
  useEffect(() => {
    const mockAlerts: SOSAlert[] = [
      {
        id: '1',
        name: 'John Smith',
        phone: '+1 (305) 555-0123',
        email: 'john.smith@email.com',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        location: { lat: 25.7617, lng: -80.1918, address: '123 Ocean Drive', city: 'Miami', state: 'FL', zipcode: '33139' },
        lastKnownLocation: { lat: 25.7620, lng: -80.1915, address: 'Near South Beach', timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
        type: 'rescue',
        priority: 'critical',
        status: 'pending',
        message: 'Stuck on rooftop due to flash flooding. Family of 4 needs immediate rescue. Water rising rapidly.',
        createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
        peopleCount: 4,
        wearableDevice: {
          id: 'WD-001',
          type: 'smartwatch',
          brand: 'Apple',
          model: 'Apple Watch Ultra 2',
          batteryLevel: 78,
          lastSync: new Date(Date.now() - 2 * 60000).toISOString(),
          isOnline: true,
          heartRate: 92,
          steps: 3245,
          location: { lat: 25.7620, lng: -80.1915 },
        },
        medicalInfo: {
          bloodType: 'A+',
          allergies: ['Penicillin'],
          medications: ['Lisinopril'],
          conditions: ['Hypertension'],
          emergencyContact: { name: 'Mary Smith', phone: '+1 (305) 555-0124', relation: 'Wife' },
        },
      },
      {
        id: '2',
        name: 'Emily Johnson',
        phone: '+1 (713) 555-0456',
        email: 'emily.j@email.com',
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
        location: { lat: 29.7604, lng: -95.3698, address: '456 Main Street', city: 'Houston', state: 'TX', zipcode: '77002' },
        type: 'medical',
        priority: 'high',
        status: 'assigned',
        message: 'Elderly parent needs medical attention. Diabetic patient without insulin for 2 days.',
        createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
        assignedTo: 'Medical Team Alpha - Houston',
        peopleCount: 1,
        wearableDevice: {
          id: 'WD-002',
          type: 'medical_alert',
          brand: 'Medical Guardian',
          model: 'Freedom Alert',
          batteryLevel: 45,
          lastSync: new Date(Date.now() - 10 * 60000).toISOString(),
          isOnline: true,
          heartRate: 68,
        },
        medicalInfo: {
          bloodType: 'O-',
          allergies: ['Aspirin', 'Sulfa drugs'],
          medications: ['Insulin', 'Metformin'],
          conditions: ['Type 2 Diabetes', 'Heart Disease'],
          emergencyContact: { name: 'Michael Johnson', phone: '+1 (713) 555-0457', relation: 'Son' },
        },
      },
      {
        id: '3',
        name: 'Robert Williams',
        phone: '+1 (405) 555-0789',
        email: 'rwilliams@email.com',
        photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        location: { lat: 35.4676, lng: -97.5164, address: '789 Tornado Alley Rd', city: 'Oklahoma City', state: 'OK', zipcode: '73102' },
        type: 'evacuation',
        priority: 'critical',
        status: 'in_progress',
        message: 'Tornado damaged our building. 30 families need immediate evacuation. Some injuries reported.',
        createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
        assignedTo: 'FEMA Response Unit B',
        peopleCount: 120,
        wearableDevice: {
          id: 'WD-003',
          type: 'gps_tracker',
          brand: 'Garmin',
          model: 'inReach Mini 2',
          batteryLevel: 90,
          lastSync: new Date(Date.now() - 1 * 60000).toISOString(),
          isOnline: true,
          location: { lat: 35.4676, lng: -97.5164 },
        },
      },
      {
        id: '4',
        name: 'Sarah Davis',
        phone: '+1 (310) 555-0321',
        email: 'sarah.d@email.com',
        photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        location: { lat: 34.0522, lng: -118.2437, address: '1234 Hillside Ave', city: 'Los Angeles', state: 'CA', zipcode: '90028' },
        type: 'fire',
        priority: 'high',
        status: 'pending',
        message: 'Wildfire approaching neighborhood. Need help evacuating elderly neighbors who cannot drive.',
        createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
        peopleCount: 8,
        wearableDevice: {
          id: 'WD-004',
          type: 'fitness_tracker',
          brand: 'Fitbit',
          model: 'Charge 6',
          batteryLevel: 62,
          lastSync: new Date(Date.now() - 15 * 60000).toISOString(),
          isOnline: true,
          heartRate: 110,
          steps: 8750,
        },
      },
      {
        id: '5',
        name: 'James Brown',
        phone: '+1 (504) 555-0654',
        email: 'jbrown@email.com',
        location: { lat: 29.9511, lng: -90.0715, address: '567 French Quarter Blvd', city: 'New Orleans', state: 'LA', zipcode: '70112' },
        type: 'food_water',
        priority: 'medium',
        status: 'resolved',
        message: 'Relief camp running low on clean water. 200+ people affected. Water supplies contaminated.',
        createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
        assignedTo: 'Red Cross Supply Unit',
        peopleCount: 200,
      },
    ];

    setTimeout(() => {
      setAlerts(mockAlerts);
      setIsLoading(false);
    }, 500);
  }, []);

  // Initialize map when map modal opens
  useEffect(() => {
    if (isMapModalOpen && selectedAlert && mapContainerRef.current && !mapRef.current) {
      const { lat, lng } = selectedAlert.location;
      
      mapRef.current = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Create custom SOS icon
      const sosIcon = L.divIcon({
        className: 'custom-sos-marker',
        html: `<div style="
          width: 50px;
          height: 50px;
          background: #ef4444;
          border-radius: 50%;
          border: 4px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
          animation: pulse 2s infinite;
        ">
          <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>`,
        iconSize: [50, 50],
        iconAnchor: [25, 50],
      });

      markerRef.current = L.marker([lat, lng], { icon: sosIcon }).addTo(mapRef.current);
      
      // Add popup with alert info
      markerRef.current.bindPopup(`
        <div style="padding: 8px;">
          <strong>${selectedAlert.name}</strong><br/>
          ${selectedAlert.location.address}<br/>
          ${selectedAlert.location.city}, ${selectedAlert.location.state}
        </div>
      `).openPopup();

      // Add last known location marker if available
      if (selectedAlert.lastKnownLocation) {
        const lastKnownIcon = L.divIcon({
          className: 'custom-last-known-marker',
          html: `<div style="
            width: 40px;
            height: 40px;
            background: #3b82f6;
            border-radius: 50%;
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
          ">
            <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });

        L.marker([selectedAlert.lastKnownLocation.lat, selectedAlert.lastKnownLocation.lng], { icon: lastKnownIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="padding: 8px;">
              <strong>Last Known Location</strong><br/>
              ${selectedAlert.lastKnownLocation.address}<br/>
              Updated: ${getTimeSince(selectedAlert.lastKnownLocation.timestamp)}
            </div>
          `);
      }
    }

    return () => {
      if (mapRef.current && !isMapModalOpen) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isMapModalOpen, selectedAlert]);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactElement> = {
      medical: <HeartIcon className="w-4 h-4" />,
      rescue: <BellAlertIcon className="w-4 h-4" />,
      evacuation: <MapPinIcon className="w-4 h-4" />,
      food_water: <CubeIcon className="w-4 h-4" />,
      shelter: <HomeModernIcon className="w-4 h-4" />,
      fire: <BoltIcon className="w-4 h-4" />,
      other: <PhoneIcon className="w-4 h-4" />,
    };
    return icons[type] || icons.other;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return colors[priority] || colors.medium;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'danger' | 'warning' | 'info' | 'success' | 'primary'> = {
      pending: 'danger',
      assigned: 'warning',
      in_progress: 'info',
      resolved: 'success',
      cancelled: 'primary',
    };
    return variants[status] || 'info';
  };

  const getTimeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleStatusChange = (alertId: string, newStatus: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status: newStatus as SOSAlert['status'] } : alert
    ));
    toast.success(`Alert status updated to ${newStatus.replace('_', ' ')}`);
  };

  const handleAssignTeam = (alert: SOSAlert) => {
    setSelectedAlert(alert);
    setSelectedTeam(alert.assignedTo || '');
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssign = () => {
    if (!selectedTeam) {
      toast.error('Please select a response team');
      return;
    }

    const team = responseTeams.find(t => t.id === selectedTeam);
    if (!team) {
      toast.error('Selected team not found');
      return;
    }

    if (selectedAlert) {
      setAlerts(prev => prev.map(alert => 
        alert.id === selectedAlert.id 
          ? { ...alert, status: 'assigned' as SOSAlert['status'], assignedTo: team.name }
          : alert
      ));
      toast.success(`Alert assigned to ${team.name}`);
      setIsAssignModalOpen(false);
      setSelectedTeam('');
    }
  };

  const handleViewOnMap = (alert: SOSAlert) => {
    setSelectedAlert(alert);
    setIsMapModalOpen(true);
  };

  const handleViewDetails = (alert: SOSAlert) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  };

  const handleAddAlert = () => {
    const newAlert: SOSAlert = {
      id: Date.now().toString(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      photo: formData.photo,
      location: {
        lat: 0,
        lng: 0,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipcode,
      },
      type: formData.type as SOSAlert['type'],
      priority: formData.priority as SOSAlert['priority'],
      status: 'pending',
      message: formData.message,
      createdAt: new Date().toISOString(),
      peopleCount: formData.peopleCount,
      wearableDevice: formData.wearableDeviceId ? {
        id: formData.wearableDeviceId,
        type: formData.wearableType as WearableDevice['type'],
        brand: 'Unknown',
        model: 'Unknown',
        batteryLevel: 100,
        lastSync: new Date().toISOString(),
        isOnline: true,
      } : undefined,
      medicalInfo: {
        bloodType: formData.bloodType,
        allergies: formData.allergies.split(',').map(s => s.trim()).filter(Boolean),
        medications: formData.medications.split(',').map(s => s.trim()).filter(Boolean),
        conditions: formData.conditions.split(',').map(s => s.trim()).filter(Boolean),
        emergencyContact: formData.emergencyContactName ? {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relation: formData.emergencyContactRelation,
        } : undefined,
      },
    };

    setAlerts(prev => [newAlert, ...prev]);
    setIsAddModalOpen(false);
    setFormData({
      name: '', phone: '', email: '', photo: '', address: '', city: '', state: '', zipcode: '',
      type: 'rescue', priority: 'high', message: '', peopleCount: 1, wearableDeviceId: '',
      wearableType: '', bloodType: '', allergies: '', medications: '', conditions: '',
      emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
    });
    toast.success('SOS Alert created successfully');
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter !== 'all' && alert.status !== filter) return false;
    if (searchQuery && !alert.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !alert.location.address.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !alert.location.city.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.priority === 'critical').length,
    pending: alerts.filter(a => a.status === 'pending').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Person',
      render: (alert: SOSAlert) => (
        <div className="flex items-center gap-3">
          {alert.photo ? (
            <Image
              src={alert.photo}
              alt={alert.name}
              width={40}
              height={40}
              className="rounded-lg object-cover"
              unoptimized
            />
          ) : (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPriorityColor(alert.priority)}`}>
              <UserIcon className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              {alert.name}
              {alert.priority === 'critical' && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded animate-pulse">
                  URGENT
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
              <PhoneIcon className="w-3 h-3" />
              {alert.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (alert: SOSAlert) => (
        <div>
          <div className="font-medium text-[var(--text-primary)] flex items-center gap-1">
            <MapPinIcon className="w-4 h-4 text-[var(--text-muted)]" />
            {alert.location.city}, {alert.location.state}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">{alert.location.address}</div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (alert: SOSAlert) => (
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded-lg ${getPriorityColor(alert.priority)}`}>
            {getTypeIcon(alert.type)}
          </span>
          <span className="text-sm text-[var(--text-primary)] capitalize">
            {alert.type.replace('_', ' ')}
          </span>
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (alert: SOSAlert) => (
        <Badge 
          variant={alert.priority === 'critical' ? 'danger' : alert.priority === 'high' ? 'warning' : 'info'} 
          size="sm"
        >
          {alert.priority.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (alert: SOSAlert) => (
        <Badge variant={getStatusBadge(alert.status)} size="sm">
          {alert.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'peopleCount',
      label: 'People',
      render: (alert: SOSAlert) => (
        <div className="flex items-center gap-1 text-sm text-[var(--text-primary)]">
          <UserIcon className="w-4 h-4 text-[var(--text-muted)]" />
          {alert.peopleCount || 1}
        </div>
      ),
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      render: (alert: SOSAlert) => (
        <div className="text-sm">
          {alert.assignedTo ? (
            <div className="flex items-center gap-1 text-emerald-400">
              <CheckCircleIcon className="w-4 h-4" />
              <span className="truncate max-w-[150px]">{alert.assignedTo}</span>
            </div>
          ) : (
            <span className="text-[var(--text-muted)]">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Time',
      render: (alert: SOSAlert) => (
        <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
          <ClockIcon className="w-4 h-4" />
          {getTimeSince(alert.createdAt)}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (alert: SOSAlert) => (
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<EyeIcon className="w-4 h-4" />}
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(alert);
            }}
          >
            View
          </Button>
          {alert.status === 'pending' && (
            <Button
              variant="gradient"
              size="sm"
              leftIcon={<UserGroupIcon className="w-4 h-4" />}
              onClick={(e) => {
                e.stopPropagation();
                handleAssignTeam(alert);
              }}
            >
              Assign
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<MapPinIcon className="w-4 h-4" />}
            onClick={(e) => {
              e.stopPropagation();
              handleViewOnMap(alert);
            }}
          >
            Map
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="SOS Alerts - USA" subtitle="Emergency distress signals and rescue requests across United States">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-l-4 border-l-[var(--primary-500)] bg-gradient-to-r from-[var(--bg-card)] to-red-500/5">
          <p className="text-sm text-[var(--text-muted)] mb-1">Total Alerts</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.total}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500 bg-gradient-to-r from-[var(--bg-card)] to-red-500/5">
          <p className="text-sm text-[var(--text-muted)] mb-1">Critical</p>
          <p className="text-3xl font-bold text-red-400">{stats.critical}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500 bg-gradient-to-r from-[var(--bg-card)] to-orange-500/5">
          <p className="text-sm text-[var(--text-muted)] mb-1">Pending</p>
          <p className="text-3xl font-bold text-orange-400">{stats.pending}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500 bg-gradient-to-r from-[var(--bg-card)] to-emerald-500/5">
          <p className="text-sm text-[var(--text-muted)] mb-1">Resolved</p>
          <p className="text-3xl font-bold text-emerald-400">{stats.resolved}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            placeholder="Search by name, city, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'assigned', label: 'Assigned' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'resolved', label: 'Resolved' },
          ]}
          value={filter}
          onChange={setFilter}
          icon={<FunnelIcon className="w-5 h-5" />}
        />
        <Button variant="secondary" leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
          Refresh
        </Button>
        <Button variant="gradient" leftIcon={<PlusIcon className="w-4 h-4" />} onClick={() => setIsAddModalOpen(true)}>
          New Alert
        </Button>
      </div>

      {/* Alerts Table */}
      <Table
        columns={columns}
        data={filteredAlerts}
        isLoading={isLoading}
        emptyMessage="No SOS alerts found"
        rowKey="id"
        onRowClick={(alert) => handleViewDetails(alert)}
        compact
      />

      {/* Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="SOS Alert Details"
        size="xl"
      >
        {selectedAlert && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              {selectedAlert.photo ? (
                <Image
                  src={selectedAlert.photo}
                  alt={selectedAlert.name}
                  width={80}
                  height={80}
                  className="rounded-xl object-cover"
                  unoptimized
                />
              ) : (
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center ${getPriorityColor(selectedAlert.priority)}`}>
                  <UserIcon className="w-10 h-10" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedAlert.name}</h3>
                <p className="text-[var(--text-muted)]">{selectedAlert.phone}</p>
                <p className="text-sm text-[var(--text-muted)]">{selectedAlert.email}</p>
              </div>
              <Badge variant={getStatusBadge(selectedAlert.status)} size="lg">
                {selectedAlert.status.replace('_', ' ')}
              </Badge>
            </div>

            {/* Message */}
            <div className="p-4 rounded-xl bg-[var(--bg-input)]">
              <p className="text-[var(--text-secondary)]">{selectedAlert.message}</p>
            </div>

            {/* Location & Device Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4" /> Current Location
                </p>
                <p className="font-semibold text-[var(--text-primary)]">{selectedAlert.location.address}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedAlert.location.city}, {selectedAlert.location.state} {selectedAlert.location.zipcode}
                </p>
              </div>
              {selectedAlert.lastKnownLocation && (
                <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                  <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
                    <SignalIcon className="w-4 h-4" /> Last Known Location
                  </p>
                  <p className="font-semibold text-[var(--text-primary)]">{selectedAlert.lastKnownLocation.address}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Updated: {getTimeSince(selectedAlert.lastKnownLocation.timestamp)}
                  </p>
                </div>
              )}
            </div>

            {/* Wearable Device Info */}
            {selectedAlert.wearableDevice && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <DevicePhoneMobileIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {selectedAlert.wearableDevice.brand} {selectedAlert.wearableDevice.model}
                      </p>
                      <p className="text-sm text-[var(--text-muted)]">ID: {selectedAlert.wearableDevice.id}</p>
                    </div>
                  </div>
                  <Badge variant={selectedAlert.wearableDevice.isOnline ? 'success' : 'danger'}>
                    {selectedAlert.wearableDevice.isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-[var(--bg-card)]">
                    <p className="text-2xl font-bold text-emerald-400">{selectedAlert.wearableDevice.batteryLevel}%</p>
                    <p className="text-xs text-[var(--text-muted)]">Battery</p>
                  </div>
                  {selectedAlert.wearableDevice.heartRate && (
                    <div className="text-center p-3 rounded-lg bg-[var(--bg-card)]">
                      <p className="text-2xl font-bold text-pink-400">{selectedAlert.wearableDevice.heartRate}</p>
                      <p className="text-xs text-[var(--text-muted)]">Heart Rate</p>
                    </div>
                  )}
                  {selectedAlert.wearableDevice.steps && (
                    <div className="text-center p-3 rounded-lg bg-[var(--bg-card)]">
                      <p className="text-2xl font-bold text-blue-400">{selectedAlert.wearableDevice.steps}</p>
                      <p className="text-xs text-[var(--text-muted)]">Steps Today</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Medical Info */}
            {selectedAlert.medicalInfo && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-red-500/10 border border-pink-500/30">
                <p className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <HeartIcon className="w-5 h-5 text-pink-400" /> Medical Information
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {selectedAlert.medicalInfo.bloodType && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Blood Type</p>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedAlert.medicalInfo.bloodType}</p>
                    </div>
                  )}
                  {selectedAlert.medicalInfo.allergies && selectedAlert.medicalInfo.allergies.length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Allergies</p>
                      <p className="font-semibold text-red-400">{selectedAlert.medicalInfo.allergies.join(', ')}</p>
                    </div>
                  )}
                  {selectedAlert.medicalInfo.medications && selectedAlert.medicalInfo.medications.length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Medications</p>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedAlert.medicalInfo.medications.join(', ')}</p>
                    </div>
                  )}
                  {selectedAlert.medicalInfo.conditions && selectedAlert.medicalInfo.conditions.length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Medical Conditions</p>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedAlert.medicalInfo.conditions.join(', ')}</p>
                    </div>
                  )}
                </div>
                {selectedAlert.medicalInfo.emergencyContact && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Emergency Contact</p>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {selectedAlert.medicalInfo.emergencyContact.name} ({selectedAlert.medicalInfo.emergencyContact.relation})
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">{selectedAlert.medicalInfo.emergencyContact.phone}</p>
                  </div>
                )}
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Priority</p>
                <p className="font-semibold text-[var(--text-primary)] capitalize">{selectedAlert.priority}</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Type</p>
                <p className="font-semibold text-[var(--text-primary)] capitalize">{selectedAlert.type.replace('_', ' ')}</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">People Affected</p>
                <p className="font-semibold text-[var(--text-primary)]">{selectedAlert.peopleCount}</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Received</p>
                <p className="font-semibold text-[var(--text-primary)]">{getTimeSince(selectedAlert.createdAt)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {selectedAlert.status === 'pending' && (
                <Button 
                  variant="gradient" 
                  className="flex-1"
                  leftIcon={<UserGroupIcon className="w-4 h-4" />}
                  onClick={() => {
                    setIsModalOpen(false);
                    handleAssignTeam(selectedAlert);
                  }}
                >
                  Assign Response Team
                </Button>
              )}
              <Button 
                variant="primary" 
                className="flex-1"
                leftIcon={<MapPinIcon className="w-4 h-4" />}
                onClick={() => {
                  setIsModalOpen(false);
                  handleViewOnMap(selectedAlert);
                }}
              >
                View on Map
              </Button>
              <Button 
                variant="secondary" 
                className="flex-1"
                leftIcon={<PhoneIcon className="w-4 h-4" />}
                onClick={() => {
                  window.open(`tel:${selectedAlert.phone}`, '_self');
                }}
              >
                Contact Person
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Team Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedTeam('');
        }}
        title="Assign Response Team"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Select a response team to assign to this SOS alert
          </p>
          
          <Select
            label="Response Team"
            options={[
              { value: '', label: 'Select a team...' },
              ...responseTeams
                .filter(team => team.status === 'available')
                .map(team => ({
                  value: team.id,
                  label: `${team.name} (${team.type} - ${team.members} members)`,
                }))
            ]}
            value={selectedTeam}
            onChange={setSelectedTeam}
          />

          {selectedTeam && (
            <div className="p-4 rounded-xl bg-[var(--bg-input)]">
              {(() => {
                const team = responseTeams.find(t => t.id === selectedTeam);
                return team ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">Team Name:</span>
                      <span className="font-semibold text-[var(--text-primary)]">{team.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">Type:</span>
                      <span className="text-[var(--text-primary)]">{team.type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">Members:</span>
                      <span className="text-[var(--text-primary)]">{team.members}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">Location:</span>
                      <span className="text-[var(--text-primary)]">{team.location}</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              variant="secondary" 
              className="flex-1" 
              onClick={() => {
                setIsAssignModalOpen(false);
                setSelectedTeam('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="gradient" 
              className="flex-1" 
              onClick={handleConfirmAssign}
              disabled={!selectedTeam}
            >
              Assign Team
            </Button>
          </div>
        </div>
      </Modal>

      {/* Map Modal */}
      <Modal
        isOpen={isMapModalOpen}
        onClose={() => {
          setIsMapModalOpen(false);
          if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            markerRef.current = null;
          }
        }}
        title="SOS Alert Location"
        size="xl"
      >
        {selectedAlert && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--bg-input)]">
              <div className="flex items-center gap-3 mb-2">
                {selectedAlert.photo ? (
                  <Image
                    src={selectedAlert.photo}
                    alt={selectedAlert.name}
                    width={48}
                    height={48}
                    className="rounded-lg object-cover"
                    unoptimized
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getPriorityColor(selectedAlert.priority)}`}>
                    <UserIcon className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{selectedAlert.name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{selectedAlert.location.address}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedAlert.location.city}, {selectedAlert.location.state} {selectedAlert.location.zipcode}
                  </p>
                </div>
              </div>
            </div>
            
            <div 
              ref={mapContainerRef} 
              className="w-full h-[500px] rounded-xl overflow-hidden border border-[var(--border-color)]"
              style={{ minHeight: '500px' }}
            />
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-[var(--text-muted)]">Current Location</span>
              </div>
              {selectedAlert.lastKnownLocation && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-[var(--text-muted)]">Last Known Location</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Alert Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New SOS Alert"
        size="xl"
      >
        <div className="space-y-6">
          {/* Personal Info */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Personal Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Smith"
              />
              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
              <Input
                label="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@email.com"
              />
              <Input
                label="Photo URL"
                value={formData.photo}
                onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Location</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
                className="col-span-2"
              />
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Miami"
              />
              <Input
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="FL"
              />
              <Input
                label="ZIP Code"
                value={formData.zipcode}
                onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                placeholder="33139"
              />
              <Input
                label="People Count"
                type="number"
                value={formData.peopleCount.toString()}
                onChange={(e) => setFormData({ ...formData, peopleCount: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Alert Details */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Alert Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Alert Type"
                options={[
                  { value: 'rescue', label: 'Rescue' },
                  { value: 'medical', label: 'Medical' },
                  { value: 'evacuation', label: 'Evacuation' },
                  { value: 'food_water', label: 'Food & Water' },
                  { value: 'shelter', label: 'Shelter' },
                  { value: 'fire', label: 'Fire' },
                  { value: 'other', label: 'Other' },
                ]}
                value={formData.type}
                onChange={(val) => setFormData({ ...formData, type: val })}
              />
              <Select
                label="Priority"
                options={[
                  { value: 'critical', label: 'Critical' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
                value={formData.priority}
                onChange={(val) => setFormData({ ...formData, priority: val })}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Emergency Message
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe the emergency situation..."
              />
            </div>
          </div>

          {/* Wearable Device */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Wearable Device (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Device ID"
                value={formData.wearableDeviceId}
                onChange={(e) => setFormData({ ...formData, wearableDeviceId: e.target.value })}
                placeholder="WD-001"
              />
              <Select
                label="Device Type"
                options={[
                  { value: '', label: 'Select Type' },
                  { value: 'smartwatch', label: 'Smart Watch' },
                  { value: 'fitness_tracker', label: 'Fitness Tracker' },
                  { value: 'medical_alert', label: 'Medical Alert' },
                  { value: 'gps_tracker', label: 'GPS Tracker' },
                ]}
                value={formData.wearableType}
                onChange={(val) => setFormData({ ...formData, wearableType: val })}
              />
            </div>
          </div>

          {/* Medical Info */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Medical Information (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Blood Type"
                value={formData.bloodType}
                onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                placeholder="A+, B-, O+, etc."
              />
              <Input
                label="Allergies (comma separated)"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="Penicillin, Peanuts"
              />
              <Input
                label="Medications (comma separated)"
                value={formData.medications}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                placeholder="Insulin, Aspirin"
              />
              <Input
                label="Conditions (comma separated)"
                value={formData.conditions}
                onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                placeholder="Diabetes, Heart Disease"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Emergency Contact (Optional)</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Contact Name"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                placeholder="Mary Smith"
              />
              <Input
                label="Contact Phone"
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                placeholder="+1 (555) 000-0001"
              />
              <Input
                label="Relation"
                value={formData.emergencyContactRelation}
                onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                placeholder="Wife, Son, etc."
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" className="flex-1" onClick={handleAddAlert}>
              Create SOS Alert
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

// Icon components
function CubeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function HomeModernIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
    </svg>
  );
}
