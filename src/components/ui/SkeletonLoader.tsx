'use client';

import React from 'react';

interface SkeletonLoaderProps {
  rows?: number;
  columns?: number;
  variant?: 'table' | 'card' | 'list' | 'grid';
  className?: string;
}

export function SkeletonLoader({ 
  rows = 5, 
  columns = 1, 
  variant = 'table',
  className = '' 
}: SkeletonLoaderProps) {
  if (variant === 'table') {
    return (
      <>
        {[...Array(rows)].map((_, i) => (
          <tr key={i} className="border-b border-[var(--border-color)]/50">
            {[...Array(columns)].map((_, j) => (
              <td key={j} className="px-3 py-2">
                <div className="h-4 skeleton rounded w-full" />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="p-4 border border-[var(--border-color)] rounded-lg">
            <div className="h-4 skeleton rounded w-3/4 mb-3" />
            <div className="h-3 skeleton rounded w-full mb-2" />
            <div className="h-3 skeleton rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 border border-[var(--border-color)] rounded-lg">
            <div className="w-12 h-12 skeleton rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded w-1/3" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="p-4 border border-[var(--border-color)] rounded-lg">
            <div className="w-full h-32 skeleton rounded-lg mb-3" />
            <div className="h-4 skeleton rounded w-3/4 mb-2" />
            <div className="h-3 skeleton rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// Table row skeleton for specific table structures
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-[var(--border-color)]/50">
      {[...Array(columns)].map((_, i) => (
        <td key={i} className="px-3 py-2">
          <div className="h-4 skeleton rounded w-full" />
        </td>
      ))}
    </tr>
  );
}
