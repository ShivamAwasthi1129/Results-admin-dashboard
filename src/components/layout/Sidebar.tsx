'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  HomeIcon,
  UsersIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  GlobeAltIcon,
  BellAlertIcon,
  HomeModernIcon,
  CubeIcon,
  HeartIcon,
  DocumentChartBarIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import { Avatar } from '@/components/ui';
import ResultsLogo from '@/Results_logo.png';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['super_admin', 'admin', 'volunteer', 'service_provider'] as const },
    { name: 'Weather', href: '/dashboard/weather', icon: CloudIcon, roles: ['super_admin', 'admin', 'volunteer', 'service_provider'] as const, badge: 'LIVE' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon, roles: ['super_admin', 'admin'] as const },
    { name: 'Live Disasters', href: '/dashboard/live-disasters', icon: GlobeAltIcon, roles: ['super_admin', 'admin'] as const, badge: 'LIVE' },
    { name: 'SOS Alerts', href: '/dashboard/sos', icon: BellAlertIcon, roles: ['super_admin', 'admin'] as const, badge: 'NEW' },
    { name: 'Shelters', href: '/dashboard/shelters', icon: HomeModernIcon, roles: ['super_admin', 'admin', 'volunteer'] as const },
    { name: 'Resources', href: '/dashboard/resources', icon: CubeIcon, roles: ['super_admin', 'admin'] as const },
    { name: 'Donations', href: '/dashboard/donations', icon: HeartIcon, roles: ['super_admin', 'admin'] as const },
    { name: 'Reports', href: '/dashboard/reports', icon: DocumentChartBarIcon, roles: ['super_admin', 'admin'] as const },
    { name: 'Users', href: '/dashboard/users', icon: UsersIcon, roles: ['super_admin', 'admin'] as const },
    { name: 'Disasters', href: '/dashboard/disasters', icon: MapPinIcon, roles: ['super_admin', 'admin'] as const },
    { name: 'Emergencies', href: '/dashboard/emergencies', icon: ExclamationTriangleIcon, roles: ['super_admin', 'admin'] as const },
    { name: 'Volunteers', href: '/dashboard/volunteers', icon: UserGroupIcon, roles: ['super_admin', 'admin'] as const },
    { name: 'Service Providers', href: '/dashboard/services', icon: WrenchScrewdriverIcon, roles: ['super_admin', 'admin', 'service_provider'] as const },
    { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon, roles: ['super_admin', 'admin', 'volunteer', 'service_provider'] as const },
  ];

  const filteredNavigation = navigation.filter(item =>
    hasPermission(item.roles)
  );

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  // Theme-based colors
  const sidebarBg = isDark ? 'bg-[#1e293b]' : 'bg-white';
  const sidebarBorder = isDark ? 'border-[#334155]' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-slate-300' : 'text-gray-600';
  const hoverBg = isDark ? 'hover:bg-[#334155]' : 'hover:bg-gray-100';
  const userCardBg = isDark ? 'bg-[#334155]' : 'bg-gray-100';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Fixed Position */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-72
          ${sidebarBg} border-r ${sidebarBorder}
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
          overflow-hidden
          shadow-xl
        `}
      >
        {/* Logo - Fixed */}
        <div className={`p-6 pb-4 border-b ${sidebarBorder} shrink-0`}>
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <Image 
                src={ResultsLogo} 
                alt="Results Logo" 
                width={140} 
                height={50}
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Role Badge */}
        <div className="px-6 py-4 shrink-0">
          <span className={`text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>
            {user?.role?.replace('_', ' ')}
          </span>
        </div>

        {/* Navigation - Scrollable if needed */}
        <nav className="flex-1 px-4 pb-4 overflow-y-auto scrollbar-thin">
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl
                    font-medium text-sm transition-all duration-200
                    ${active
                      ? 'bg-[#991B1B] text-white shadow-lg shadow-red-900/30'
                      : isDark
                        ? 'text-slate-300 hover:bg-[#334155] hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${active ? 'text-white' : ''}`} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#991B1B] text-white rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile - Fixed at bottom */}
        <div className={`p-4 border-t ${sidebarBorder} shrink-0`}>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${userCardBg} mb-3`}>
            <Avatar name={user?.name || 'User'} size="md" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${textPrimary} truncate`}>
                {user?.name}
              </p>
              <p className={`text-xs ${textSecondary} truncate`}>
                {user?.email}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl
              bg-[#991B1B] text-white font-semibold text-sm
              hover:bg-[#7F1D1D] transition-colors shadow-lg shadow-red-900/20"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
