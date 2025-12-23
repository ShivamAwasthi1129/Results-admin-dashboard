'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Modal, Input, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  CubeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface Resource {
  id: string;
  name: string;
  category: 'medical' | 'food' | 'water' | 'shelter' | 'transport' | 'equipment' | 'clothing' | 'other';
  quantity: number;
  unit: string;
  location: string;
  status: 'available' | 'deployed' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
  assignedTo?: string;
  minThreshold: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)] shadow-xl">
        <p className="text-[var(--text-muted)] text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-[var(--text-primary)] font-semibold">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ResourcesPage() {
  const { token } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    category: 'medical',
    quantity: '',
    unit: '',
    location: '',
    minThreshold: '',
  });

  // Mock data
  useEffect(() => {
    const mockResources: Resource[] = [
      { id: '1', name: 'First Aid Kits', category: 'medical', quantity: 500, unit: 'kits', location: 'Central Warehouse', status: 'available', lastUpdated: new Date().toISOString(), minThreshold: 100 },
      { id: '2', name: 'Drinking Water', category: 'water', quantity: 10000, unit: 'liters', location: 'North Storage', status: 'available', lastUpdated: new Date().toISOString(), minThreshold: 2000 },
      { id: '3', name: 'Rice Packets', category: 'food', quantity: 2500, unit: 'kg', location: 'Central Warehouse', status: 'available', lastUpdated: new Date().toISOString(), minThreshold: 500 },
      { id: '4', name: 'Blankets', category: 'shelter', quantity: 150, unit: 'pieces', location: 'South Storage', status: 'low_stock', lastUpdated: new Date().toISOString(), minThreshold: 200 },
      { id: '5', name: 'Rescue Boats', category: 'transport', quantity: 25, unit: 'units', location: 'Harbor Station', status: 'deployed', lastUpdated: new Date().toISOString(), assignedTo: 'Flood Relief - Mumbai', minThreshold: 10 },
      { id: '6', name: 'Generators', category: 'equipment', quantity: 30, unit: 'units', location: 'East Depot', status: 'available', lastUpdated: new Date().toISOString(), minThreshold: 10 },
      { id: '7', name: 'Tents', category: 'shelter', quantity: 0, unit: 'pieces', location: 'Central Warehouse', status: 'out_of_stock', lastUpdated: new Date().toISOString(), minThreshold: 50 },
      { id: '8', name: 'Medicines (Basic)', category: 'medical', quantity: 1200, unit: 'units', location: 'Medical Center', status: 'available', lastUpdated: new Date().toISOString(), minThreshold: 300 },
      { id: '9', name: 'Ambulances', category: 'transport', quantity: 12, unit: 'vehicles', location: 'Medical Center', status: 'available', lastUpdated: new Date().toISOString(), minThreshold: 5 },
      { id: '10', name: 'Winter Clothing', category: 'clothing', quantity: 80, unit: 'sets', location: 'North Storage', status: 'low_stock', lastUpdated: new Date().toISOString(), minThreshold: 100 },
    ];

    setTimeout(() => {
      setResources(mockResources);
      setIsLoading(false);
    }, 500);
  }, []);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      medical: '🏥',
      food: '🍚',
      water: '💧',
      shelter: '🏕️',
      transport: '🚗',
      equipment: '🔧',
      clothing: '👕',
      other: '📦',
    };
    return icons[category] || '📦';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      medical: 'from-red-500 to-pink-500',
      food: 'from-orange-500 to-amber-500',
      water: 'from-blue-500 to-cyan-500',
      shelter: 'from-purple-500 to-pink-500',
      transport: 'from-green-500 to-emerald-500',
      equipment: 'from-gray-500 to-slate-500',
      clothing: 'from-indigo-500 to-violet-500',
      other: 'from-gray-500 to-zinc-500',
    };
    return colors[category] || colors.other;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
      available: 'success',
      deployed: 'info',
      low_stock: 'warning',
      out_of_stock: 'danger',
    };
    return variants[status] || 'info';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedResource) {
      setResources(prev => prev.map(r => 
        r.id === selectedResource.id 
          ? { ...r, ...formData, quantity: Number(formData.quantity), minThreshold: Number(formData.minThreshold), status: Number(formData.quantity) === 0 ? 'out_of_stock' : Number(formData.quantity) < Number(formData.minThreshold) ? 'low_stock' : 'available' }
          : r
      ));
      toast.success('Resource updated successfully');
    } else {
      const qty = Number(formData.quantity);
      const threshold = Number(formData.minThreshold);
      const newResource: Resource = {
        id: Date.now().toString(),
        ...formData,
        quantity: qty,
        minThreshold: threshold,
        status: qty === 0 ? 'out_of_stock' : qty < threshold ? 'low_stock' : 'available',
        lastUpdated: new Date().toISOString(),
      } as Resource;
      setResources(prev => [...prev, newResource]);
      toast.success('Resource added successfully');
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', category: 'medical', quantity: '', unit: '', location: '', minThreshold: '' });
    setIsEditing(false);
    setSelectedResource(null);
  };

  const handleEdit = (resource: Resource) => {
    setSelectedResource(resource);
    setFormData({
      name: resource.name,
      category: resource.category,
      quantity: resource.quantity.toString(),
      unit: resource.unit,
      location: resource.location,
      minThreshold: resource.minThreshold.toString(),
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Resource deleted successfully');
    }
  };

  const filteredResources = resources.filter(resource => {
    if (filterCategory !== 'all' && resource.category !== filterCategory) return false;
    if (filterStatus !== 'all' && resource.status !== filterStatus) return false;
    if (searchQuery && !resource.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Chart data
  const categoryData = [
    { name: 'Medical', value: resources.filter(r => r.category === 'medical').length, color: '#ef4444' },
    { name: 'Food', value: resources.filter(r => r.category === 'food').length, color: '#f59e0b' },
    { name: 'Water', value: resources.filter(r => r.category === 'water').length, color: '#3b82f6' },
    { name: 'Shelter', value: resources.filter(r => r.category === 'shelter').length, color: '#8b5cf6' },
    { name: 'Transport', value: resources.filter(r => r.category === 'transport').length, color: '#10b981' },
    { name: 'Other', value: resources.filter(r => ['equipment', 'clothing', 'other'].includes(r.category)).length, color: '#6b7280' },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: 'Available', count: resources.filter(r => r.status === 'available').length },
    { name: 'Deployed', count: resources.filter(r => r.status === 'deployed').length },
    { name: 'Low Stock', count: resources.filter(r => r.status === 'low_stock').length },
    { name: 'Out of Stock', count: resources.filter(r => r.status === 'out_of_stock').length },
  ];

  const stats = {
    total: resources.length,
    available: resources.filter(r => r.status === 'available').length,
    lowStock: resources.filter(r => r.status === 'low_stock').length,
    outOfStock: resources.filter(r => r.status === 'out_of_stock').length,
  };

  return (
    <DashboardLayout title="Resource Management" subtitle="Track and manage relief supplies and equipment">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-l-4 border-l-[var(--primary-500)]">
          <p className="text-sm text-[var(--text-muted)] mb-1">Total Items</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-sm text-[var(--text-muted)] mb-1">Available</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.available}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-sm text-[var(--text-muted)] mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-amber-400">{stats.lowStock}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-sm text-[var(--text-muted)] mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-400">{stats.outOfStock}</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Resources by Category</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {categoryData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-[var(--text-secondary)]">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Resources" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          options={[
            { value: 'all', label: 'All Categories' },
            { value: 'medical', label: 'Medical' },
            { value: 'food', label: 'Food' },
            { value: 'water', label: 'Water' },
            { value: 'shelter', label: 'Shelter' },
            { value: 'transport', label: 'Transport' },
            { value: 'equipment', label: 'Equipment' },
            { value: 'clothing', label: 'Clothing' },
          ]}
          value={filterCategory}
          onChange={setFilterCategory}
        />
        <Select
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'available', label: 'Available' },
            { value: 'deployed', label: 'Deployed' },
            { value: 'low_stock', label: 'Low Stock' },
            { value: 'out_of_stock', label: 'Out of Stock' },
          ]}
          value={filterStatus}
          onChange={setFilterStatus}
        />
        <Button variant="gradient" leftIcon={<PlusIcon className="w-5 h-5" />} onClick={() => { resetForm(); setIsModalOpen(true); }}>
          Add Resource
        </Button>
      </div>

      {/* Resources Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--bg-input)]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Resource</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Category</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Quantity</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Location</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-8 bg-[var(--bg-input)] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <CubeIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-[var(--text-muted)]">No resources found</p>
                  </td>
                </tr>
              ) : (
                filteredResources.map((resource) => (
                  <tr key={resource.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-input)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getCategoryColor(resource.category)} flex items-center justify-center text-lg`}>
                          {getCategoryIcon(resource.category)}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{resource.name}</p>
                          {resource.assignedTo && (
                            <p className="text-xs text-[var(--text-muted)]">→ {resource.assignedTo}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-secondary)] capitalize">{resource.category}</td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${resource.status === 'out_of_stock' ? 'text-red-400' : resource.status === 'low_stock' ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                        {resource.quantity.toLocaleString()}
                      </span>
                      <span className="text-[var(--text-muted)] ml-1">{resource.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{resource.location}</td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadge(resource.status)} size="sm">
                        {resource.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(resource)}>
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(resource.id)}>
                          <TrashIcon className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={isEditing ? 'Edit Resource' : 'Add New Resource'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Resource Name" placeholder="e.g., First Aid Kits" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={[
                { value: 'medical', label: 'Medical' },
                { value: 'food', label: 'Food' },
                { value: 'water', label: 'Water' },
                { value: 'shelter', label: 'Shelter' },
                { value: 'transport', label: 'Transport' },
                { value: 'equipment', label: 'Equipment' },
                { value: 'clothing', label: 'Clothing' },
                { value: 'other', label: 'Other' },
              ]}
              value={formData.category}
              onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
            />
            <Input label="Unit" placeholder="e.g., kits, liters, kg" value={formData.unit} onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity" type="number" placeholder="Current quantity" value={formData.quantity} onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))} required />
            <Input label="Min Threshold" type="number" placeholder="Alert threshold" value={formData.minThreshold} onChange={(e) => setFormData(prev => ({ ...prev, minThreshold: e.target.value }))} required />
          </div>
          <Input label="Storage Location" placeholder="e.g., Central Warehouse" value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} required />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" variant="gradient" className="flex-1">{isEditing ? 'Update Resource' : 'Add Resource'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

