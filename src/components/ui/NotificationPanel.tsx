'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, BellIcon, CheckIcon, TrashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '@/context/NotificationContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, clearAll, markAllAsRead } = useNotifications();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
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

  const getTypeStyles = (type?: string) => {
    const styles: Record<string, string> = {
      success: 'border-l-4 border-l-[var(--success)]',
      error: 'border-l-4 border-l-[var(--danger)]',
      warning: 'border-l-4 border-l-[var(--warning)]',
      info: 'border-l-4 border-l-[var(--info)]',
    };
    return styles[type || 'info'] || styles.info;
  };

  const getTypeIcon = (type?: string) => {
    const icons: Record<string, string> = {
      success: '✅',
      error: '🚨',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return icons[type || 'info'] || icons.info;
  };

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Panel - positioned on right */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl flex flex-col animate-slide-in-right z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-pink-500 flex items-center justify-center">
              <BellIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Notifications</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {notifications.filter(n => !n.read).length} unread
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-all duration-200"
            aria-label="Close notifications"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Actions Bar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)]">
            <button
              onClick={markAllAsRead}
              className="text-sm text-[var(--primary-500)] hover:text-[var(--primary-400)] font-medium flex items-center gap-1"
            >
              <CheckIcon className="w-4 h-4" /> Mark all as read
            </button>
            <button
              onClick={clearAll}
              className="text-sm text-[var(--danger)] hover:text-red-400 font-medium flex items-center gap-1"
            >
              <TrashIcon className="w-4 h-4" /> Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-[var(--bg-input)] flex items-center justify-center mb-4">
                <BellIcon className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)]">All caught up!</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">No new notifications</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const handleNotificationClick = () => {
                if (notification.link) {
                  markAsRead(notification.id);
                  onClose();
                  router.push(notification.link);
                }
              };

              return (
                <div
                  key={notification.id}
                  onClick={notification.link ? handleNotificationClick : undefined}
                  className={cn(
                    'p-4 rounded-xl transition-all duration-200',
                    notification.read
                      ? 'bg-[var(--bg-input)] opacity-60'
                      : 'bg-[var(--bg-card-hover)]',
                    getTypeStyles(notification.type),
                    notification.link && 'cursor-pointer hover:bg-[var(--bg-input)] hover:scale-[1.02]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getTypeIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      {notification.title && (
                        <p className={cn(
                          'text-sm font-semibold mb-1',
                          notification.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                        )}>
                          {notification.title}
                        </p>
                      )}
                      <p className={cn(
                        'text-sm',
                        notification.read ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
                      )}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-[var(--text-muted)]">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                        {notification.link && (
                          <span className="text-xs text-[var(--primary-500)] flex items-center gap-1">
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            Click to view
                          </span>
                        )}
                      </div>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                        title="Mark as read"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NotificationPanel;
