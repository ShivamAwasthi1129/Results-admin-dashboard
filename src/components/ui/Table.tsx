'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T, index: number) => void;
  rowKey?: keyof T | ((item: T, index: number) => string | number);
  className?: string;
}

function Table<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowKey,
  className = '',
}: TableProps<T>) {
  const getRowKey = (item: T, index: number): string | number => {
    if (typeof rowKey === 'function') return rowKey(item, index);
    if (rowKey) return item[rowKey];
    return index;
  };

  const getCellValue = (item: T, column: Column<T>): React.ReactNode => {
    if (column.render) return column.render(item, data.indexOf(item));
    const keys = (column.key as string).split('.');
    let value: any = item;
    for (const key of keys) {
      value = value?.[key];
    }
    return value ?? '-';
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={cn('card overflow-hidden p-0', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-color)]">
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={cn(
                    'px-6 py-4 text-xs font-bold uppercase tracking-wider',
                    'text-[var(--text-muted)] bg-[var(--bg-input)]',
                    alignClasses[column.align || 'left'],
                    column.className
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {columns.map((column) => (
                    <td key={column.key as string} className="px-6 py-4">
                      <div className="h-5 skeleton rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-[var(--bg-input)] flex items-center justify-center">
                      <svg className="w-10 h-10 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-[var(--text-muted)] font-medium text-lg">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={getRowKey(item, index)}
                  className={cn(
                    'table-row transition-colors duration-200',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(item, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key as string}
                      className={cn(
                        'px-6 py-4 text-sm text-[var(--text-primary)]',
                        alignClasses[column.align || 'left'],
                        column.className
                      )}
                    >
                      {getCellValue(item, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
