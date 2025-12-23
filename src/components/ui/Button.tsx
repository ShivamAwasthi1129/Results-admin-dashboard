'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Loader from './Loader';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center font-semibold rounded-xl
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  `;

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-2.5',
  };

  const variantStyles = {
    primary: `
      bg-[var(--primary-600)] text-white
      hover:bg-[var(--primary-700)] hover:-translate-y-0.5
      shadow-lg shadow-[var(--primary-600)]/25
      hover:shadow-xl hover:shadow-[var(--primary-600)]/30
    `,
    secondary: `
      bg-[var(--bg-input)] text-[var(--text-primary)]
      border border-[var(--border-color)]
      hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-light)]
    `,
    danger: `
      bg-[var(--danger)] text-white
      hover:opacity-90 hover:-translate-y-0.5
      shadow-lg shadow-[var(--danger)]/25
    `,
    success: `
      bg-[var(--success)] text-white
      hover:opacity-90 hover:-translate-y-0.5
      shadow-lg shadow-[var(--success)]/25
    `,
    ghost: `
      bg-transparent text-[var(--text-secondary)]
      hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]
    `,
    gradient: `
      bg-gradient-to-r from-[var(--primary-500)] to-[var(--primary-700)] text-white
      hover:-translate-y-0.5
      shadow-lg shadow-[var(--primary-500)]/30
      hover:shadow-xl hover:shadow-[var(--primary-500)]/40
    `,
  };

  return (
    <button
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && 'w-full',
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <Loader size={size === 'sm' ? 'sm' : 'md'} color="white" />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
