'use client';

import { apiFetch } from '@/lib/client-api';

export interface RbacRole {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RbacAction {
  id: string;
  actionKey: string;
  module: string;
  displayName?: string;
  description?: string;
  httpMethod?: string;
}

const BASE = '/api/admin/rbac';

export function listRoles(token: string | null, page = 1, limit = 100) {
  return apiFetch<{ success: boolean; data: { roles: RbacRole[]; pagination?: any } }>(
    `${BASE}/roles?page=${page}&limit=${limit}`,
    { token }
  );
}

export function createRole(
  token: string | null,
  payload: { name: string; displayName: string; description?: string }
) {
  return apiFetch<{ success: boolean; data: { role: RbacRole } }>(`${BASE}/roles`, {
    token,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateRole(
  token: string | null,
  roleId: string,
  payload: { displayName?: string; description?: string; isActive?: boolean }
) {
  return apiFetch<{ success: boolean; data: { role: RbacRole } }>(`${BASE}/roles/${roleId}`, {
    token,
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteRole(token: string | null, roleId: string) {
  return apiFetch<{ success: boolean }>(`${BASE}/roles/${roleId}`, {
    token,
    method: 'DELETE',
  });
}

export function listActions(token: string | null, page = 1, limit = 20) {
  return apiFetch<{
    success: boolean;
    data: {
      actions: RbacAction[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }>(`${BASE}/actions?page=${page}&limit=${limit}`, { token });
}

export function listRoleActions(token: string | null, roleId: string) {
  return apiFetch<{ success: boolean; data: { actions: RbacAction[] } }>(`${BASE}/roles/${roleId}/actions`, {
    token,
  });
}

export function bulkAssignRoleActions(token: string | null, roleId: string, actionIds: string[]) {
  return apiFetch<{ success: boolean }>(`${BASE}/roles/${roleId}/actions/bulk`, {
    token,
    method: 'PUT',
    body: JSON.stringify({ actionIds }),
  });
}
