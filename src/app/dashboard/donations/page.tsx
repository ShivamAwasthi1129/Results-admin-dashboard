'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Modal, Input, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  HeartIcon,
  CurrencyRupeeIcon,
  UserIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
  CubeIcon,
  TruckIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Donation {
  id: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  type: 'monetary' | 'supplies' | 'equipment' | 'services';
  amount?: number;
  items?: string;
  quantity?: number;
  status: 'pending' | 'received' | 'utilized' | 'acknowledged';
  disasterId?: string;
  disasterName?: string;
  createdAt: string;
  notes?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)] shadow-xl">
        <p className="text-[var(--text-muted)] text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-[var(--text-primary)] font-semibold">
            {entry.name}: ₹{entry.value?.toLocaleString() || entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DonationsPage() {
  const { token } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data
  useEffect(() => {
    const mockDonations: Donation[] = [
      { id: '1', donorName: 'Tata Trusts', donorEmail: 'donations@tatatrusts.org', donorPhone: '+91 22 6665 8282', type: 'monetary', amount: 5000000, status: 'received', disasterName: 'Kerala Floods 2024', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), notes: 'Emergency relief fund' },
      { id: '2', donorName: 'Reliance Foundation', donorEmail: 'csr@reliancefoundation.org', donorPhone: '+91 22 4478 0000', type: 'supplies', items: 'Food Packets, Water Bottles, Medicines', quantity: 50000, status: 'utilized', disasterName: 'Gujarat Cyclone Relief', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: '3', donorName: 'Rajesh Kumar', donorEmail: 'rajesh.k@email.com', donorPhone: '+91 98765 43210', type: 'monetary', amount: 25000, status: 'acknowledged', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
      { id: '4', donorName: 'Infosys Foundation', donorEmail: 'foundation@infosys.com', donorPhone: '+91 80 2852 0261', type: 'equipment', items: 'Water Purifiers, Solar Lights', quantity: 500, status: 'received', disasterName: 'Assam Floods', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: '5', donorName: 'Dr. Priya Sharma', donorEmail: 'priya.doc@hospital.com', donorPhone: '+91 87654 32109', type: 'services', items: 'Medical Services (100 hours)', status: 'pending', createdAt: new Date().toISOString(), notes: 'Offering free medical camps' },
      { id: '6', donorName: 'Anonymous Donor', donorEmail: 'anonymous@email.com', donorPhone: 'N/A', type: 'monetary', amount: 100000, status: 'received', createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
      { id: '7', donorName: 'Local Business Association', donorEmail: 'lba@business.com', donorPhone: '+91 76543 21098', type: 'supplies', items: 'Blankets, Clothing, Utensils', quantity: 2000, status: 'pending', createdAt: new Date(Date.now() - 0.5 * 86400000).toISOString() },
    ];

    setTimeout(() => {
      setDonations(mockDonations);
      setIsLoading(false);
    }, 500);
  }, []);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      monetary: <CurrencyRupeeIcon className="w-5 h-5" />,
      supplies: <CubeIcon className="w-5 h-5" />,
      equipment: <TruckIcon className="w-5 h-5" />,
      services: <HeartIcon className="w-5 h-5" />,
    };
    return icons[type] || icons.monetary;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      monetary: 'from-emerald-500 to-teal-500',
      supplies: 'from-orange-500 to-amber-500',
      equipment: 'from-blue-500 to-indigo-500',
      services: 'from-pink-500 to-rose-500',
    };
    return colors[type] || colors.monetary;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'primary'> = {
      pending: 'warning',
      received: 'info',
      utilized: 'success',
      acknowledged: 'primary',
    };
    return variants[status] || 'info';
  };

  const handleStatusUpdate = (id: string, newStatus: string) => {
    setDonations(prev => prev.map(d => 
      d.id === id ? { ...d, status: newStatus as Donation['status'] } : d
    ));
    toast.success(`Donation status updated to ${newStatus}`);
  };

  const filteredDonations = donations.filter(donation => {
    if (filterType !== 'all' && donation.type !== filterType) return false;
    if (filterStatus !== 'all' && donation.status !== filterStatus) return false;
    if (searchQuery && 
        !donation.donorName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !donation.donorEmail.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Chart data
  const monthlyData = [
    { month: 'Jan', amount: 1500000 },
    { month: 'Feb', amount: 2200000 },
    { month: 'Mar', amount: 1800000 },
    { month: 'Apr', amount: 2800000 },
    { month: 'May', amount: 3500000 },
    { month: 'Jun', amount: 5200000 },
  ];

  const typeDistribution = [
    { type: 'Monetary', count: donations.filter(d => d.type === 'monetary').length },
    { type: 'Supplies', count: donations.filter(d => d.type === 'supplies').length },
    { type: 'Equipment', count: donations.filter(d => d.type === 'equipment').length },
    { type: 'Services', count: donations.filter(d => d.type === 'services').length },
  ];

  const stats = {
    totalMonetary: donations.filter(d => d.type === 'monetary').reduce((sum, d) => sum + (d.amount || 0), 0),
    totalDonors: new Set(donations.map(d => d.donorEmail)).size,
    pendingCount: donations.filter(d => d.status === 'pending').length,
    thisMonth: donations.filter(d => new Date(d.createdAt).getMonth() === new Date().getMonth()).length,
  };

  return (
    <DashboardLayout title="Donation Management" subtitle="Track and manage relief donations">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <BanknotesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Total Monetary</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">₹{(stats.totalMonetary / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Total Donors</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats.totalDonors}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Pending</p>
              <p className="text-xl font-bold text-orange-400">{stats.pendingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">This Month</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats.thisMonth}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Monthly Donations Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `₹${v/100000}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="amount" name="Amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Donation Types</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                <YAxis dataKey="type" type="category" stroke="var(--text-muted)" fontSize={12} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Donations" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            placeholder="Search by donor name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'monetary', label: 'Monetary' },
            { value: 'supplies', label: 'Supplies' },
            { value: 'equipment', label: 'Equipment' },
            { value: 'services', label: 'Services' },
          ]}
          value={filterType}
          onChange={setFilterType}
        />
        <Select
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'received', label: 'Received' },
            { value: 'utilized', label: 'Utilized' },
            { value: 'acknowledged', label: 'Acknowledged' },
          ]}
          value={filterStatus}
          onChange={setFilterStatus}
        />
      </div>

      {/* Donations List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-[var(--bg-input)] rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-[var(--bg-input)] rounded w-1/3" />
                  <div className="h-4 bg-[var(--bg-input)] rounded w-2/3" />
                </div>
              </div>
            </Card>
          ))
        ) : filteredDonations.length === 0 ? (
          <Card className="p-12 text-center">
            <HeartIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">No Donations Found</p>
            <p className="text-[var(--text-muted)]">No donations match your current filters</p>
          </Card>
        ) : (
          filteredDonations.map((donation) => (
            <Card 
              key={donation.id} 
              className="p-6 hover:border-[var(--primary-500)]/50 transition-all cursor-pointer"
              onClick={() => { setSelectedDonation(donation); setIsModalOpen(true); }}
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getTypeColor(donation.type)} flex items-center justify-center flex-shrink-0`}>
                  {getTypeIcon(donation.type)}
                  <span className="text-white">{donation.type === 'monetary' && <CurrencyRupeeIcon className="w-6 h-6" />}</span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">{donation.donorName}</h3>
                      <p className="text-sm text-[var(--text-muted)]">{donation.donorEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadge(donation.status)} size="sm">
                        {donation.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {donation.type === 'monetary' ? (
                      <span className="font-bold text-emerald-400 text-lg">₹{donation.amount?.toLocaleString()}</span>
                    ) : (
                      <span className="text-[var(--text-secondary)]">
                        {donation.items} {donation.quantity && `(${donation.quantity} units)`}
                      </span>
                    )}
                    {donation.disasterName && (
                      <Badge variant="info" size="sm">
                        {donation.disasterName}
                      </Badge>
                    )}
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {new Date(donation.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2 flex-shrink-0">
                  {donation.status === 'pending' && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(donation.id, 'received'); }}
                    >
                      Mark Received
                    </Button>
                  )}
                  {donation.status === 'received' && (
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(donation.id, 'utilized'); }}
                    >
                      Mark Utilized
                    </Button>
                  )}
                  {donation.status === 'utilized' && (
                    <Button 
                      variant="gradient" 
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(donation.id, 'acknowledged'); }}
                    >
                      Send Thanks
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedDonation(null); }}
        title="Donation Details"
        size="lg"
      >
        {selectedDonation && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getTypeColor(selectedDonation.type)} flex items-center justify-center`}>
                {selectedDonation.type === 'monetary' ? (
                  <CurrencyRupeeIcon className="w-8 h-8 text-white" />
                ) : selectedDonation.type === 'supplies' ? (
                  <CubeIcon className="w-8 h-8 text-white" />
                ) : selectedDonation.type === 'equipment' ? (
                  <TruckIcon className="w-8 h-8 text-white" />
                ) : (
                  <HeartIcon className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedDonation.donorName}</h3>
                <p className="text-[var(--text-muted)]">{selectedDonation.donorEmail}</p>
              </div>
              <Badge variant={getStatusBadge(selectedDonation.status)} className="ml-auto">
                {selectedDonation.status}
              </Badge>
            </div>

            {selectedDonation.type === 'monetary' ? (
              <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-center">
                <p className="text-sm text-[var(--text-muted)] mb-2">Donation Amount</p>
                <p className="text-4xl font-bold text-emerald-400">₹{selectedDonation.amount?.toLocaleString()}</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">Items Donated</p>
                <p className="text-[var(--text-primary)] font-medium">{selectedDonation.items}</p>
                {selectedDonation.quantity && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Quantity: {selectedDonation.quantity} units</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Phone</p>
                <p className="font-medium text-[var(--text-primary)]">{selectedDonation.donorPhone}</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Date</p>
                <p className="font-medium text-[var(--text-primary)]">{new Date(selectedDonation.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {selectedDonation.disasterName && (
              <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Allocated To</p>
                <p className="font-medium text-[var(--text-primary)]">{selectedDonation.disasterName}</p>
              </div>
            )}

            {selectedDonation.notes && (
              <div className="p-4 rounded-xl bg-[var(--bg-input)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Notes</p>
                <p className="text-[var(--text-secondary)]">{selectedDonation.notes}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>
                Close
              </Button>
              {selectedDonation.status !== 'acknowledged' && (
                <Button variant="gradient" className="flex-1">
                  Generate Receipt
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

