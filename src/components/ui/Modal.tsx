'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center py-8 px-4 overflow-y-auto">
      {/* Overlay - No blur */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full transform animate-fade-in z-10 my-auto',
          'bg-[var(--bg-card)] rounded-2xl shadow-2xl',
          'border border-[var(--border-color)]',
          'max-h-[calc(100vh-4rem)]',
          'flex flex-col',
          sizes[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header - Sticky */}
        {title && (
          <div className="flex items-center justify-between p-6 md:p-8 pb-5 border-b border-[var(--border-color)] flex-shrink-0">
            <h3 id="modal-title" className="text-xl font-bold text-[var(--text-primary)]">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-all duration-200"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Close button when no title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-all duration-200 z-10"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}

        {/* Body - Scrollable */}
        <div className="p-6 md:p-8 pt-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
