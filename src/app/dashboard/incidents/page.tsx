'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Modal, Input, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  DocumentTextIcon,
  ExclamationCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  HomeIcon,
  HeartIcon,
  PaperClipIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { 
  FaShieldAlt, 
  FaDollarSign, 
  FaBalanceScale, 
  FaHome, 
  FaHeartbeat,
  FaFileAlt 
} from 'react-icons/fa';

interface Note {
  content: string;
  createdBy: string;
  createdAt: string;
}

interface TimelineEvent {
  type: 'created' | 'status_updated' | 'assigned' | 'note_added' | 'priority_changed';
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

interface Incident {
  id: string;
  ticketNumber: string;
  type: 'insurance_support' | 'finance_management' | 'legal_assistance' | 'housing' | 'medical' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reportedBy: {
    name: string;
    email: string;
    phone: string;
  };
  assignedTo: string;
  attachments: string[];
  notes: Note[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export default function IncidentsPage() {
  const { token, user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'communication' | 'history'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [newNote, setNewNote] = useState('');
  const [formData, setFormData] = useState({
    type: 'insurance_support',
    title: '',
    description: '',
    priority: 'low',
    status: 'open',
    reportedBy: {
      name: '',
      email: '',
      phone: '',
    },
    assignedTo: 'Unassigned',
  });

  // Fetch incidents from API
  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/incidents', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setIncidents(data.data);
        
        // Auto-seed if no incidents exist
        if (data.data.length === 0) {
          try {
            const seedResponse = await fetch('/api/incidents/seed', { method: 'POST' });
            const seedData = await seedResponse.json();
            if (seedData.success) {
              await fetchIncidents();
              toast.success(`Auto-seeded ${seedData.count} incidents`);
            }
          } catch (seedError) {
            console.error('Auto-seed error:', seedError);
          }
        }
      } else {
        toast.error(data.error || 'Failed to fetch incidents');
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      toast.error('Failed to fetch incidents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchIncidents();
    }
  }, [token]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleView = (incident: Incident) => {
    setSelectedIncident(incident);
    setActiveTab('overview');
    setIsDetailModalOpen(true);
  };

  const handleEdit = (incident: Incident) => {
    setSelectedIncident(incident);
    setFormData({
      type: incident.type,
      title: incident.title,
      description: incident.description,
      priority: incident.priority,
      status: incident.status,
      reportedBy: incident.reportedBy,
      assignedTo: incident.assignedTo,
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this incident?')) {
      return;
    }
    try {
      const response = await fetch(`/api/incidents?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Incident deleted successfully');
        await fetchIncidents();
      } else {
        toast.error(data.error || 'Failed to delete incident');
      }
    } catch (error) {
      console.error('Error deleting incident:', error);
      toast.error('Failed to delete incident');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && selectedIncident) {
        // Update incident
        const response = await fetch('/api/incidents', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: selectedIncident.id,
            ...formData,
          }),
        });
        const data = await response.json();
        if (data.success) {
          toast.success('Incident updated successfully');
          setIsModalOpen(false);
          setIsEditing(false);
          setSelectedIncident(null);
          await fetchIncidents();
        } else {
          toast.error(data.error || 'Failed to update incident');
        }
      } else {
        // Create incident
        const response = await fetch('/api/incidents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        const data = await response.json();
        if (data.success) {
          toast.success('Incident created successfully');
          setIsModalOpen(false);
          resetForm();
          await fetchIncidents();
        } else {
          toast.error(data.error || 'Failed to create incident');
        }
      }
    } catch (error) {
      console.error('Error saving incident:', error);
      toast.error('Failed to save incident');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedIncident) return;

    try {
      const response = await fetch('/api/incidents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: selectedIncident.id,
          note: newNote.trim(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Note added successfully');
        setNewNote('');
        await fetchIncidents();
        // Update selected incident
        const updated = incidents.find(i => i.id === selectedIncident.id);
        if (updated) {
          setSelectedIncident(updated);
        } else {
          // Refetch the incident
          const incidentResponse = await fetch(`/api/incidents?id=${selectedIncident.id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const incidentData = await incidentResponse.json();
          if (incidentData.success && incidentData.data) {
            setSelectedIncident(incidentData.data);
          }
        }
      } else {
        toast.error(data.error || 'Failed to add note');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'insurance_support',
      title: '',
      description: '',
      priority: 'low',
      status: 'open',
      reportedBy: {
        name: '',
        email: '',
        phone: '',
      },
      assignedTo: 'Unassigned',
    });
  };

  const filteredIncidents = incidents.filter(incident => {
    if (filterType !== 'all' && incident.type !== filterType) return false;
    if (filterStatus !== 'all' && incident.status !== filterStatus) return false;
    if (filterPriority !== 'all' && incident.priority !== filterPriority) return false;
    if (searchQuery && 
        !incident.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !incident.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !incident.reportedBy.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      insurance_support: <FaShieldAlt className="w-4 h-4" />,
      finance_management: <FaDollarSign className="w-4 h-4" />,
      legal_assistance: <FaBalanceScale className="w-4 h-4" />,
      housing: <FaHome className="w-4 h-4" />,
      medical: <FaHeartbeat className="w-4 h-4" />,
      other: <FaFileAlt className="w-4 h-4" />,
    };
    return icons[type] || <FaFileAlt className="w-4 h-4" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      insurance_support: 'Insurance Support',
      finance_management: 'Finance Management',
      legal_assistance: 'Legal Assistance',
      housing: 'Housing',
      medical: 'Medical',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, { variant: 'success' | 'danger' | 'warning' | 'info'; bg: string }> = {
      low: { variant: 'info', bg: 'bg-gray-100 text-gray-700' },
      medium: { variant: 'warning', bg: 'bg-amber-100 text-amber-700' },
      high: { variant: 'danger', bg: 'bg-orange-100 text-orange-700' },
      critical: { variant: 'danger', bg: 'bg-red-100 text-red-700' },
    };
    return colors[priority] || colors.low;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { variant: 'success' | 'danger' | 'warning' | 'info'; bg: string; icon: React.ReactNode }> = {
      open: { variant: 'info', bg: 'bg-blue-100 text-blue-700', icon: <ExclamationCircleIcon className="w-3 h-3" /> },
      in_progress: { variant: 'warning', bg: 'bg-yellow-100 text-yellow-700', icon: <ClockIcon className="w-3 h-3" /> },
      resolved: { variant: 'success', bg: 'bg-green-100 text-green-700', icon: <CheckCircleIcon className="w-3 h-3" /> },
      closed: { variant: 'info', bg: 'bg-gray-100 text-gray-700', icon: <CheckCircleIcon className="w-3 h-3" /> },
    };
    return colors[status] || colors.open;
  };

  const getTimelineIcon = (type: string) => {
    const icons: Record<string, { bg: string; icon: React.ReactNode }> = {
      created: { bg: 'bg-blue-500', icon: <ExclamationCircleIcon className="w-4 h-4 text-white" /> },
      status_updated: { bg: 'bg-yellow-500', icon: <ClockIcon className="w-4 h-4 text-white" /> },
      assigned: { bg: 'bg-purple-500', icon: <UserIcon className="w-4 h-4 text-white" /> },
      note_added: { bg: 'bg-green-500', icon: <DocumentTextIcon className="w-4 h-4 text-white" /> },
      priority_changed: { bg: 'bg-red-500', icon: <ExclamationCircleIcon className="w-4 h-4 text-white" /> },
    };
    return icons[type] || icons.created;
  };

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    inProgress: incidents.filter(i => i.status === 'in_progress').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Incident Management" subtitle="Manage and track all incidents">
        <div className="flex items-center justify-center h-64">
          <p className="text-[var(--text-muted)]">Loading incidents...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Incident Management" subtitle="Manage and track all incidents">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Total Incidents</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ExclamationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Open</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.open}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.inProgress}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Resolved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.resolved}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            placeholder="Search by ticket number, title, or reporter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'insurance_support', label: 'Insurance Support' },
            { value: 'finance_management', label: 'Finance Management' },
            { value: 'legal_assistance', label: 'Legal Assistance' },
            { value: 'housing', label: 'Housing' },
            { value: 'medical', label: 'Medical' },
            { value: 'other', label: 'Other' },
          ]}
          value={filterType}
          onChange={(val) => setFilterType(val)}
        />
        <Select
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'closed', label: 'Closed' },
          ]}
          value={filterStatus}
          onChange={(val) => setFilterStatus(val)}
        />
        <Select
          options={[
            { value: 'all', label: 'All Priorities' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' },
          ]}
          value={filterPriority}
          onChange={(val) => setFilterPriority(val)}
        />
        <Button onClick={() => { setIsEditing(false); resetForm(); setIsModalOpen(true); }} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          New Incident
        </Button>
      </div>

      {/* Incidents Table */}
      <Card className="overflow-hidden border border-[var(--border-color)] shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[var(--primary-500)]/15 via-[var(--primary-500)]/10 to-[var(--primary-500)]/5 border-b-2 border-[var(--primary-500)]/30">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider w-12"></th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Ticket #</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Title</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Reported By</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Assigned To</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Priority</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Created</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-primary)]">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-[var(--text-muted)]">
                    No incidents found
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => {
                  const isExpanded = expandedRows.has(incident.id);
                  const priorityColor = getPriorityColor(incident.priority);
                  const statusColor = getStatusColor(incident.status);

                  return (
                    <React.Fragment key={incident.id}>
                      <tr className="hover:bg-[var(--bg-secondary)]/60 transition-all duration-200 group border-b border-[var(--border-color)]/50">
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(incident.id)}
                            className="p-1"
                          >
                            {isExpanded ? (
                              <ChevronUpIcon className="w-4 h-4" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-sm text-[var(--text-primary)]">{incident.ticketNumber}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--primary-500)]">{getTypeIcon(incident.type)}</span>
                            <span className="text-xs text-[var(--text-primary)] truncate max-w-[120px]">
                              {getTypeLabel(incident.type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm text-[var(--text-primary)] truncate block max-w-[200px]">
                            {incident.title}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm text-[var(--text-primary)]">{incident.reportedBy.name}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm text-[var(--text-muted)]">{incident.assignedTo}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={priorityColor.variant} className="text-xs">
                            {incident.priority}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={statusColor.variant} className="text-xs flex items-center gap-1 w-fit">
                            {statusColor.icon}
                            {incident.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs text-[var(--text-muted)]">
                            {new Date(incident.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(incident)}
                              title="View Details"
                              className="p-1 hover:bg-[var(--primary-500)]/10 hover:text-[var(--primary-500)]"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(incident)}
                              title="Edit"
                              className="p-1 hover:bg-blue-500/10 hover:text-blue-500"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(incident.id)}
                              title="Delete"
                              className="p-1 hover:bg-red-500/10 hover:text-red-500"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="px-3 py-4 bg-[var(--bg-secondary)]/30">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Contact Information */}
                              <div>
                                <h4 className="font-semibold text-sm text-[var(--primary-500)] mb-2">Contact Information</h4>
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-2">
                                    <EnvelopeIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                    <span className="text-[var(--text-primary)]">{incident.reportedBy.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <PhoneIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                    <span className="text-[var(--text-primary)]">{incident.reportedBy.phone}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <UserIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                    <span className="text-[var(--text-primary)]">Assigned To: {incident.assignedTo}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Description */}
                              <div>
                                <h4 className="font-semibold text-sm text-[var(--primary-500)] mb-2">Description</h4>
                                <p className="text-xs text-[var(--text-primary)] mb-2">{incident.description}</p>
                                {incident.attachments && incident.attachments.length > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                    <PaperClipIcon className="w-3.5 h-3.5" />
                                    <span>Attachments: {incident.attachments.length} files</span>
                                  </div>
                                )}
                              </div>
                              {/* Timeline */}
                              <div>
                                <h4 className="font-semibold text-sm text-[var(--primary-500)] mb-2">Timeline</h4>
                                <div className="space-y-1 text-xs">
                                  <div>
                                    <span className="text-[var(--text-muted)]">Created: </span>
                                    <span className="text-[var(--text-primary)]">{new Date(incident.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <div>
                                    <span className="text-[var(--text-muted)]">Updated: </span>
                                    <span className="text-[var(--text-primary)]">{new Date(incident.updatedAt).toLocaleDateString()}</span>
                                  </div>
                                  {incident.notes && incident.notes.length > 0 && (
                                    <div className="mt-2">
                                      <span className="text-[var(--text-muted)]">Recent Notes:</span>
                                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                                        {incident.notes.slice(-2).map((note, idx) => (
                                          <li key={idx} className="text-[var(--text-primary)]">{note.content}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Incident Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsEditing(false);
          setSelectedIncident(null);
          resetForm();
        }}
        title={isEditing ? 'Edit Incident' : 'Create New Incident'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Type *
              </label>
              <Select
                options={[
                  { value: 'insurance_support', label: 'Insurance Support' },
                  { value: 'finance_management', label: 'Finance Management' },
                  { value: 'legal_assistance', label: 'Legal Assistance' },
                  { value: 'housing', label: 'Housing' },
                  { value: 'medical', label: 'Medical' },
                  { value: 'other', label: 'Other' },
                ]}
                value={formData.type}
                onChange={(val) => setFormData(prev => ({ ...prev, type: val as any }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Priority *
              </label>
              <Select
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
                value={formData.priority}
                onChange={(val) => setFormData(prev => ({ ...prev, priority: val as any }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter incident title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter detailed description"
              className="w-full px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] resize-none"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Status
              </label>
              <Select
                options={[
                  { value: 'open', label: 'Open' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'closed', label: 'Closed' },
                ]}
                value={formData.status}
                onChange={(val) => setFormData(prev => ({ ...prev, status: val as any }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Assigned To
              </label>
              <Input
                value={formData.assignedTo}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                placeholder="Unassigned"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] pt-4">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">Reporter Information *</h3>
            <div className="grid grid-cols-1 gap-4">
              <Input
                value={formData.reportedBy.name}
                onChange={(e) => setFormData(prev => ({ ...prev, reportedBy: { ...prev.reportedBy, name: e.target.value } }))}
                placeholder="Reporter Name"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="email"
                  value={formData.reportedBy.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportedBy: { ...prev.reportedBy, email: e.target.value } }))}
                  placeholder="Email"
                  required
                />
                <Input
                  value={formData.reportedBy.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportedBy: { ...prev.reportedBy, phone: e.target.value } }))}
                  placeholder="Phone"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setIsEditing(false);
                setSelectedIncident(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditing ? 'Update Incident' : 'Create Incident'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedIncident(null);
            setActiveTab('overview');
            setNewNote('');
          }}
          title="Incident Details"
          subtitle={selectedIncident.ticketNumber}
          size="lg"
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[var(--border-color)]">
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
              onClick={() => setActiveTab('communication')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'communication'
                  ? 'text-[var(--primary-500)] border-b-2 border-[var(--primary-500)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Communication
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'text-[var(--primary-500)] border-b-2 border-[var(--primary-500)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              History
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Type</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--primary-500)]">{getTypeIcon(selectedIncident.type)}</span>
                    <span className="text-sm text-[var(--text-primary)]">{getTypeLabel(selectedIncident.type)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Priority</label>
                  <Badge variant={getPriorityColor(selectedIncident.priority).variant}>
                    {selectedIncident.priority}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Status</label>
                  <Badge variant={getStatusColor(selectedIncident.status).variant} className="flex items-center gap-1 w-fit">
                    {getStatusColor(selectedIncident.status).icon}
                    {selectedIncident.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Assigned To</label>
                  <span className="text-sm text-[var(--text-primary)]">{selectedIncident.assignedTo}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Title</label>
                <p className="text-sm text-[var(--text-primary)]">{selectedIncident.title}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Description</label>
                <p className="text-sm text-[var(--text-primary)]">{selectedIncident.description}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Reported By</label>
                <p className="text-sm text-[var(--text-primary)]">{selectedIncident.reportedBy.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Email</label>
                  <p className="text-sm text-[var(--text-primary)]">{selectedIncident.reportedBy.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Phone</label>
                  <p className="text-sm text-[var(--text-primary)]">{selectedIncident.reportedBy.phone}</p>
                </div>
              </div>

              {selectedIncident.attachments && selectedIncident.attachments.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Attachments</label>
                  <p className="text-sm text-[var(--text-primary)]">{selectedIncident.attachments.length} files</p>
                </div>
              )}
            </div>
          )}

          {/* Communication Tab */}
          {activeTab === 'communication' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">Add Note</h3>
                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a new note or update..."
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] resize-none"
                    rows={4}
                  />
                  <Button type="submit" variant="primary" disabled={!newNote.trim()}>
                    Add Note
                  </Button>
                </form>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">Notes History</h3>
                <div className="space-y-3">
                  {selectedIncident.notes && selectedIncident.notes.length > 0 ? (
                    selectedIncident.notes.map((note, index) => (
                      <Card key={index} className="p-4">
                        <p className="text-sm text-[var(--text-primary)] mb-1">{note.content}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">No notes yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {selectedIncident.timeline && selectedIncident.timeline.length > 0 ? (
                selectedIncident.timeline.map((event, index) => {
                  const eventIcon = getTimelineIcon(event.type);
                  return (
                    <div key={index} className="flex gap-4">
                      <div className={`w-8 h-8 rounded-full ${eventIcon.bg} flex items-center justify-center flex-shrink-0`}>
                        {eventIcon.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-[var(--text-primary)]">{event.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">{event.description}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {new Date(event.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">No history available</p>
              )}
            </div>
          )}
        </Modal>
      )}
    </DashboardLayout>
  );
}

