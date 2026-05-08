'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types';
import { toast } from 'react-toastify';
import { apiFetch } from '@/lib/client-api';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  roleId?: string;
  roleName?: string;
  actionKeys?: string[];
  phone: string;
  avatar?: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  actionKeys: string[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (requiredRoles: readonly UserRole[]) => boolean;
  hasAction: (requiredAction: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeRoleName = (u: User | null): string => {
  if (!u) return '';
  return String(u.roleName || u.role || '').toUpperCase();
};

const isSuperAdmin = (u: User | null): boolean => normalizeRoleName(u) === 'SUPER_ADMIN';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [actionKeys, setActionKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 403) {
        try {
          const cloned = response.clone();
          const payload = await cloned.json();
          const errorData = payload?.error;
          if (errorData?.code === 'PERMISSION_DENIED') {
            toast.error(`Access Denied: You do not have '${errorData.requiredAction || 'required'}' permission.`);
          } else {
            toast.error(payload?.message || payload?.error || 'Forbidden');
          }
        } catch {
          toast.error('Forbidden');
        }
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('auth-token');
      if (!storedToken) {
        setActionKeys([]);
        setIsLoading(false);
        return;
      }

      const data = await apiFetch<{ success: boolean; data?: { user: User } }>('/api/auth/me', {
        token: storedToken,
        suppressErrorToast: true,
      });
      if (data.success && data.data?.user) {
        const nextUser = data.data.user;
        setUser(nextUser);
        setToken(storedToken);
        if (isSuperAdmin(nextUser)) {
          setActionKeys(['*']);
        } else {
          const actions = (data as any).data?.actions || (data as any).actions || nextUser.actionKeys || (nextUser as any).actions || [];
          setActionKeys(actions);
        }
      } else {
        localStorage.removeItem('auth-token');
        setUser(null);
        setToken(null);
        setActionKeys([]);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      localStorage.removeItem('auth-token');
      setUser(null);
      setToken(null);
      setActionKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const nextUser = (data.data?.user || data.user) as User;
        const nextToken = data.data?.token || data.token;
        const nextActions = data.data?.actions || data.actions || nextUser.actionKeys || (nextUser as any).actions || [];
        
        setUser(nextUser);
        setToken(nextToken);
        setActionKeys(nextActions);
        localStorage.setItem('auth-token', nextToken);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth-token');
      setUser(null);
      setToken(null);
      setActionKeys([]);
      router.push('/login');
    }
  };

  const hasPermission = (requiredRoles: readonly UserRole[]) => {
    if (!user) return false;
    if (isSuperAdmin(user)) return true;
    const role = String(user.role || '').toLowerCase() as UserRole;
    return requiredRoles.includes(role);
  };

  const hasAction = (requiredAction: string) => {
    if (!requiredAction) return true;
    if (!user) return false;
    if (isSuperAdmin(user)) return true;
    return actionKeys.includes(requiredAction);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        actionKeys,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

