'use client';

import React from 'react';
import PhoneInputWithCountry from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  label,
  placeholder = 'Enter phone number',
  error,
  required = false,
  disabled = false,
  className = '',
}: PhoneInputProps) {
  return (
    <div className={`phone-input-wrapper ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={`phone-input-container ${error ? 'phone-input-error' : ''}`}>
        <PhoneInputWithCountry
          international
          defaultCountry="US"
          countryCallingCodeEditable={false}
          value={value}
          onChange={(val) => onChange(val || '')}
          placeholder={placeholder}
          disabled={disabled}
          className="phone-input-field"
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      <style jsx global>{`
        .phone-input-wrapper {
          width: 100%;
        }
        
        .phone-input-container {
          position: relative;
        }
        
        .phone-input-field {
          width: 100%;
        }
        
        .phone-input-field .PhoneInputInput {
          width: 100%;
          padding: 12px 16px;
          padding-left: 100px;
          border-radius: 12px;
          background-color: var(--bg-input);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        .phone-input-field .PhoneInputInput:focus {
          outline: none;
          border-color: var(--primary-500);
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }
        
        .phone-input-field .PhoneInputInput:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .phone-input-field .PhoneInputCountry {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .phone-input-field .PhoneInputCountryIcon {
          width: 24px;
          height: 18px;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .phone-input-field .PhoneInputCountrySelectArrow {
          color: var(--text-muted);
          opacity: 0.6;
          width: 8px;
          height: 8px;
        }
        
        .phone-input-field .PhoneInputCountrySelect {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 90px;
          opacity: 0;
          cursor: pointer;
        }
        
        .phone-input-error .PhoneInputInput {
          border-color: #ef4444;
        }
        
        .phone-input-error .PhoneInputInput:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
        
        /* Dark mode adjustments */
        [data-theme="dark"] .phone-input-field .PhoneInputInput {
          background-color: var(--bg-input);
          color: var(--text-primary);
        }
        
        [data-theme="dark"] .phone-input-field .PhoneInputCountrySelectArrow {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

export default PhoneInput;

