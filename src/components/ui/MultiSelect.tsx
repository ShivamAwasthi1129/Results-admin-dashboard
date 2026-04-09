'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  maxItems?: number;
  /** Compact row style aligned with native &lt;select&gt; filters; trigger shows placeholder or count only (no chips in the box). */
  variant?: 'default' | 'filter';
}

export function MultiSelect({
  label,
  options,
  value = [],
  onChange,
  placeholder = 'Select options...',
  error,
  helperText,
  required,
  maxItems,
  variant = 'default',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isFilter = variant === 'filter';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      if (maxItems && value.length >= maxItems) return;
      onChange([...value, optionValue]);
    }
  };

  const removeItem = (e: React.MouseEvent | React.KeyboardEvent, optionValue: string) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(value.filter(v => v !== optionValue));
  };

  const selectedLabels = value.map(v => options.find(o => o.value === v)?.label || v);

  const triggerSummary =
    value.length === 0 ? (
      <span className="text-[var(--text-primary)] truncate">{placeholder}</span>
    ) : (
      <span className="text-[var(--text-primary)] truncate">
        {value.length} {value.length === 1 ? 'region' : 'regions'} selected
      </span>
    );

  const triggerInner = isFilter ? (
    triggerSummary
  ) : value.length === 0 ? (
    <span className="text-[var(--text-placeholder)]">{placeholder}</span>
  ) : (
    selectedLabels.map((labelText, index) => (
      <span
        key={value[index]}
        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--primary-500)]/20 text-[var(--primary-500)] rounded-lg text-sm font-medium"
      >
        {labelText}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            removeItem(e, value[index]);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              removeItem(e, value[index]);
            }
          }}
          className="hover:bg-[var(--primary-500)]/30 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:ring-offset-1"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </span>
      </span>
    ))
  );

  const triggerClasses = isFilter
    ? `w-full px-3 py-2.5 min-h-[2.625rem] bg-[var(--bg-card)] border text-left flex items-center gap-2 transition-all cursor-pointer rounded-lg text-sm text-[var(--text-primary)] ${
        isOpen
          ? 'border-purple-500 ring-2 ring-purple-500/20'
          : error
            ? 'border-[var(--danger)]'
            : 'border-[var(--border-color)] hover:border-purple-500/50 focus-visible:outline-none focus-visible:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/20'
      }`
    : `w-full min-h-[52px] px-4 py-3 bg-[var(--bg-input)] border-2 rounded-xl text-left flex items-center gap-2 flex-wrap transition-all cursor-pointer ${
        isOpen
          ? 'border-[var(--primary-500)] ring-4 ring-[var(--primary-500)]/20'
          : error
            ? 'border-[var(--danger)]'
            : 'border-[var(--border-color)] hover:border-[var(--primary-400)]'
      }`;

  const chevronClass = isFilter
    ? `w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`
    : `w-5 h-5 text-[var(--text-muted)] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`;

  const listPanelClass = isFilter
    ? 'absolute z-[9000] top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-2xl overflow-hidden'
    : 'absolute z-50 top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden';

  const optionBtnClass = (isSelected: boolean, isDisabled: boolean) =>
    `w-full text-left flex items-center justify-between transition-colors ${
      isFilter ? 'px-3 py-2.5' : 'px-4 py-3'
    } ${
      isSelected
        ? 'bg-[var(--primary-500)]/10 text-[var(--primary-500)]'
        : isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-[var(--bg-input)] text-[var(--text-primary)]'
    }`;

  return (
    <div className="w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className={`${triggerClasses} ${isFilter ? '' : 'flex-wrap'}`}
        >
          <div
            className={`flex-1 flex min-w-0 ${isFilter ? 'items-center' : 'flex-wrap gap-2 items-center'}`}
          >
            {triggerInner}
          </div>
          <ChevronDownIcon className={chevronClass} />
        </div>

        {isOpen && (
          <div className={listPanelClass}>
            <div className="max-h-60 overflow-y-auto">
              {options.map((option) => {
                const isSelected = value.includes(option.value);
                const isDisabled: boolean = !!(maxItems && !isSelected && value.length >= maxItems);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !isDisabled && toggleOption(option.value)}
                    disabled={isDisabled}
                    className={optionBtnClass(isSelected, isDisabled)}
                  >
                    <span className="font-medium text-sm">{option.label}</span>
                    {isSelected && (
                      <CheckIcon className={`${isFilter ? 'w-4 h-4' : 'w-5 h-5'} text-[var(--primary-500)]`} />
                    )}
                  </button>
                );
              })}
            </div>
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

export default MultiSelect;
