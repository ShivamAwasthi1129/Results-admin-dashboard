'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import SearchModal from '@/components/ui/SearchModal';
import { Loader } from '@/components/ui';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  noPadding?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  icon,
  noPadding = false,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <Loader size="lg" />
          <p className="mt-4 text-[var(--text-muted)]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Sidebar - Fixed */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Area - Offset by sidebar width */}
      <div className="lg:ml-72 min-h-screen flex flex-col">
        {/* Header - Sticky */}
        <Header
          title={title}
          subtitle={subtitle}
          icon={icon}
          onMenuClick={() => setSidebarOpen(true)}
        />
        
        {/* Main Content - Scrollable */}
        <main className={`flex-1 overflow-auto ${noPadding ? '' : 'px-4 sm:px-6 lg:px-8 py-4'}`}>
          <div className="mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <SearchModal />
    </div>
  );
};

export default DashboardLayout;
