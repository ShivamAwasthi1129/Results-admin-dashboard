'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, iconPosition = 'left', className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] z-10">
              <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'input-field',
              icon && iconPosition === 'left' && '!pl-14',
              icon && iconPosition === 'right' && '!pr-14',
              error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20',
              className
            )}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[var(--text-muted)] z-10">
              <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
        {helperText && !error && (
          <p className="mt-2 text-sm text-[var(--text-muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
