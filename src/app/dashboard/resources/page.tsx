'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Modal, Input, Select } from '@/components/ui';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  CubeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  TruckIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  DocumentTextIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Types matching the new schema
interface StockEntry {
  _id: string;
  item: {
    name: string;
    category: string;
    sku: string;
    description?: string;
  };
  location: {
    warehouseId: string;
    name: string;
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    manager: {
      name: string;
      contact: string;
      email: string;
    };
  };
  inventory: {
    currentQuantity: number;
    unit: string;
    threshold: number;
    reservedQuantity: number;
    availableQuantity: number;
  };
  status: 'In-Stock' | 'Low Stock' | 'Critical' | 'Depleted' | 'Expired';
  batches: Array<{
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    receivedDate: string;
    condition: 'New' | 'Good' | 'Fair' | 'Damaged';
  }>;
  actions: Array<{
    type: 'Restock' | 'Dispatch' | 'Transfer' | 'Adjustment' | 'Expiry';
    triggeredBy: string;
    timestamp: string;
    status: 'Pending' | 'Completed' | 'Cancelled';
    notes?: string;
  }>;
  auditLog: Array<{
    userId: string;
    change: string;
    timestamp: string;
  }>;
  tags: string[];
  lastUpdated: string;
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

export default function InStockManagementPage() {
  const { token } = useAuth();
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  
  // Modals
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const [selectedStock, setSelectedStock] = useState<StockEntry | null>(null);
  const [isEditingStock, setIsEditingStock] = useState(false);
  
  // Form data
  const [stockFormData, setStockFormData] = useState({
    itemName: '',
    itemCategory: '',
    itemSku: '',
    itemDescription: '',
    warehouseId: '',
    locationName: '',
    locationAddress: '',
    latitude: '',
    longitude: '',
    managerName: '',
    managerContact: '',
    managerEmail: '',
    currentQuantity: '',
    unit: '',
    threshold: '',
    reservedQuantity: '0',
    tags: [] as string[],
    batches: [] as Array<{
      batchNumber: string;
      quantity: string;
      expiryDate: string;
      receivedDate: string;
      condition: 'New' | 'Good' | 'Fair' | 'Damaged';
    }>,
  });

  // Batch form state
  const [editingBatchIndex, setEditingBatchIndex] = useState<number | null>(null);
  const [batchFormData, setBatchFormData] = useState({
    batchNumber: '',
    quantity: '',
    expiryDate: '',
    receivedDate: new Date().toISOString().split('T')[0],
    condition: 'New' as 'New' | 'Good' | 'Fair' | 'Damaged',
  });

  // Predefined tags
  const predefinedTags = [
    { value: 'Urgent', label: 'Urgent' },
    { value: 'Flood-Response', label: 'Flood Response' },
    { value: 'WASH', label: 'WASH' },
    { value: 'Emergency', label: 'Emergency' },
    { value: 'Food-Security', label: 'Food Security' },
    { value: 'Medical', label: 'Medical' },
    { value: 'Critical', label: 'Critical' },
    { value: 'Restock-Required', label: 'Restock Required' },
    { value: 'Shelter', label: 'Shelter' },
    { value: 'Disaster-Response', label: 'Disaster Response' },
    { value: 'Water-Safety', label: 'Water Safety' },
    { value: 'Winter-Supplies', label: 'Winter Supplies' },
    { value: 'Communication', label: 'Communication' },
    { value: 'Depleted', label: 'Depleted' },
    { value: 'Urgent-Restock', label: 'Urgent Restock' },
    { value: 'Hygiene', label: 'Hygiene' },
    { value: 'Power', label: 'Power' },
    { value: 'Critical-Infrastructure', label: 'Critical Infrastructure' },
    { value: 'Life-Support', label: 'Life Support' },
    { value: 'Rescue', label: 'Rescue' },
    { value: 'Water-Rescue', label: 'Water Rescue' },
  ];

  const [dispatchFormData, setDispatchFormData] = useState({
    quantity: '',
    destination: '',
    notes: '',
  });

  const [restockFormData, setRestockFormData] = useState({
    quantity: '',
    batchNumber: '',
    expiryDate: '',
    condition: 'New' as 'New' | 'Good' | 'Fair' | 'Damaged',
    notes: '',
  });

  const [reserveFormData, setReserveFormData] = useState({
    quantity: '',
    notes: '',
  });

  // Fetch stock entries
  const fetchStockEntries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/inventory/stock', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setStockEntries(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching stock entries:', error);
      toast.error('Failed to fetch stock entries');
    } finally {
      setIsLoading(false);
    }
  };

  // Seed data
  const handleSeed = async () => {
    if (!window.confirm('This will clear all existing stock entries and seed sample data. Continue?')) return;
    
    try {
      const response = await fetch('/api/inventory/seed', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully seeded ${data.data.length} stock entries`);
        fetchStockEntries();
      } else {
        toast.error(data.error || 'Failed to seed data');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed data');
    }
  };

  useEffect(() => {
    if (token) {
      fetchStockEntries();
    }
  }, [token]);

  // Filtered entries
  const filteredEntries = stockEntries.filter(entry => {
    if (filterCategory !== 'all' && entry.item.category !== filterCategory) return false;
    if (filterStatus !== 'all' && entry.status !== filterStatus) return false;
    if (filterWarehouse !== 'all' && entry.location.warehouseId !== filterWarehouse) return false;
    if (searchQuery && !entry.item.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !entry.item.sku.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !entry.location.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: stockEntries.length,
    inStock: stockEntries.filter(e => e.status === 'In-Stock').length,
    lowStock: stockEntries.filter(e => e.status === 'Low Stock').length,
    critical: stockEntries.filter(e => e.status === 'Critical').length,
    depleted: stockEntries.filter(e => e.status === 'Depleted').length,
    expired: stockEntries.filter(e => e.status === 'Expired').length,
    totalQuantity: stockEntries.reduce((sum, e) => sum + e.inventory.currentQuantity, 0),
    totalAvailable: stockEntries.reduce((sum, e) => sum + e.inventory.availableQuantity, 0),
    totalReserved: stockEntries.reduce((sum, e) => sum + e.inventory.reservedQuantity, 0),
  };

  // Get unique categories and warehouses
  const categories = Array.from(new Set(stockEntries.map(e => e.item.category))).sort();
  const warehouses = Array.from(new Set(stockEntries.map(e => e.location.warehouseId))).sort();

  // Category data for chart
  const categoryData = categories.map(cat => ({
    name: cat,
    value: stockEntries.filter(e => e.item.category === cat).length,
    color: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#6b7280'][categories.indexOf(cat) % 6],
  })).filter(d => d.value > 0);

  const statusData = [
    { name: 'In-Stock', count: stats.inStock },
    { name: 'Low Stock', count: stats.lowStock },
    { name: 'Critical', count: stats.critical },
    { name: 'Depleted', count: stats.depleted },
    { name: 'Expired', count: stats.expired },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
      'In-Stock': 'success',
      'Low Stock': 'warning',
      'Critical': 'danger',
      'Depleted': 'danger',
      'Expired': 'danger',
    };
    return variants[status] || 'info';
  };

  // Handle dispatch
  const handleDispatch = async () => {
    if (!selectedStock) return;
    
    try {
      const response = await fetch(`/api/inventory/stock/${selectedStock._id}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dispatchFormData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Stock dispatched successfully');
        fetchStockEntries();
        setIsDispatchModalOpen(false);
        setDispatchFormData({ quantity: '', destination: '', notes: '' });
      } else {
        toast.error(data.error || 'Failed to dispatch stock');
      }
    } catch (error) {
      console.error('Error dispatching stock:', error);
      toast.error('Failed to dispatch stock');
    }
  };

  // Handle restock
  const handleRestock = async () => {
    if (!selectedStock) return;
    
    try {
      const response = await fetch(`/api/inventory/stock/${selectedStock._id}/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(restockFormData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Stock restocked successfully');
        fetchStockEntries();
        setIsRestockModalOpen(false);
        setRestockFormData({ quantity: '', batchNumber: '', expiryDate: '', condition: 'New', notes: '' });
      } else {
        toast.error(data.error || 'Failed to restock');
      }
    } catch (error) {
      console.error('Error restocking:', error);
      toast.error('Failed to restock');
    }
  };

  // Handle reserve
  const handleReserve = async () => {
    if (!selectedStock) return;
    
    try {
      const response = await fetch(`/api/inventory/stock/${selectedStock._id}/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reserveFormData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Stock reserved successfully');
        fetchStockEntries();
        setIsReserveModalOpen(false);
        setReserveFormData({ quantity: '', notes: '' });
      } else {
        toast.error(data.error || 'Failed to reserve stock');
      }
    } catch (error) {
      console.error('Error reserving stock:', error);
      toast.error('Failed to reserve stock');
    }
  };

  // Handle create/update stock entry
  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!stockFormData.itemCategory || stockFormData.itemCategory.trim() === '') {
      toast.error('Please select a category');
      return;
    }
    
    if (!stockFormData.itemName || stockFormData.itemName.trim() === '') {
      toast.error('Item name is required');
      return;
    }
    
    if (!stockFormData.itemSku || stockFormData.itemSku.trim() === '') {
      toast.error('SKU is required');
      return;
    }
    
    if (!stockFormData.warehouseId || stockFormData.warehouseId.trim() === '') {
      toast.error('Warehouse ID is required');
      return;
    }
    
    if (!stockFormData.locationName || stockFormData.locationName.trim() === '') {
      toast.error('Location name is required');
      return;
    }
    
    try {
      // Prepare batches array
      const batchesArray = (stockFormData.batches || []).map(batch => ({
        batchNumber: batch.batchNumber,
        quantity: Number(batch.quantity) || 0,
        expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        receivedDate: batch.receivedDate ? new Date(batch.receivedDate).toISOString() : new Date().toISOString(),
        condition: batch.condition || 'New',
      }));

      const payload = {
        item: {
          name: stockFormData.itemName,
          category: stockFormData.itemCategory,
          sku: stockFormData.itemSku,
          description: stockFormData.itemDescription,
        },
        location: {
          warehouseId: stockFormData.warehouseId,
          name: stockFormData.locationName,
          address: stockFormData.locationAddress,
          coordinates: {
            latitude: parseFloat(stockFormData.latitude) || 0,
            longitude: parseFloat(stockFormData.longitude) || 0,
          },
          manager: {
            name: stockFormData.managerName,
            contact: stockFormData.managerContact,
            email: stockFormData.managerEmail,
          },
        },
        inventory: {
          currentQuantity: parseFloat(stockFormData.currentQuantity) || 0,
          unit: stockFormData.unit,
          threshold: parseFloat(stockFormData.threshold) || 0,
          reservedQuantity: parseFloat(stockFormData.reservedQuantity) || 0,
        },
        tags: stockFormData.tags || [],
        batches: batchesArray,
      };

      // Debug log
      console.log('Submitting payload with batches:', {
        batchesCount: batchesArray.length,
        batches: batchesArray,
        stockFormDataBatches: stockFormData.batches,
      });

      const url = isEditingStock && selectedStock
        ? `/api/inventory/stock/${selectedStock._id}`
        : '/api/inventory/stock';
      
      const method = isEditingStock ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(isEditingStock ? 'Stock entry updated successfully' : 'Stock entry created successfully');
        fetchStockEntries();
        resetStockForm();
      } else {
        console.error('Error response:', data);
        toast.error(data.error || 'Failed to save stock entry');
      }
    } catch (error) {
      console.error('Error saving stock entry:', error);
      toast.error('Failed to save stock entry');
    }
  };

  const resetStockForm = () => {
    setStockFormData({
      itemName: '',
      itemCategory: '',
      itemSku: '',
      itemDescription: '',
      warehouseId: '',
      locationName: '',
      locationAddress: '',
      latitude: '',
      longitude: '',
      managerName: '',
      managerContact: '',
      managerEmail: '',
      currentQuantity: '',
      unit: '',
      threshold: '',
      reservedQuantity: '0',
      tags: [],
      batches: [],
    });
    setEditingBatchIndex(null);
    setBatchFormData({
      batchNumber: '',
      quantity: '',
      expiryDate: '',
      receivedDate: new Date().toISOString().split('T')[0],
      condition: 'New',
    });
    setIsEditingStock(false);
    setSelectedStock(null);
    setIsStockModalOpen(false);
    setEditingBatchIndex(null);
  };

  // Batch management functions
  const handleAddBatch = () => {
    if (!batchFormData.batchNumber || !batchFormData.quantity) {
      toast.error('Batch number and quantity are required');
      return;
    }

    const newBatch = { ...batchFormData };
    setStockFormData(prev => ({
      ...prev,
      batches: [...prev.batches, newBatch],
    }));

    // Reset batch form
    setBatchFormData({
      batchNumber: '',
      quantity: '',
      expiryDate: '',
      receivedDate: new Date().toISOString().split('T')[0],
      condition: 'New',
    });
    toast.success('Batch added');
  };

  const handleEditBatch = (index: number) => {
    const batch = stockFormData.batches[index];
    setBatchFormData({
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate,
      receivedDate: batch.receivedDate,
      condition: batch.condition,
    });
    setEditingBatchIndex(index);
  };

  const handleUpdateBatch = () => {
    if (editingBatchIndex === null) return;
    if (!batchFormData.batchNumber || !batchFormData.quantity) {
      toast.error('Batch number and quantity are required');
      return;
    }

    setStockFormData(prev => ({
      ...prev,
      batches: prev.batches.map((batch, index) =>
        index === editingBatchIndex ? { ...batchFormData } : batch
      ),
    }));

    // Reset
    setEditingBatchIndex(null);
    setBatchFormData({
      batchNumber: '',
      quantity: '',
      expiryDate: '',
      receivedDate: new Date().toISOString().split('T')[0],
      condition: 'New',
    });
    toast.success('Batch updated');
  };

  const handleDeleteBatch = (index: number) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      setStockFormData(prev => ({
        ...prev,
        batches: prev.batches.filter((_, i) => i !== index),
      }));
      toast.success('Batch deleted');
    }
  };

  const handleCancelBatchEdit = () => {
    setEditingBatchIndex(null);
    setBatchFormData({
      batchNumber: '',
      quantity: '',
      expiryDate: '',
      receivedDate: new Date().toISOString().split('T')[0],
      condition: 'New',
    });
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this stock entry?')) return;
    
    try {
      const response = await fetch(`/api/inventory/stock/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Stock entry deleted successfully');
        fetchStockEntries();
      } else {
        toast.error(data.error || 'Failed to delete stock entry');
      }
    } catch (error) {
      console.error('Error deleting stock entry:', error);
      toast.error('Failed to delete stock entry');
    }
  };

  return (
    <DashboardLayout title="In-Stock Management" subtitle="Manage inventory stock across multiple warehouses">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card className="p-4 border-l-4 border-l-[var(--primary-500)]">
          <p className="text-sm text-[var(--text-muted)] mb-1">Total Entries</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-sm text-[var(--text-muted)] mb-1">In-Stock</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.inStock}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-sm text-[var(--text-muted)] mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-amber-400">{stats.lowStock}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-sm text-[var(--text-muted)] mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500">
          <p className="text-sm text-[var(--text-muted)] mb-1">Depleted</p>
          <p className="text-2xl font-bold text-orange-400">{stats.depleted}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <p className="text-sm text-[var(--text-muted)] mb-1">Available Qty</p>
          <p className="text-2xl font-bold text-purple-400">{stats.totalAvailable.toLocaleString()}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Stock by Category</h3>
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
                <Bar dataKey="count" name="Entries" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444', '#f97316', '#a855f7'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

<Input
  icon={<MagnifyingGlassIcon className="w-5 h-5" />}
  placeholder="Search by item name, SKU, or location..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>

<Select
  options={[
    { value: 'all', label: 'All Categories' },
    ...categories.map(cat => ({ value: cat, label: cat })),
  ]}
  value={filterCategory}
  onChange={setFilterCategory}
/>

<Select
  options={[
    { value: 'all', label: 'All Status' },
    { value: 'In-Stock', label: 'In-Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'Critical', label: 'Critical' },
    { value: 'Depleted', label: 'Depleted' },
    { value: 'Expired', label: 'Expired' },
  ]}
  value={filterStatus}
  onChange={setFilterStatus}
/>

<Select
  options={[
    { value: 'all', label: 'All Warehouses' },
    ...warehouses.map(wh => ({ value: wh, label: wh })),
  ]}
  value={filterWarehouse}
  onChange={setFilterWarehouse}
/>

<Button
  variant="gradient"
  className="w-full h-full"
  leftIcon={<PlusIcon className="w-5 h-5" />}
  onClick={() => {
    resetStockForm();
    setIsStockModalOpen(true);
  }}
>
  Add New Stock Entry
</Button>

</div>


      {/* Stock Entries Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--bg-input)]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Item</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Location</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Quantity</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Batches</th>
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
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <CubeIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-[var(--text-muted)] mb-4">No stock entries found</p>
                    <Button variant="gradient" onClick={handleSeed}>Seed Sample Data</Button>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry._id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-input)] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{entry.item.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">SKU: {entry.item.sku}</p>
                        <p className="text-xs text-[var(--text-muted)] capitalize">{entry.item.category}</p>
                        {entry.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {entry.tags.slice(0, 2).map((tag, i) => (
                              <Badge key={i} variant="info" size="sm">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--text-primary)]">{entry.location.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{entry.location.warehouseId}</p>
                      <p className="text-xs text-[var(--text-muted)]">{entry.location.address}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {entry.inventory.currentQuantity.toLocaleString()} {entry.inventory.unit}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Available: {entry.inventory.availableQuantity.toLocaleString()}
                        </p>
                        {entry.inventory.reservedQuantity > 0 && (
                          <p className="text-xs text-amber-400">
                            Reserved: {entry.inventory.reservedQuantity.toLocaleString()}
                          </p>
                        )}
                        <p className="text-xs text-[var(--text-muted)]">
                          Threshold: {entry.inventory.threshold.toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadge(entry.status)} size="sm">
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[var(--text-secondary)]">{entry.batches.length} batch(es)</p>
                      {entry.batches.length > 0 && (
                        <p className="text-xs text-[var(--text-muted)]">
                          Latest: {entry.batches[entry.batches.length - 1].batchNumber}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStock(entry);
                            setIsDetailsModalOpen(true);
                          }}
                          title="View Details"
                        >
                          <DocumentTextIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStock(entry);
                            setIsDispatchModalOpen(true);
                            setDispatchFormData({ quantity: '', destination: '', notes: '' });
                          }}
                          title="Dispatch"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStock(entry);
                            setIsRestockModalOpen(true);
                            setRestockFormData({ quantity: '', batchNumber: '', expiryDate: '', condition: 'New', notes: '' });
                          }}
                          title="Restock"
                        >
                          <ArrowUpTrayIcon className="w-4 h-4 text-green-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStock(entry);
                            setIsReserveModalOpen(true);
                            setReserveFormData({ quantity: '', notes: '' });
                          }}
                          title="Reserve"
                        >
                          <ClockIcon className="w-4 h-4 text-purple-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStock(entry);
                            setStockFormData({
                              itemName: entry.item.name,
                              itemCategory: entry.item.category,
                              itemSku: entry.item.sku,
                              itemDescription: entry.item.description || '',
                              warehouseId: entry.location.warehouseId,
                              locationName: entry.location.name,
                              locationAddress: entry.location.address,
                              latitude: entry.location.coordinates.latitude.toString(),
                              longitude: entry.location.coordinates.longitude.toString(),
                              managerName: entry.location.manager.name,
                              managerContact: entry.location.manager.contact,
                              managerEmail: entry.location.manager.email,
                              currentQuantity: entry.inventory.currentQuantity.toString(),
                              unit: entry.inventory.unit,
                              threshold: entry.inventory.threshold.toString(),
                              reservedQuantity: entry.inventory.reservedQuantity.toString(),
                              tags: entry.tags || [],
                              batches: entry.batches.map(batch => ({
                                batchNumber: batch.batchNumber,
                                quantity: batch.quantity.toString(),
                                expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toISOString().split('T')[0] : '',
                                receivedDate: batch.receivedDate ? new Date(batch.receivedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                condition: batch.condition || 'New',
                              })),
                            });
                            setIsEditingStock(true);
                            setIsStockModalOpen(true);
                          }}
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry._id)}
                          title="Delete"
                        >
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

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedStock(null);
        }}
        title={selectedStock ? `${selectedStock.item.name} - Details` : 'Stock Details'}
      >
        {selectedStock && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-2">Item Information</h4>
              <div className="bg-[var(--bg-input)] p-3 rounded-lg space-y-1">
                <p><span className="font-medium">Name:</span> {selectedStock.item.name}</p>
                <p><span className="font-medium">SKU:</span> {selectedStock.item.sku}</p>
                <p><span className="font-medium">Category:</span> {selectedStock.item.category}</p>
                {selectedStock.item.description && (
                  <p><span className="font-medium">Description:</span> {selectedStock.item.description}</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-2">Location Information</h4>
              <div className="bg-[var(--bg-input)] p-3 rounded-lg space-y-1">
                <p><span className="font-medium">Warehouse ID:</span> {selectedStock.location.warehouseId}</p>
                <p><span className="font-medium">Name:</span> {selectedStock.location.name}</p>
                <p><span className="font-medium">Address:</span> {selectedStock.location.address}</p>
                <p><span className="font-medium">Manager:</span> {selectedStock.location.manager.name}</p>
                <p><span className="font-medium">Contact:</span> {selectedStock.location.manager.contact}</p>
                <p><span className="font-medium">Email:</span> {selectedStock.location.manager.email}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-2">Inventory</h4>
              <div className="bg-[var(--bg-input)] p-3 rounded-lg space-y-1">
                <p><span className="font-medium">Current Quantity:</span> {selectedStock.inventory.currentQuantity.toLocaleString()} {selectedStock.inventory.unit}</p>
                <p><span className="font-medium">Available:</span> {selectedStock.inventory.availableQuantity.toLocaleString()} {selectedStock.inventory.unit}</p>
                <p><span className="font-medium">Reserved:</span> {selectedStock.inventory.reservedQuantity.toLocaleString()} {selectedStock.inventory.unit}</p>
                <p><span className="font-medium">Threshold:</span> {selectedStock.inventory.threshold.toLocaleString()} {selectedStock.inventory.unit}</p>
              </div>
            </div>

            {selectedStock.batches.length > 0 && (
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Batches ({selectedStock.batches.length})</h4>
                <div className="bg-[var(--bg-input)] p-3 rounded-lg space-y-2 max-h-40 overflow-y-auto">
                  {selectedStock.batches.map((batch, i) => (
                    <div key={i} className="border-b border-[var(--border-color)] pb-2 last:border-0">
                      <p><span className="font-medium">Batch:</span> {batch.batchNumber}</p>
                      <p><span className="font-medium">Quantity:</span> {batch.quantity}</p>
                      <p><span className="font-medium">Expiry:</span> {new Date(batch.expiryDate).toLocaleDateString()}</p>
                      <p><span className="font-medium">Condition:</span> {batch.condition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedStock.auditLog.length > 0 && (
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Recent Audit Log ({selectedStock.auditLog.length})</h4>
                <div className="bg-[var(--bg-input)] p-3 rounded-lg space-y-2 max-h-40 overflow-y-auto">
                  {selectedStock.auditLog.slice(-5).reverse().map((log, i) => (
                    <div key={i} className="border-b border-[var(--border-color)] pb-2 last:border-0">
                      <p className="text-sm">{log.change}</p>
                      <p className="text-xs text-[var(--text-muted)]">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedStock.tags.length > 0 && (
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedStock.tags.map((tag, i) => (
                    <Badge key={i} variant="info" size="sm">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Dispatch Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => {
          setIsDispatchModalOpen(false);
          setSelectedStock(null);
          setDispatchFormData({ quantity: '', destination: '', notes: '' });
        }}
        title="Dispatch Stock"
      >
        {selectedStock && (
          <form onSubmit={(e) => { e.preventDefault(); handleDispatch(); }} className="space-y-4">
            <div className="bg-[var(--bg-input)] p-3 rounded-lg">
              <p className="text-sm text-[var(--text-muted)]">Available: {selectedStock.inventory.availableQuantity.toLocaleString()} {selectedStock.inventory.unit}</p>
            </div>
            <Input
              label="Quantity"
              type="number"
              placeholder="Enter quantity to dispatch"
              value={dispatchFormData.quantity}
              onChange={(e) => setDispatchFormData(prev => ({ ...prev, quantity: e.target.value }))}
              required
              max={selectedStock.inventory.availableQuantity}
            />
            <Input
              label="Destination (Optional)"
              placeholder="e.g., Flood Zone A"
              value={dispatchFormData.destination}
              onChange={(e) => setDispatchFormData(prev => ({ ...prev, destination: e.target.value }))}
            />
            <Input
              label="Notes (Optional)"
              placeholder="Additional notes"
              value={dispatchFormData.notes}
              onChange={(e) => setDispatchFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setIsDispatchModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" className="flex-1">Dispatch</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Restock Modal */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => {
          setIsRestockModalOpen(false);
          setSelectedStock(null);
          setRestockFormData({ quantity: '', batchNumber: '', expiryDate: '', condition: 'New', notes: '' });
        }}
        title="Restock"
      >
        {selectedStock && (
          <form onSubmit={(e) => { e.preventDefault(); handleRestock(); }} className="space-y-4">
            <Input
              label="Quantity"
              type="number"
              placeholder="Enter quantity to add"
              value={restockFormData.quantity}
              onChange={(e) => setRestockFormData(prev => ({ ...prev, quantity: e.target.value }))}
              required
            />
            <Input
              label="Batch Number"
              placeholder="e.g., B-2025-X"
              value={restockFormData.batchNumber}
              onChange={(e) => setRestockFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
            />
            <Input
              label="Expiry Date"
              type="date"
              value={restockFormData.expiryDate}
              onChange={(e) => setRestockFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
            />
            <Select
              label="Condition"
              options={[
                { value: 'New', label: 'New' },
                { value: 'Good', label: 'Good' },
                { value: 'Fair', label: 'Fair' },
                { value: 'Damaged', label: 'Damaged' },
              ]}
              value={restockFormData.condition}
              onChange={(val) => setRestockFormData(prev => ({ ...prev, condition: val as any }))}
            />
            <Input
              label="Notes (Optional)"
              placeholder="Additional notes"
              value={restockFormData.notes}
              onChange={(e) => setRestockFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setIsRestockModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" className="flex-1">Restock</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reserve Modal */}
      <Modal
        isOpen={isReserveModalOpen}
        onClose={() => {
          setIsReserveModalOpen(false);
          setSelectedStock(null);
          setReserveFormData({ quantity: '', notes: '' });
        }}
        title="Reserve Stock"
      >
        {selectedStock && (
          <form onSubmit={(e) => { e.preventDefault(); handleReserve(); }} className="space-y-4">
            <div className="bg-[var(--bg-input)] p-3 rounded-lg">
              <p className="text-sm text-[var(--text-muted)]">Available: {selectedStock.inventory.availableQuantity.toLocaleString()} {selectedStock.inventory.unit}</p>
            </div>
            <Input
              label="Quantity"
              type="number"
              placeholder="Enter quantity to reserve"
              value={reserveFormData.quantity}
              onChange={(e) => setReserveFormData(prev => ({ ...prev, quantity: e.target.value }))}
              required
              max={selectedStock.inventory.availableQuantity}
            />
            <Input
              label="Notes (Optional)"
              placeholder="Reason for reservation"
              value={reserveFormData.notes}
              onChange={(e) => setReserveFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setIsReserveModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" className="flex-1">Reserve</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create/Edit Stock Entry Modal */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={resetStockForm}
        title={isEditingStock ? 'Edit Stock Entry' : 'Create New Stock Entry'}
      >
        <form onSubmit={handleStockSubmit} className="space-y-4">
          <div className="border-b border-[var(--border-color)] pb-4">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Item Information</h4>
            <div className="space-y-3">
              <Input
                label="Item Name"
                placeholder="e.g., Portable Water Filtration Kit"
                value={stockFormData.itemName}
                onChange={(e) => setStockFormData(prev => ({ ...prev, itemName: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Category"
                  options={[
                    { value: '', label: 'Select Category' },
                    { value: 'Water & Sanitation', label: 'Water & Sanitation' },
                    { value: 'Food & Nutrition', label: 'Food & Nutrition' },
                    { value: 'Medical Supplies', label: 'Medical Supplies' },
                    { value: 'Shelter & Housing', label: 'Shelter & Housing' },
                    { value: 'Clothing & Bedding', label: 'Clothing & Bedding' },
                    { value: 'Communication Equipment', label: 'Communication Equipment' },
                    { value: 'Power & Energy', label: 'Power & Energy' },
                    { value: 'Rescue Equipment', label: 'Rescue Equipment' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  value={stockFormData.itemCategory}
                  onChange={(val) => {
                    setStockFormData(prev => ({ ...prev, itemCategory: val }));
                  }}
                  required
                />
                <Input
                  label="SKU"
                  placeholder="e.g., WASH-FIL-001"
                  value={stockFormData.itemSku}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, itemSku: e.target.value }))}
                  required
                />
              </div>
              <Input
                label="Description (Optional)"
                placeholder="Item description"
                value={stockFormData.itemDescription}
                onChange={(e) => setStockFormData(prev => ({ ...prev, itemDescription: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-b border-[var(--border-color)] pb-4">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Location Information</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Warehouse ID"
                  placeholder="e.g., WH-NORTH-01"
                  value={stockFormData.warehouseId}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, warehouseId: e.target.value }))}
                  required
                />
                <Input
                  label="Location Name"
                  placeholder="e.g., Northern Relief Hub"
                  value={stockFormData.locationName}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, locationName: e.target.value }))}
                  required
                />
              </div>
              <Input
                label="Address"
                placeholder="Full address"
                value={stockFormData.locationAddress}
                onChange={(e) => setStockFormData(prev => ({ ...prev, locationAddress: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 28.4595"
                  value={stockFormData.latitude}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, latitude: e.target.value }))}
                  required
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 77.0266"
                  value={stockFormData.longitude}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, longitude: e.target.value }))}
                  required
                />
              </div>
              <div className="border-t border-[var(--border-color)] pt-3">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Manager Information</p>
                <div className="space-y-3">
                  <Input
                    label="Manager Name"
                    placeholder="Manager full name"
                    value={stockFormData.managerName}
                    onChange={(e) => setStockFormData(prev => ({ ...prev, managerName: e.target.value }))}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <PhoneInput
                      label="Contact"
                      placeholder="Phone number"
                      value={stockFormData.managerContact}
                      onChange={(value: string | undefined) => setStockFormData(prev => ({ ...prev, managerContact: value || '' }))}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="Email address"
                      value={stockFormData.managerEmail}
                      onChange={(e) => setStockFormData(prev => ({ ...prev, managerEmail: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-[var(--border-color)] pb-4">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3">Inventory Information</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Current Quantity"
                  type="number"
                  placeholder="Current stock quantity"
                  value={stockFormData.currentQuantity}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, currentQuantity: e.target.value }))}
                  required
                  min="0"
                />
                <Input
                  label="Unit"
                  placeholder="e.g., Units, Kits, Packs"
                  value={stockFormData.unit}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, unit: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Threshold"
                  type="number"
                  placeholder="Minimum stock threshold"
                  value={stockFormData.threshold}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, threshold: e.target.value }))}
                  required
                  min="0"
                />
                <Input
                  label="Reserved Quantity"
                  type="number"
                  placeholder="Reserved quantity"
                  value={stockFormData.reservedQuantity}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, reservedQuantity: e.target.value }))}
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="border-b border-[var(--border-color)] pb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-[var(--text-primary)]">Batches</h4>
              <span className="text-xs text-[var(--text-muted)]">{stockFormData.batches.length} batch(es)</span>
            </div>
            
            {/* Add/Edit Batch Form */}
            <div className="bg-[var(--bg-input)] p-3 rounded-lg space-y-3 mb-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Batch Number"
                  placeholder="e.g., B-2025-001"
                  value={batchFormData.batchNumber}
                  onChange={(e) => setBatchFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                  required
                />
                <Input
                  label="Quantity"
                  type="number"
                  placeholder="Batch quantity"
                  value={batchFormData.quantity}
                  onChange={(e) => setBatchFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  required
                  min="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Received Date"
                  type="date"
                  value={batchFormData.receivedDate}
                  onChange={(e) => setBatchFormData(prev => ({ ...prev, receivedDate: e.target.value }))}
                  required
                />
                <Input
                  label="Expiry Date"
                  type="date"
                  value={batchFormData.expiryDate}
                  onChange={(e) => setBatchFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Condition
                </label>
                <select
                  value={batchFormData.condition}
                  onChange={(e) => setBatchFormData(prev => ({ ...prev, condition: e.target.value as 'New' | 'Good' | 'Fair' | 'Damaged' }))}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]"
                >
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>
              <div className="flex gap-2">
                {editingBatchIndex !== null ? (
                  <>
                    <Button
                      type="button"
                      variant="gradient"
                      size="sm"
                      onClick={handleUpdateBatch}
                      className="flex-1"
                    >
                      Update Batch
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCancelBatchEdit}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="gradient"
                    size="sm"
                    onClick={handleAddBatch}
                    className="flex-1"
                    leftIcon={<PlusIcon className="w-4 h-4" />}
                  >
                    Add Batch
                  </Button>
                )}
              </div>
            </div>

            {/* Batches List */}
            {stockFormData.batches.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stockFormData.batches.map((batch, index) => (
                  <div
                    key={index}
                    className="bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border-color)] flex items-start justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--text-primary)] text-sm">{batch.batchNumber}</span>
                        <Badge variant="secondary" size="sm">{batch.condition}</Badge>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] space-y-1">
                        <p>Quantity: {batch.quantity} {stockFormData.unit || 'units'}</p>
                        {batch.receivedDate && (
                          <p>Received: {new Date(batch.receivedDate).toLocaleDateString()}</p>
                        )}
                        {batch.expiryDate && (
                          <p>Expiry: {new Date(batch.expiryDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBatch(index)}
                        title="Edit batch"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBatch(index)}
                        title="Delete batch"
                      >
                        <TrashIcon className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <MultiSelect
              label="Tags"
              placeholder="Select tags..."
              options={predefinedTags}
              value={stockFormData.tags}
              onChange={(values) => setStockFormData(prev => ({ ...prev, tags: values }))}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Select one or more tags</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={resetStockForm}>Cancel</Button>
            <Button type="submit" variant="gradient" className="flex-1">
              {isEditingStock ? 'Update Stock Entry' : 'Create Stock Entry'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
