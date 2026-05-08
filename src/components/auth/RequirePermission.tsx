'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

interface RequirePermissionProps {
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RequirePermission({ action, children, fallback = null }: RequirePermissionProps) {
  const { hasAction } = useAuth();
  if (!hasAction(action)) return <>{fallback}</>;
  return <>{children}</>;
}
