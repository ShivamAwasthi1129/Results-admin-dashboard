'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T, index: number) => void;
  rowKey?: keyof T | ((item: T, index: number) => string | number);
  className?: string;
  compact?: boolean;
}

function Table<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowKey,
  className = '',
  compact = false,
}: TableProps<T>) {
  const getRowKey = (item: T, index: number): string => {
    let key: string | number;
    if (typeof rowKey === 'function') key = rowKey(item, index);
    else if (rowKey) key = item[rowKey];
    else key = index;
    const s = key != null && key !== '' ? String(key) : `row-${index}`;
    return `table-row-${index}-${s}`;
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
    <div className={cn('w-full', className)}>
      <div className="relative w-full overflow-x-auto overflow-y-visible responsive-table-wrapper">
        <table className="w-full table-fixed responsive-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                {columns.map((column, colIndex) => (
                  <th
                    key={`header-${colIndex}-${column.key as string}`}
                    className={cn(
                      compact ? 'px-2 py-2 sm:px-3 sm:py-2' : 'px-2 py-2 sm:px-3 sm:py-2 md:px-4 md:py-3',
                      'text-xs font-bold uppercase tracking-wider',
                      'text-[var(--text-muted)] bg-[var(--bg-input)]',
                      alignClasses[column.align || 'left'],
                      column.className
                    )}
                    style={{ 
                      width: column.width ??
                             (column.key === 'image' ? '60px' : 
                             column.key === 'name' ? '19%' :
                             column.key === 'category' ? '15%' :
                             column.key === 'price' ? '15%' :
                             column.key === 'stock' ? '12%' :
                             column.key === 'actions' ? 'auto' : 'auto'),
                      minWidth: 0,
                    }}
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
                  {columns.map((column, colIndex) => (
                    <td 
                      key={`skeleton-${i}-${colIndex}-${column.key as string}`} 
                      className={cn(
                        compact ? 'px-2 py-2 sm:px-3 sm:py-2' : 'px-2 py-2 sm:px-3 sm:py-2 md:px-4 md:py-3'
                      )}
                    >
                      <div className="h-5 skeleton rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className={cn(
                    compact ? 'px-3 py-16 sm:px-4' : 'px-3 py-16 sm:px-4 md:px-6',
                    'text-center'
                  )}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--bg-input)] flex items-center justify-center">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-[var(--text-muted)] font-medium text-base sm:text-lg">{emptyMessage}</p>
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
                  {columns.map((column, colIndex) => {
                    const cellValue = getCellValue(item, column);
                    const isCustomRender = column.render !== undefined;
                    return (
                      <td
                        key={`cell-${index}-${colIndex}-${column.key as string}`}
                        className={cn(
                          compact ? 'px-2 py-2 sm:px-3 sm:py-2' : 'px-2 py-2 sm:px-3 sm:py-2 md:px-4 md:py-3',
                          'text-xs sm:text-sm text-[var(--text-primary)]',
                          alignClasses[column.align || 'left'],
                          column.className
                        )}
                        style={{ minWidth: 0 }}
                      >
                        {isCustomRender ? (
                          <div className="min-w-0 overflow-hidden">{cellValue}</div>
                        ) : (
                          <div className="min-w-0 truncate max-w-full">
                            {cellValue}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Scroll indicator for mobile */}
        <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--bg-card)] to-transparent pointer-events-none z-10" />
      </div>
    </div>
  );
}

export default Table;
