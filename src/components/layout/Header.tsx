'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSearch } from '@/context/SearchContext';
import { useNotifications } from '@/context/NotificationContext';
import { Avatar } from '@/components/ui';
import NotificationPanel from '@/components/ui/NotificationPanel';
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import ResultsLogo from '@/Results_logo.png';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { openSearch } = useSearch();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openSearch]);

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border-b border-[var(--border-color)]">
      <div className="flex items-center justify-between px-6 lg:px-8 py-5">
        {/* Left: Menu + Title */}
        <div className="flex items-center gap-5">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
          
            <div>
              {title && (
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                  <span>👋</span> {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Search Button */}
          <button
            onClick={openSearch}
            className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] rounded-xl border border-[var(--border-color)] transition-colors min-w-[200px] lg:min-w-[280px]"
          >
            <MagnifyingGlassIcon className="w-5 h-5 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-placeholder)] hidden sm:block">Search...</span>
            <kbd className="hidden md:flex items-center gap-1 px-2 py-1 bg-[var(--bg-card)] rounded-lg text-xs text-[var(--text-muted)] border border-[var(--border-color)] ml-auto">
              ⌘K
            </kbd>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-3 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-all"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <SunIcon className="w-6 h-6 text-amber-400" />
            ) : (
              <MoonIcon className="w-6 h-6 text-purple-500" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-3 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-colors"
            >
              <BellIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationPanel
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 p-2 pr-4 rounded-xl hover:bg-[var(--bg-input)] transition-colors border border-transparent hover:border-[var(--border-color)]"
            >
              <Avatar name={user?.name || 'User'} size="md" src={user?.avatar} />
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name}</p>
                <p className="text-xs text-[var(--text-muted)] capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-3 w-64 bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden z-50 animate-fade-in">
                  {/* User Info */}
                  <div className="p-5 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-4">
                      <Avatar name={user?.name || 'User'} size="lg" src={user?.avatar} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{user?.name}</p>
                        <p className="text-sm text-[var(--text-muted)] truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <UserCircleIcon className="w-5 h-5" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <Cog6ToothIcon className="w-5 h-5" />
                      <span>Settings</span>
                    </Link>
                    <hr className="my-2 border-[var(--border-color)]" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
