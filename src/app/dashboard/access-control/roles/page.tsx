'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Badge, Button, Card, Input, Modal } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { createRole, deleteRole, listRoles, type RbacRole, updateRole } from '@/lib/rbac-client';
import {
  ShieldCheckIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  IdentificationIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const initialForm = { name: '', displayName: '', description: '' };

export default function RolesManagementPage() {
  const { token, hasAction } = useAuth();
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RbacRole | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const canCreateRoles = hasAction('rbac.roles.create');
  const canUpdateRoles = hasAction('rbac.roles.update');
  const canDeleteRoles = hasAction('rbac.roles.delete');

  const loadRoles = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await listRoles(token, 1, 200);
      setRoles(res.data?.roles || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) =>
      `${r.name} ${r.displayName} ${r.description || ''}`.toLowerCase().includes(q)
    );
  }, [roles, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setOpen(true);
  };

  const openEdit = (role: RbacRole) => {
    setEditing(role);
    setForm({
      name: role.name || '',
      displayName: role.displayName || '',
      description: role.description || '',
    });
    setOpen(true);
  };

  const onSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      if (editing) {
        await updateRole(token, editing.id, {
          displayName: form.displayName.trim(),
          description: form.description.trim(),
        });
      } else {
        await createRole(token, {
          name: form.name.trim(),
          displayName: form.displayName.trim(),
          description: form.description.trim(),
        });
      }
      setOpen(false);
      await loadRoles();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (role: RbacRole) => {
    if (!token) return;
    if (!window.confirm(`Delete role "${role.displayName}"?`)) return;
    await deleteRole(token, role.id);
    await loadRoles();
  };

  return (
    <DashboardLayout
      title="Roles Management"
      subtitle="Create, update and manage dynamic RBAC roles"
      icon={<ShieldCheckIcon className="w-7 h-7" />}
    >
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div className="relative max-w-md w-full">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles by name or key..."
              className="input-field pl-10"
            />
          </div>
          {canCreateRoles && (
            <Button variant="primary" onClick={openCreate} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              Create Role
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6 skeleton h-64">
                <div key={i} />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center space-y-4">
            <ShieldCheckIcon className="w-16 h-16 text-[var(--text-muted)] opacity-20" />
            <div>
              <p className="text-xl font-semibold">No roles identified</p>
              <p className="text-[var(--text-muted)] mt-1">Start by creating a new role for your system access control.</p>
            </div>
            <Button variant="secondary" onClick={() => setQuery('')}>Clear Filter</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filtered.map((role) => (
              <Card key={role.id} className="relative group border border-[var(--border-color)] hover:border-[var(--primary-500)]/50 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col pt-0 px-0 pb-0 overflow-hidden">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-[var(--primary-500)]/10 text-[var(--primary-500)] transition-colors group-hover:bg-[var(--primary-500)] group-hover:text-white">
                      <IdentificationIcon className="w-6 h-6" />
                    </div>
                    <Badge variant={role.isActive === false ? 'warning' : 'success'}>
                      {role.isActive === false ? 'Inactive' : 'Active'}
                    </Badge>
                  </div>

                  <h3 className="text-xl font-bold mb-1 truncate">{role.displayName}</h3>
                  <code className="text-[10px] bg-[var(--bg-secondary)] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-muted)] font-mono">
                    {role.name}
                  </code>

                  <p className="text-sm text-[var(--text-muted)] mt-4 line-clamp-2 min-h-[40px]">
                    {role.description || 'Provide a detailed description of this role\'s administrative responsibilities and access scope.'}
                  </p>
                </div>

                <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] grid grid-cols-2 gap-2">
                  <Link href={`/dashboard/access-control/roles/${role.id}/permissions`} className="w-full">
                    <Button variant="secondary" className="w-full text-xs py-2 px-1 flex items-center justify-center gap-1">
                      <ShieldExclamationIcon className="w-4 h-4" />
                      Permissions
                    </Button>
                  </Link>
                  <div className="flex gap-2">
                    {canUpdateRoles && (
                      <button
                        onClick={() => openEdit(role)}
                        className="flex-1 flex items-center justify-center p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--primary-500)] transition-all"
                        title="Edit Details"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteRoles && (
                      <button
                        onClick={() => onDelete(role)}
                        className="flex-1 flex items-center justify-center p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-red-400 hover:text-red-600 transition-all"
                        title="Delete Role"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Role' : 'Create Role'}
        size="lg"
      >
        <div className="space-y-3">
          <Input
            label="Role Name (SYSTEM_KEY)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={Boolean(editing)}
          />
          <Input
            label="Display Name"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={onSave} disabled={saving || !form.displayName.trim() || (!editing && !form.name.trim())}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
