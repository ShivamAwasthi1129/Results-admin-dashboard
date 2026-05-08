'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { bulkAssignRoleActions, listActions, listRoleActions, type RbacAction } from '@/lib/rbac-client';
import {
  ShieldCheckIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ChevronDoubleRightIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

export default function RolePermissionsEditorPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ roleId: string }>();
  const roleId = String(params.roleId || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupedActions, setGroupedActions] = useState<Record<string, RbacAction[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!token || !roleId) return;
    setLoading(true);
    try {
      const [actionsRes, roleActionsRes] = await Promise.all([
        listActions(token, 1, 1000), // Fetch a large batch to ensure all actions are available for selection
        listRoleActions(token, roleId),
      ]);
      const roleActionIds = (roleActionsRes.data?.actions || []).map((a) => a.id);
      
      // Manually group actions by module for the UI
      const fetchedActions = actionsRes.data?.actions || [];
      const grouped: Record<string, RbacAction[]> = {};
      fetchedActions.forEach(action => {
        const mod = action.module || 'system';
        if (!grouped[mod]) grouped[mod] = [];
        grouped[mod].push(action);
      });

      setGroupedActions(grouped);
      setSelected(new Set(roleActionIds));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token, roleId]);

  const totalChecked = selected.size;
  const groupedEntries = useMemo(() => Object.entries(groupedActions), [groupedActions]);

  const toggleAction = (actionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);
      return next;
    });
  };

  const toggleModule = (actions: RbacAction[], value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      actions.forEach(a => {
        if (value) next.add(a.id);
        else next.delete(a.id);
      });
      return next;
    });
  };

  const onSave = async () => {
    if (!token || !roleId) return;
    setSaving(true);
    try {
      await bulkAssignRoleActions(token, roleId, Array.from(selected));
      toast.success("Permissions updated successfully");
      router.push('/dashboard/access-control/roles');
    } catch (e) {
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Permissions Editor"
      subtitle={`Configure granular access rights for Role ID: ${roleId}`}
      icon={<ShieldCheckIcon className="w-8 h-8 text-[var(--primary-500)]" />}
    >
      <div className="space-y-6">
        {/* Control Bar */}
        <div className="sticky top-[10px] z-10 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 glass">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => router.push('/dashboard/access-control/roles')} className="!p-2.5">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Dynamic RBAC</p>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-[var(--text-primary)]">Manage Permissions</h2>
                <Badge variant="info" className="!rounded-lg">{totalChecked} Actions Selected</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setSelected(new Set())} disabled={loading || saving}>Reset All</Button>
            <Button variant="primary" onClick={onSave} disabled={saving || loading} className="min-w-[140px]">
              {saving ? 'Syncing...' : 'Save & Publish'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-12 skeleton rounded-2xl" padding="none">
                <div key={i} />
              </Card>
            ))}
          </div>
        ) : groupedEntries.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center space-y-4">
            <CheckCircleIcon className="w-16 h-16 text-[var(--text-muted)] opacity-20" />
            <p className="text-lg font-medium text-[var(--text-muted)]">No registered system actions found.</p>
          </Card>
        ) : (
          <div className="space-y-8 pb-12">
            {groupedEntries.map(([moduleName, actions]) => {
              const moduleActionIds = actions.map(a => a.id);
              const allChecked = moduleActionIds.every(id => selected.has(id));
              const someChecked = moduleActionIds.some(id => selected.has(id)) && !allChecked;

              return (
                <div key={moduleName} className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-6 bg-[var(--primary-500)] rounded-full" />
                      <h3 className="text-xl font-bold capitalize tracking-tight">{moduleName}</h3>
                      <Badge variant="secondary" className="bg-[var(--bg-card)] border border-[var(--border-color)]">
                        {actions.length} Actions
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleModule(actions, !allChecked)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${allChecked ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--primary-500)]'}`}
                      >
                        {allChecked ? 'Deselect All' : 'Select All Module'}
                      </button>
                    </div>
                  </div>

                  <Card className="p-1 overflow-hidden" padding="none">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-px bg-[var(--border-color)]">
                      {actions.map((action) => {
                        const isSelected = selected.has(action.id);
                        return (
                          <label
                            key={action.id}
                            className={`flex items-start gap-3 p-4 cursor-pointer transition-all bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] ${isSelected ? 'ring-1 ring-inset ring-[var(--primary-500)] bg-[var(--primary-500)]/[0.03]' : ''}`}
                          >
                            <div className="relative flex items-center justify-center pt-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleAction(action.id)}
                                className="sr-only peer"
                              />
                              <div className="w-5 h-5 rounded border-2 border-[var(--border-color)] transition-all peer-checked:bg-[var(--primary-500)] peer-checked:border-[var(--primary-500)] flex items-center justify-center">
                                <CheckIcon className={`w-3.5 h-3.5 text-white transition-all transform ${isSelected ? 'scale-100' : 'scale-0'}`} strokeWidth={4} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${isSelected ? 'text-[var(--primary-500)]' : 'text-[var(--text-primary)]'}`}>
                                {action.displayName || action.actionKey.split('.').pop()}
                              </p>
                              <p className="text-[10px] font-mono text-[var(--text-muted)] truncate mb-1">
                                {action.actionKey}
                              </p>
                              {action.description && (
                                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic line-clamp-1 group-hover:line-clamp-none transition-all">
                                  {action.description}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
