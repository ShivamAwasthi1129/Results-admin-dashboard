'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  dot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  dot = false,
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  const variantStyles = {
    primary: 'bg-[var(--primary-500)]/15 text-[var(--primary-500)]',
    secondary: 'bg-[var(--bg-input)] text-[var(--text-secondary)]',
    success: 'badge-success',
    danger: 'badge-danger',
    warning: 'badge-warning',
    info: 'badge-info',
  };

  const dotColors = {
    primary: 'bg-[var(--primary-500)]',
    secondary: 'bg-[var(--text-muted)]',
    success: 'bg-[var(--success)]',
    danger: 'bg-[var(--danger)]',
    warning: 'bg-[var(--warning)]',
    info: 'bg-[var(--info)]',
  };

  return (
    <div
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {dot && <span className={cn('w-2 h-2 rounded-full', dotColors[variant])} />}
      {children}
    </div>
  );
};

export default Badge;
