'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  variant = 'default',
  hover = false,
  padding = 'md',
  ...props 
}) => {
  const baseStyles = "rounded-2xl transition-all duration-300";
  
  // Use custom bg/border classes since global .card now has padding
  const variants = {
    default: "bg-[var(--bg-card)] border border-[var(--border-color)] shadow-lg",
    elevated: "bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl",
    outlined: "bg-transparent border-2 border-[var(--border-color)]",
  };

  const paddings = {
    none: '!p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        paddings[padding],
        hover && "hover:border-[var(--primary-500)] hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
