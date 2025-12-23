'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'purple' | 'pink' | 'green' | 'orange' | 'blue' | 'red' | 'teal';
  iconColor?: 'purple' | 'pink' | 'green' | 'orange' | 'blue' | 'red' | 'teal';
  iconBgClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  description,
  trend,
  variant = 'purple',
  iconColor,
  iconBgClass,
  className,
  ...props
}) => {
  const color = iconColor || variant;
  
  const iconColors = {
    purple: 'from-[var(--primary-500)] to-[var(--primary-600)]',
    pink: 'from-pink-500 to-pink-600',
    green: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    teal: 'from-teal-500 to-teal-600',
  };

  const shadowColors = {
    purple: 'shadow-[var(--primary-500)]/30',
    pink: 'shadow-pink-500/30',
    green: 'shadow-emerald-500/30',
    orange: 'shadow-orange-500/30',
    blue: 'shadow-blue-500/30',
    red: 'shadow-red-500/30',
    teal: 'shadow-teal-500/30',
  };

  return (
    <div
      className={cn(
        'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6',
        'flex items-start gap-5 hover:border-[var(--primary-500)]/50 transition-all duration-300 shadow-lg',
        className
      )}
      {...props}
    >
      {icon && (
        <div
          className={cn(
            'flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center',
            iconBgClass ? iconBgClass : cn('bg-gradient-to-br shadow-lg', iconColors[color], shadowColors[color])
          )}
        >
          <span className={iconBgClass ? '' : 'text-white'}>{icon}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-muted)] mb-1">{title}</p>
        <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
        {subtitle && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
        )}
        {description && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
        )}
        {trend && (
          <div className={cn(
            'flex items-center gap-1 mt-2 text-sm font-medium',
            trend.isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
          )}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}% from last month</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
