'use client';

import React, { useState, useEffect } from 'react';
import {
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '@/context/ThemeContext';

type MaintenanceConfig = {
  globalMaintenance: boolean;
  routes: Record<string, boolean>;
  updatedAt: string | null;
  updatedBy: string | null;
};

const SITE_ROUTES: { path: string; label: string; description: string }[] = [
  { path: '/',                   label: 'Home',                description: 'Main landing page' },
  { path: '/about',              label: 'About',               description: 'About Results.com' },
  { path: '/contact',            label: 'Contact',             description: 'Contact page' },
  { path: '/shop',               label: 'Shop',                description: 'Product shop' },
  { path: '/merch',              label: 'Merch',               description: 'Merchandise store' },
  { path: '/news',               label: 'News',                description: 'News feed' },
  { path: '/news-and-media',     label: 'News & Media',        description: 'News and media page' },
  { path: '/login',              label: 'Login',               description: 'User login page' },
  { path: '/register',           label: 'Register',            description: 'User registration page' },
  { path: '/signup',             label: 'Sign Up',             description: 'Sign up page' },
  { path: '/privacy-policy',     label: 'Privacy Policy',      description: 'Privacy policy page' },
  { path: '/terms-and-condition',label: 'Terms & Conditions',  description: 'Terms and conditions page' },
  { path: '/checkout',           label: 'Checkout',            description: 'Checkout flow' },
  { path: '/checkout-access',    label: 'Checkout Access',     description: 'Checkout access page' },
];

export default function ResultsComMaintenanceClient() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [config, setConfig] = useState<MaintenanceConfig>({
    globalMaintenance: false,
    routes: Object.fromEntries(SITE_ROUTES.map(r => [r.path, false])),
    updatedAt: null,
    updatedBy: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch('/api/results-com/maintenance')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setConfig({
            globalMaintenance: data.config.globalMaintenance,
            routes: { ...Object.fromEntries(SITE_ROUTES.map(r => [r.path, false])), ...data.config.routes },
            updatedAt: data.config.updatedAt,
            updatedBy: data.config.updatedBy,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveConfig = async (updated: MaintenanceConfig) => {
    setSaving(true);
    try {
      const res = await fetch('/api/results-com/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        setConfig({ ...updated, updatedAt: data.config.updatedAt });
        showToast('success', 'Saved successfully');
      } else {
        showToast('error', 'Failed to save');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const toggleGlobal = () => {
    const updated = { ...config, globalMaintenance: !config.globalMaintenance };
    setConfig(updated);
    saveConfig(updated);
  };

  const toggleRoute = (routePath: string) => {
    const updated = {
      ...config,
      routes: { ...config.routes, [routePath]: !config.routes[routePath] },
    };
    setConfig(updated);
    saveConfig(updated);
  };

  const activeCount = Object.values(config.routes).filter(Boolean).length;

  const cardBg = isDark ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-200';
  const tableBg = isDark ? 'bg-[#1e293b]' : 'bg-white';
  const rowHover = isDark ? 'hover:bg-[#334155]/50' : 'hover:bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-[#334155]' : 'border-gray-200';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#991B1B] border-t-transparent rounded-full animate-spin" />
          <p className={`text-sm ${textMuted}`}>Loading maintenance config...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all ${
          toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-[#991B1B] text-white'
        }`}>
          {toast.type === 'success'
            ? <CheckCircleIcon className="w-4 h-4" />
            : <ExclamationTriangleIcon className="w-4 h-4" />
          }
          {toast.msg}
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          Saving...
        </div>
      )}

      {/* Last saved info */}
      {config.updatedAt && (
        <p className={`text-xs ${textMuted}`}>
          Last updated: {new Date(config.updatedAt).toLocaleString()}
          {config.updatedBy && ` by ${config.updatedBy}`}
        </p>
      )}

      {/* Global Maintenance Card */}
      <div className={`border-2 rounded-2xl p-6 transition-all duration-300 ${
        config.globalMaintenance
          ? 'border-[#991B1B] bg-[#991B1B]/5'
          : `${cardBg} border`
      }`}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              config.globalMaintenance ? 'bg-[#991B1B]' : isDark ? 'bg-[#334155]' : 'bg-gray-100'
            }`}>
              <GlobeAltIcon className={`w-6 h-6 ${config.globalMaintenance ? 'text-white' : textMuted}`} />
            </div>
            <div>
              <h3 className={`text-base font-bold ${textPrimary}`}>
                Entire Website Maintenance
              </h3>
              <p className={`text-sm mt-1 leading-relaxed max-w-lg ${textMuted}`}>
                When enabled, ALL pages of Results.com will display the Under Construction screen.
                The admin panel remains fully accessible.
              </p>
              {config.globalMaintenance && (
                <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#991B1B] bg-[#991B1B]/10 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#991B1B] animate-pulse" />
                  SITE IS CURRENTLY DOWN FOR ALL VISITORS
                </div>
              )}
            </div>
          </div>

          {/* Toggle switch */}
          <button
            onClick={toggleGlobal}
            disabled={saving}
            className={`relative flex-shrink-0 w-14 h-7 rounded-full transition-all duration-300 disabled:opacity-50 ${
              config.globalMaintenance ? 'bg-[#991B1B]' : isDark ? 'bg-[#334155]' : 'bg-gray-200'
            }`}
          >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${
              config.globalMaintenance ? 'left-8' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Preview banner when global is ON */}
      {config.globalMaintenance && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            Global maintenance is active. Per-page toggles are disabled until global mode is turned off.
          </p>
        </div>
      )}

      {/* Per-page section */}
      <div className={`border rounded-2xl overflow-hidden ${borderColor} ${tableBg}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor} ${isDark ? 'bg-[#334155]/30' : 'bg-gray-50'}`}>
          <div>
            <h3 className={`text-sm font-bold uppercase tracking-widest ${textPrimary}`}>
              Page-Level Maintenance
            </h3>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              {activeCount > 0
                ? <span className="text-[#991B1B] font-semibold">{activeCount} page{activeCount !== 1 ? 's' : ''} currently under maintenance</span>
                : 'All pages are live'
              }
            </p>
          </div>
          <a
            href="https://results.com/maintenance"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg border border-[#991B1B] text-[#991B1B] hover:bg-[#991B1B] hover:text-white transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            Preview Page
          </a>
        </div>

        {/* Route list */}
        <div className={`divide-y ${borderColor}`}>
          {SITE_ROUTES.map((route) => {
            const isOn = config.routes[route.path] === true;
            return (
              <div
                key={route.path}
                className={`flex items-center justify-between px-6 py-4 transition-colors ${
                  isOn ? (isDark ? 'bg-[#991B1B]/5' : 'bg-red-50') : rowHover
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    isOn ? 'bg-[#991B1B] animate-pulse' : 'bg-green-500'
                  }`} />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${isOn ? 'text-[#991B1B]' : textPrimary}`}>
                        {route.label}
                      </span>
                      <span className={`text-xs font-mono ${textMuted}`}>{route.path}</span>
                      <a
                        href={`https://results.com${route.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`${textMuted} hover:text-[#991B1B] transition-colors`}
                      >
                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                      </a>
                    </div>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>{route.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {isOn && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#991B1B] bg-[#991B1B]/10 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#991B1B] animate-pulse" />
                      MAINTENANCE
                    </span>
                  )}
                  <button
                    onClick={() => toggleRoute(route.path)}
                    disabled={saving || config.globalMaintenance}
                    title={
                      config.globalMaintenance
                        ? 'Disable global maintenance to control individual pages'
                        : isOn ? `Restore ${route.label}` : `Put ${route.label} under maintenance`
                    }
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isOn ? 'bg-[#991B1B]' : isDark ? 'bg-[#334155]' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${
                      isOn ? 'left-6' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info card */}
      <div className={`rounded-2xl p-5 border ${cardBg}`}>
        <h4 className={`text-xs font-bold uppercase tracking-widest ${textMuted} mb-3`}>How It Works</h4>
        <ul className={`space-y-2 text-sm ${textMuted}`}>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#991B1B] mt-2 flex-shrink-0" />
            Toggle any page to instantly redirect visitors to the Under Construction screen on Results.com.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#991B1B] mt-2 flex-shrink-0" />
            The global toggle overrides all individual pages — use it to take the entire site down at once.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#991B1B] mt-2 flex-shrink-0" />
            Changes take effect immediately for new visitors. No deployment needed.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
            The admin dashboard is never affected by maintenance mode.
          </li>
        </ul>
      </div>

    </div>
  );
}
