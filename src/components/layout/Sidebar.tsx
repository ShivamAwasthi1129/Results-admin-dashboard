'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { UserRole } from '@/types';
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
  DocumentChartBarIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldExclamationIcon,
  IdentificationIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  MegaphoneIcon,
  ArchiveBoxIcon,
  EnvelopeIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { Avatar } from '@/components/ui';
import ResultsLogo from '@/Results_logo.png';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly UserRole[];
  action?: string;
  badge?: string;
  children?: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const pathname = usePathname();
  const { user, logout, hasPermission, hasAction, actionKeys } = useAuth();
  const { theme } = useTheme();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const isDark = theme === 'dark';

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['super_admin', 'admin', 'volunteer', 'service_provider', 'member'] as const, action: 'dashboard.stats' },
    
    { name: 'Live Disasters', href: '/dashboard/live-disasters', icon: GlobeAltIcon, roles: ['super_admin', 'admin'] as const, action: 'disasters.list', badge: 'LIVE' },
    { name: 'Live Tracking', href: '/dashboard/tracking', icon: MapPinIcon, roles: ['super_admin', 'admin'] as const, action: 'tracking.list', badge: 'LIVE' },
    { 
      name: 'Alert Management', 
      icon: ShieldExclamationIcon, 
      roles: ['super_admin', 'admin'] as const,
      children: [
        { name: 'Emergencies', href: '/dashboard/emergencies', icon: ExclamationTriangleIcon, roles: ['super_admin', 'admin'] as const, action: 'emergencies.list' },
        { name: 'SOS Alerts', href: '/dashboard/sos', icon: BellAlertIcon, roles: ['super_admin', 'admin'] as const, action: 'sos.list', badge: 'NEW' },
      ]
    },
    { name: 'Housing & Relief', href: '/dashboard/shelters', icon: HomeModernIcon, roles: ['super_admin', 'admin', 'volunteer'] as const, action: 'shelters.list' },
    { name: 'Device Management', href: '/dashboard/devices', icon: DevicePhoneMobileIcon, roles: ['super_admin', 'admin'] as const, action: 'devices.list' },
    { name: 'Incident Management', href: '/dashboard/incidents', icon: ClipboardDocumentListIcon, roles: ['super_admin', 'admin', 'volunteer'] as const, action: 'incidents.list' },
    { name: 'Damage Reports', href: '/dashboard/damage-reports', icon: DocumentTextIcon, roles: ['super_admin', 'admin'] as const, action: 'damageReports.list' },
    { name: 'Broadcast', href: '/dashboard/broadcast', icon: MegaphoneIcon, roles: ['super_admin', 'admin'] as const, action: 'broadcast.list' },
    { name: 'Newsletter', href: '/dashboard/newsletter', icon: EnvelopeIcon, roles: ['super_admin', 'admin'] as const, action: 'newsletter.list' },
    { name: 'Home page management', href: '/dashboard/homepage', icon: Squares2X2Icon, roles: ['super_admin', 'admin'] as const, action: 'landingContent.list' },
    { name: 'Adjusters', href: '/dashboard/adjusters', icon: ClipboardDocumentCheckIcon, roles: ['super_admin', 'admin'] as const, action: 'adjusters.list' },
    { name: 'In-Stock Management', href: '/dashboard/resources', icon: CubeIcon, roles: ['super_admin', 'admin'] as const, action: 'resources.list' },
    { name: 'Products', href: '/dashboard/merchandise', icon: ShoppingBagIcon, roles: ['super_admin', 'admin'] as const, action: 'products.list' },
    { name: 'Printify', href: '/dashboard/printify-stock', icon: ArchiveBoxIcon, roles: ['super_admin', 'admin'] as const, action: 'printify.list' },
    { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCartIcon, roles: ['super_admin', 'admin'] as const, action: 'orders.list' },
    { name: 'Reports & Analytics', href: '/dashboard/reports', icon: DocumentChartBarIcon, roles: ['super_admin', 'admin'] as const, action: 'reports.list' },
    { name: 'Internal Users', href: '/dashboard/users', icon: UsersIcon, roles: ['super_admin', 'admin'] as const, action: 'opsUsers.list' },
    { name: 'User Management', href: '/dashboard/user-management', icon: IdentificationIcon, roles: ['super_admin', 'admin'] as const, action: 'usersMgmt.list' },
    {
      name: 'Access Control',
      icon: ShieldExclamationIcon,
      roles: ['super_admin', 'admin'] as const,
      children: [
        { name: 'Roles', href: '/dashboard/access-control/roles', icon: ShieldExclamationIcon, roles: ['super_admin', 'admin'] as const, action: 'roles.list' },
        { name: 'Actions Directory', href: '/dashboard/access-control/actions', icon: ClipboardDocumentListIcon, roles: ['super_admin', 'admin'] as const, action: 'actions.list' },
      ],
    },
    { name: 'Volunteers', href: '/dashboard/volunteers', icon: UserGroupIcon, roles: ['super_admin', 'admin'] as const, action: 'volunteers.list' },
    { name: 'Vendor & Alliance Partners', href: '/dashboard/services', icon: WrenchScrewdriverIcon, roles: ['super_admin', 'admin', 'service_provider'] as const, action: 'services.list' },
    { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon, roles: ['super_admin', 'admin', 'volunteer', 'service_provider'] as const, action: 'settings.list' },
  ];

  // Filter navigation based on permissions and actions
  const filterNavigation = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      // 1. Super Admins see everything
      const isSuper = user?.roleName === 'SUPER_ADMIN' || user?.role === 'SUPER_ADMIN';
      if (isSuper) return true;

      // 2. If item has a specific action, check if user has ANY action for that module
      if (item.action) {
        const modulePrefix = item.action.split('.')[0];
        const hasAnyModuleAction = actionKeys.some(key => 
          key === '*' || 
          key === modulePrefix || 
          key.startsWith(`${modulePrefix}.`) || 
          key === item.action
        );
        
        if (hasAnyModuleAction) return true;
        // If it has an action but user doesn't have it, don't fall back to role
        return false;
      }
      
      // 3. If item has children, check if any child is accessible
      if (item.children) {
        const filteredChildren = filterNavigation(item.children);
        return filteredChildren.length > 0;
      }
      
      // 4. Fallback for items without actions (check role)
      return hasPermission(item.roles);
    }).map(item => {
      if (item.children) {
        return { ...item, children: filterNavigation(item.children) };
      }
      return item;
    });
  };

  const filteredNavigation = filterNavigation(navigation);

  // Auto-expand parent if any child is active
  useEffect(() => {
    const newExpanded = new Set(expandedItems);
    filteredNavigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => {
          if (!child.href) return false;
          if (child.href === '/dashboard') {
            return pathname === '/dashboard';
          }
          return pathname.startsWith(child.href);
        });
        if (hasActiveChild) {
          newExpanded.add(item.name);
        }
      }
    });
    setExpandedItems(newExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpand = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some(child => isActive(child.href));
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
        {/* <div className="px-6 py-4 shrink-0">
          <span className={`text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>
            {user?.role?.replace('_', ' ')}
          </span>
        </div> */}

        {/* Navigation - Scrollable if needed */}
        <nav className="flex-1 px-4 pb-4 overflow-y-auto scrollbar-thin">
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const active = isActive(item.href);
              const isExpanded = expandedItems.has(item.name);
              const hasActive = hasActiveChild(item);
              
              if (item.children) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleExpand(item.name)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl
                        font-medium text-sm transition-all duration-200
                        ${hasActive
                          ? 'bg-[#991B1B] text-white shadow-lg shadow-red-900/30'
                          : isDark
                            ? 'text-slate-300 hover:bg-[#334155] hover:text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon className={`w-5 h-5 ${hasActive ? 'text-white' : ''}`} />
                      <span className="flex-1 text-left">{item.name}</span>
                      {isExpanded ? (
                        <ChevronDownIcon className={`w-4 h-4 ${hasActive ? 'text-white' : ''}`} />
                      ) : (
                        <ChevronRightIcon className={`w-4 h-4 ${hasActive ? 'text-white' : ''}`} />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-[var(--border-color)] pl-2">
                        {item.children.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.name}
                              href={child.href || '#'}
                              onClick={onClose}
                              className={`
                                flex items-center gap-3 px-4 py-2.5 rounded-lg
                                font-medium text-sm transition-all duration-200
                                ${childActive
                                  ? 'bg-[#991B1B] text-white shadow-md shadow-red-900/20'
                                  : isDark
                                    ? 'text-slate-400 hover:bg-[#334155] hover:text-white'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                }
                              `}
                            >
                              <child.icon className={`w-4 h-4 ${childActive ? 'text-white' : ''}`} />
                              <span className="flex-1">{child.name}</span>
                              {child.badge && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#991B1B] text-white rounded-full animate-pulse">
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href || '#'}
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
       
      </aside>
    </>
  );
};

export default Sidebar;
