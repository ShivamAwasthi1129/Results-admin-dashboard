'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import { ChevronDownIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface CurrencySelectorProps {
  className?: string;
  showLabel?: boolean;
}

export function CurrencySelector({ className = '', showLabel = true }: CurrencySelectorProps) {
  const { selectedCurrency, currencies, setCurrency, isLoading } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {showLabel && (
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
          Currency
        </label>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--primary-500)] transition-colors text-sm"
      >
        <CurrencyDollarIcon className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="font-medium text-[var(--text-primary)]">
          {selectedCurrency.symbol} {selectedCurrency.code}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {currencies.map((currency) => (
              <button
                key={currency.code}
                onClick={() => {
                  setCurrency(currency.code);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-[var(--bg-input)] transition-colors flex items-center justify-between ${
                  selectedCurrency.code === currency.code ? 'bg-[var(--primary-500)]/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{currency.symbol}</span>
                  <div>
                    <p className="font-medium text-[var(--text-primary)] text-sm">{currency.code}</p>
                    <p className="text-xs text-[var(--text-muted)]">{currency.name}</p>
                  </div>
                </div>
                {selectedCurrency.code === currency.code && (
                  <div className="w-2 h-2 rounded-full bg-[var(--primary-500)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CurrencySelector;

