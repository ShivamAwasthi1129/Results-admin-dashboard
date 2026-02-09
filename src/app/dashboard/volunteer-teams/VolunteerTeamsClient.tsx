'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, StatCard, Button, Input, Badge, Modal, Select, Avatar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  ShieldCheckIcon,
  XMarkIcon,
  CheckCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

interface Volunteer {
  _id: string;
  volunteerId: string;
  userId: { _id: string; firstName?: string; lastName?: string; name?: string; email: string; phone?: string };
  profileImage?: string;
  skills?: string[];
  availability?: string;
}

// Helper function to get volunteer name
const getVolunteerName = (volunteer: Volunteer): string => {
  if (volunteer.userId?.firstName && volunteer.userId?.lastName) {
    return `${volunteer.userId.firstName} ${volunteer.userId.lastName}`;
  }
  if (volunteer.userId?.name) {
    return volunteer.userId.name;
  }
  return 'Unknown';
};

interface Team {
  _id: string;
  teamId: string;
  name: string;
  description?: string;
  leadId: string;
  memberIds: string[];
  specialization?: string;
  status: 'active' | 'inactive' | 'on_mission';
  lead?: Volunteer;
  members?: Volunteer[];
  createdAt?: string;
}

interface VolunteerTeamsClientProps {
  initialTeams: Team[];
  initialVolunteers: Volunteer[];
}

export default function VolunteerTeamsClient({ initialTeams, initialVolunteers }: VolunteerTeamsClientProps) {
  const { token, hasPermission } = useAuth();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(initialVolunteers);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leadId: '',
    memberIds: [] as string[],
    specialization: '',
    status: 'active' as 'active' | 'inactive' | 'on_mission',
  });

  const canManage = hasPermission(['super_admin', 'admin']);

  const fetchTeams = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await fetch(`/api/volunteer-teams?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setTeams(data.data.teams);
    } catch (error) {
      toast.error('Failed to fetch teams');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVolunteers = async () => {
    try {
      const response = await fetch('/api/volunteers?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setVolunteers(data.data.volunteers);
    } catch (error) {
      console.error('Failed to fetch volunteers');
    }
  };

  // Fetch teams when search or filter changes (debounced)
  useEffect(() => {
    if (token) {
      const timeoutId = setTimeout(() => {
        fetchTeams();
      }, 500); // Debounce search
      return () => clearTimeout(timeoutId);
    }
  }, [token, search, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedTeam ? `/api/volunteer-teams?id=${selectedTeam._id}` : '/api/volunteer-teams';
      const method = selectedTeam ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(selectedTeam ? 'Team updated!' : 'Team created!');
        setShowModal(false);
        setSelectedTeam(null);
        resetForm();
        fetchTeams();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      leadId: '',
      memberIds: [],
      specialization: '',
      status: 'active',
    });
  };

  const openEditModal = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      leadId: team.leadId,
      memberIds: team.memberIds || [],
      specialization: team.specialization || '',
      status: team.status,
    });
    setShowModal(true);
  };

  const openDetailModal = (team: Team) => {
    setSelectedTeam(team);
    setShowDetailModal(true);
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete team "${team.name}"? This will remove team assignment from all members.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/volunteer-teams?id=${team._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Team deleted successfully');
        fetchTeams();
      } else {
        toast.error(data.error || 'Failed to delete team');
      }
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  const toggleMember = (volunteerId: string) => {
    setFormData(prev => {
      const memberIds = prev.memberIds.includes(volunteerId)
        ? prev.memberIds.filter(id => id !== volunteerId)
        : [...prev.memberIds, volunteerId];
      
      // Ensure lead is always in members
      if (prev.leadId && !memberIds.includes(prev.leadId)) {
        memberIds.push(prev.leadId);
      }
      
      return { ...prev, memberIds };
    });
  };

  const stats = {
    total: teams.length,
    active: teams.filter(t => t.status === 'active').length,
    onMission: teams.filter(t => t.status === 'on_mission').length,
    totalMembers: teams.reduce((acc, t) => acc + (t.memberIds?.length || 0), 0),
  };

  const availableVolunteers = volunteers.filter(v => 
    !formData.memberIds.includes(v._id) || v._id === formData.leadId
  );

  return (
    <DashboardLayout title="Volunteer Teams" subtitle="Manage volunteer teams and assignments" icon={<UserGroupIcon className="w-7 h-7" />}>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Teams" value={stats.total} icon={<UserGroupIcon className="w-6 h-6" />} variant="purple" />
        <StatCard title="Active Teams" value={stats.active} icon={<CheckCircleIcon className="w-6 h-6" />} variant="green" />
        <StatCard title="On Mission" value={stats.onMission} icon={<ShieldCheckIcon className="w-6 h-6" />} variant="orange" />
        <StatCard title="Total Members" value={stats.totalMembers} icon={<UsersIcon className="w-6 h-6" />} variant="teal" />
      </div>

      {/* Filters & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-center">

{/* Search */}
<div className="w-full">
  <Input
    placeholder="Search by team name, ID, specialization..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    icon={<MagnifyingGlassIcon className="w-5 h-5" />}
  />
</div>

{/* Status Filter */}
<div className="w-full">
  <Select 
    value={statusFilter} 
    onChange={(value) => setStatusFilter(value)} 
    options={[
      { value: 'all', label: 'All Status' },
      { value: 'active', label: '🟢 Active' },
      { value: 'on_mission', label: '🟠 On Mission' },
      { value: 'inactive', label: '⚪ Inactive' },
    ]} 
  />
</div>

{/* Create Team */}
{canManage && (
  <div className="w-full">
    <Button 
      onClick={() => { setSelectedTeam(null); resetForm(); setShowModal(true); }} 
      leftIcon={<PlusIcon className="w-4 h-4" />} 
      variant="gradient"
      className="w-full"
    >
      Create Team
    </Button>
  </div>
)}

</div>

      {/* Teams List */}
      <Card>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 border-b border-[var(--border-color)] last:border-b-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--bg-input)] rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--bg-input)] rounded w-1/4" />
                    <div className="h-3 bg-[var(--bg-input)] rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-20">
            <UserGroupIcon className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-secondary)] text-lg">No teams found</p>
            <p className="text-[var(--text-muted)] text-sm mt-2">Try adjusting your filters or create a new team</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-input)]">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Team</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">ID</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Lead</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Members</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Specialization</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {teams.map((team) => (
                  <tr 
                    key={team._id} 
                    className="hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
                    onClick={() => openDetailModal(team)}
                  >
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{team.name}</div>
                        {team.description && (
                          <p className="text-xs text-[var(--text-muted)] line-clamp-1">{team.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs font-bold text-[var(--primary-500)] bg-[var(--primary-500)]/10 px-2 py-1 rounded">
                        {team.teamId}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {team.lead ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={getVolunteerName(team.lead)} size="sm" src={team.lead.profileImage} />
                          <span className="text-sm text-[var(--text-primary)]">{getVolunteerName(team.lead)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-primary)]">{team.memberIds?.length || 0} members</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {team.specialization ? (
                        <Badge variant="primary" size="sm">{team.specialization}</Badge>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge 
                        variant={team.status === 'active' ? 'success' : team.status === 'on_mission' ? 'warning' : 'secondary'} 
                        size="sm"
                        dot
                      >
                        {team.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openDetailModal(team); }}
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--info)] hover:bg-[var(--info)]/10 transition-colors"
                          title="View Details"
                        >
                          <UserIcon className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(team); }}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--warning)] hover:bg-[var(--warning)]/10 transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(team); }}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedTeam ? 'Edit Team' : 'Create New Team'} size="lg">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Input 
              label="Team Name *" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              required 
              placeholder="Search & Rescue Team Alpha"
            />
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3.5 bg-[var(--bg-input)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--primary-500)] focus:ring-4 focus:ring-[var(--primary-500)]/20 transition-all resize-none"
                placeholder="Team description and purpose..."
              />
            </div>

            <Select 
              label="Team Lead *" 
              value={formData.leadId} 
              onChange={(value) => {
                setFormData(prev => {
                  const memberIds = prev.memberIds.includes(value) 
                    ? prev.memberIds 
                    : [...prev.memberIds, value];
                  return { ...prev, leadId: value, memberIds };
                });
              }}
              options={[
                { value: '', label: 'Select Team Lead' },
                ...volunteers.map(v => ({
                  value: v._id,
                  label: `${v.userId?.name || 'Unknown'} (${v.volunteerId})`
                }))
              ]}
              required
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Team Members</label>
              <div className="max-h-60 overflow-y-auto border border-[var(--border-color)] rounded-xl p-4 space-y-2">
                {volunteers.map(volunteer => (
                  <label key={volunteer._id} className="flex items-center gap-3 p-2 hover:bg-[var(--bg-input)] rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.memberIds.includes(volunteer._id)}
                      onChange={() => toggleMember(volunteer._id)}
                      disabled={volunteer._id === formData.leadId}
                      className="w-5 h-5 rounded-lg border-2 border-[var(--border-color)] text-[var(--primary-500)] focus:ring-[var(--primary-500)] disabled:opacity-50"
                    />
                    <Avatar name={volunteer.userId?.name || 'Unknown'} size="sm" src={volunteer.profileImage} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {volunteer.userId?.name || 'Unknown'}
                        {volunteer._id === formData.leadId && (
                          <Badge variant="primary" size="sm" className="ml-2">Lead</Badge>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">{volunteer.volunteerId}</div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Selected: {formData.memberIds.length} member(s). Team lead is automatically included.
              </p>
            </div>

            <Input 
              label="Specialization" 
              value={formData.specialization} 
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} 
              placeholder="Search & Rescue, Medical, Logistics, etc."
            />

            <Select 
              label="Status" 
              value={formData.status} 
              onChange={(value) => setFormData({ ...formData, status: value as any })} 
              options={[
                { value: 'active', label: '🟢 Active' },
                { value: 'on_mission', label: '🟠 On Mission' },
                { value: 'inactive', label: '⚪ Inactive' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-[var(--border-color)]">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="gradient">{selectedTeam ? 'Update Team' : 'Create Team'}</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Team Details" size="lg">
        {selectedTeam && (
          <div className="space-y-6">
            <div className="p-5 bg-gradient-to-r from-[var(--primary-500)]/10 to-[var(--primary-700)]/10 rounded-2xl">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{selectedTeam.name}</h3>
              <p className="text-[var(--primary-500)] font-mono font-bold">ID: {selectedTeam.teamId}</p>
              {selectedTeam.description && (
                <p className="text-[var(--text-secondary)] mt-2">{selectedTeam.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4">
                <Badge variant={selectedTeam.status === 'active' ? 'success' : 'warning'} size="sm" dot>
                  {selectedTeam.status?.replace('_', ' ')}
                </Badge>
                {selectedTeam.specialization && (
                  <Badge variant="primary" size="sm">{selectedTeam.specialization}</Badge>
                )}
              </div>
            </div>

            {selectedTeam.lead && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Team Lead</h4>
                <div className="p-4 bg-[var(--bg-input)] rounded-xl flex items-center gap-4">
                  <Avatar name={getVolunteerName(selectedTeam.lead)} size="md" src={selectedTeam.lead.profileImage} />
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--text-primary)]">{getVolunteerName(selectedTeam.lead)}</div>
                    <div className="text-sm text-[var(--text-muted)]">ID: {selectedTeam.lead.volunteerId}</div>
                    <div className="text-sm text-[var(--text-muted)]">{selectedTeam.lead.userId?.email || 'N/A'}</div>
                  </div>
                  <Badge variant="primary" size="sm">Lead</Badge>
                </div>
              </div>
            )}

            {selectedTeam.members && selectedTeam.members.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Team Members ({selectedTeam.members.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedTeam.members.map((member) => (
                    <div key={member._id} className="p-4 bg-[var(--bg-input)] rounded-xl flex items-center gap-4">
                      <Avatar name={getVolunteerName(member)} size="sm" src={member.profileImage} />
                      <div className="flex-1">
                        <div className="font-medium text-[var(--text-primary)]">{getVolunteerName(member)}</div>
                        <div className="text-sm text-[var(--text-muted)]">ID: {member.volunteerId}</div>
                        {member.skills && member.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.skills.slice(0, 3).map((skill, i) => (
                              <Badge key={i} variant="secondary" size="sm">{skill}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {member._id === selectedTeam.leadId && (
                        <Badge variant="primary" size="sm">Lead</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canManage && (
              <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border-color)]">
                <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
                <Button variant="gradient" onClick={() => { setShowDetailModal(false); openEditModal(selectedTeam); }}>
                  <PencilIcon className="w-4 h-4 mr-2" /> Edit
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

