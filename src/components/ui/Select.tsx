'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, onChange, icon, className, value, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] z-10">
              <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
            </div>
          )}
          <select
            ref={ref}
            className={cn(
              'input-field appearance-none cursor-pointer !pr-12',
              icon && '!pl-14',
              error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20',
              className
            )}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[var(--text-muted)]">
            <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
        {helperText && !error && (
          <p className="mt-2 text-sm text-[var(--text-muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
