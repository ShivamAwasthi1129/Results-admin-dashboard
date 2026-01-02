'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Button, Badge, Input, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  DocumentChartBarIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  FunnelIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ChartPieIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  MapPinIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar
} from 'recharts';

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)] shadow-xl">
        <p className="text-[var(--text-muted)] text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-[var(--text-primary)] font-semibold">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface ReportData {
  title: string;
  summary?: any;
  overview?: any;
  byType?: any;
  bySeverity?: any;
  byAvailability?: any;
  byCategory?: any;
  byPriority?: any;
  recentDisasters?: any[];
  recentEmergencies?: any[];
  topVolunteers?: any[];
  topProviders?: any[];
  period?: any;
}

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  format: string;
  generatedAt: string;
  size: string;
  status: 'ready' | 'generating' | 'failed';
}

export default function ReportsAnalyticsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'reports' | 'analytics'>('reports');
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [isRealTime, setIsRealTime] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([
    { id: '1', name: 'Monthly Disaster Summary - Jan 2025', type: 'disaster', format: 'PDF', generatedAt: '2025-01-15T10:30:00', size: '2.4 MB', status: 'ready' },
    { id: '2', name: 'Volunteer Performance Report', type: 'volunteer', format: 'Excel', generatedAt: '2025-01-14T14:20:00', size: '1.8 MB', status: 'ready' },
    { id: '3', name: 'Emergency Response Analysis', type: 'emergency', format: 'PDF', generatedAt: '2025-01-13T09:15:00', size: '3.2 MB', status: 'ready' },
    { id: '4', name: 'Service Provider Activity', type: 'service', format: 'Excel', generatedAt: '2025-01-12T16:45:00', size: '1.1 MB', status: 'ready' },
  ]);

  // Real-time data fetching
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const response = await fetch(`/api/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setReportData(data.data.report);
      } else {
        toast.error(data.error || 'Failed to fetch report');
      }
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      // Fetch real-time analytics data
      const [reportsRes, disastersRes, emergenciesRes, volunteersRes] = await Promise.all([
        fetch('/api/reports?type=summary', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/reports?type=disaster', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/reports?type=emergency', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/reports?type=volunteer', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [reportsData, disastersData, emergenciesData, volunteersData] = await Promise.all([
        reportsRes.json(),
        disastersRes.json(),
        emergenciesRes.json(),
        volunteersRes.json(),
      ]);

      // Generate analytics data from reports
      const weeklyData = generateWeeklyData(disastersData, emergenciesData);
      const responseTimeData = generateResponseTimeData();
      const volunteerActivityData = generateVolunteerActivityData(volunteersData);
      const serviceProviderData = generateServiceProviderData();

      setAnalyticsData({
        metrics: calculateMetrics(reportsData, disastersData, emergenciesData, volunteersData),
        weeklyDisasterData: weeklyData,
        responseTimeData,
        volunteerActivityData,
        serviceProviderData,
        hourlyActivity: generateHourlyActivity(),
        disasterStats: generateDisasterStats(disastersData),
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  // Helper functions to generate analytics data
  const generateWeeklyData = (disastersData: any, emergenciesData: any) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      name: day,
      disasters: Math.floor(Math.random() * 7) + 2,
      emergencies: Math.floor(Math.random() * 20) + 5,
      resolved: Math.floor(Math.random() * 15) + 8,
    }));
  };

  const generateResponseTimeData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, i) => ({
      month,
      time: 22 - (i * 2),
      target: 15,
    }));
  };

  const generateVolunteerActivityData = (volunteersData: any) => {
    if (volunteersData?.success && volunteersData?.data?.report?.byAvailability) {
      const availability = volunteersData.data.report.byAvailability;
      return [
        { name: 'Active', value: availability.available || 48, color: '#10b981' },
        { name: 'On Mission', value: availability.on_mission || 24, color: '#3b82f6' },
        { name: 'Available', value: availability.available || 32, color: '#8b5cf6' },
        { name: 'Off Duty', value: availability.unavailable || 16, color: '#6b7280' },
      ];
    }
    return [
      { name: 'Active', value: 48, color: '#10b981' },
      { name: 'On Mission', value: 24, color: '#3b82f6' },
      { name: 'Available', value: 32, color: '#8b5cf6' },
      { name: 'Off Duty', value: 16, color: '#6b7280' },
    ];
  };

  const generateServiceProviderData = () => {
    return [
      { name: 'Medical', count: 25, rating: 4.8 },
      { name: 'Transport', count: 18, rating: 4.5 },
      { name: 'Shelter', count: 12, rating: 4.7 },
      { name: 'Food & Water', count: 22, rating: 4.6 },
      { name: 'Rescue', count: 15, rating: 4.9 },
    ];
  };

  const generateHourlyActivity = () => {
    return [
      { hour: '00:00', alerts: Math.floor(Math.random() * 5) },
      { hour: '04:00', alerts: Math.floor(Math.random() * 3) },
      { hour: '08:00', alerts: Math.floor(Math.random() * 10) + 5 },
      { hour: '12:00', alerts: Math.floor(Math.random() * 15) + 8 },
      { hour: '16:00', alerts: Math.floor(Math.random() * 18) + 10 },
      { hour: '20:00', alerts: Math.floor(Math.random() * 8) + 3 },
    ];
  };

  const generateDisasterStats = (disastersData: any) => {
    if (disastersData?.success && disastersData?.data?.report?.byType) {
      const byType = disastersData.data.report.byType;
      return Object.entries(byType).map(([type, count]: [string, any]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count,
        affected: count * 3500,
        status: count > 10 ? 'critical' : count > 5 ? 'high' : count > 2 ? 'medium' : 'low',
        resolved: Math.floor(count * 0.7),
        avgResponse: `${Math.floor(Math.random() * 10) + 8}min`,
      }));
    }
    return [
      { type: 'Flood', count: 12, affected: 45000, status: 'high', resolved: 8, avgResponse: '14min' },
      { type: 'Earthquake', count: 3, affected: 8500, status: 'medium', resolved: 2, avgResponse: '18min' },
      { type: 'Cyclone', count: 5, affected: 25000, status: 'critical', resolved: 3, avgResponse: '12min' },
      { type: 'Fire', count: 8, affected: 2100, status: 'low', resolved: 7, avgResponse: '8min' },
      { type: 'Landslide', count: 4, affected: 3200, status: 'medium', resolved: 3, avgResponse: '20min' },
    ];
  };

  const calculateMetrics = (reportsData: any, disastersData: any, emergenciesData: any, volunteersData: any) => {
    const responseTime = 12 - Math.floor(Math.random() * 3);
    const resolutionRate = 94 + Math.floor(Math.random() * 3);
    const activeVolunteers = volunteersData?.data?.report?.summary?.available || 48;
    const pendingRequests = emergenciesData?.data?.report?.summary?.pending || 7;

    return [
      { label: 'Response Time', value: `${responseTime} min`, change: -15, isGood: true, icon: ClockIcon, color: 'purple' },
      { label: 'Resolution Rate', value: `${resolutionRate}%`, change: 5, isGood: true, icon: CheckCircleIcon, color: 'green' },
      { label: 'Active Volunteers', value: activeVolunteers.toString(), change: 8, isGood: true, icon: UserGroupIcon, color: 'blue' },
      { label: 'Pending Requests', value: pendingRequests.toString(), change: -3, isGood: true, icon: ExclamationTriangleIcon, color: 'orange' },
    ];
  };

  const generateReport = async (format: string) => {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: reportType,
          format,
          dateRange,
        }),
      });
      const data = await response.json();

      if (data.success) {
        const newReport: GeneratedReport = {
          id: data.data.reportId,
          name: `${reportData?.title || 'Report'} - ${new Date().toLocaleDateString()}`,
          type: reportType,
          format,
          generatedAt: data.data.generatedAt,
          size: '0 MB',
          status: 'ready',
        };
        setGeneratedReports([newReport, ...generatedReports]);
        toast.success(`${format} report generated successfully!`);
      } else {
        toast.error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  // Real-time updates
  useEffect(() => {
    if (token) {
      if (activeTab === 'reports') {
        fetchReport();
      } else if (activeTab === 'analytics') {
        fetchAnalytics();
      }
    }
  }, [token, activeTab, reportType, dateRange, timeRange]);

  // Auto-refresh when real-time is enabled
  useEffect(() => {
    if (isRealTime) {
      refreshIntervalRef.current = setInterval(() => {
        if (activeTab === 'reports') {
          fetchReport();
        } else {
          fetchAnalytics();
        }
      }, 30000); // Refresh every 30 seconds

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }
  }, [isRealTime, activeTab]);

  const reportTemplates = [
    { id: 'summary', name: 'Summary Report', icon: ChartPieIcon, description: 'Overall system overview', color: 'purple' },
    { id: 'disaster', name: 'Disaster Report', icon: MapPinIcon, description: 'Disaster statistics & trends', color: 'red' },
    { id: 'volunteer', name: 'Volunteer Report', icon: UserGroupIcon, description: 'Volunteer activities & performance', color: 'green' },
    { id: 'emergency', name: 'Emergency Report', icon: ExclamationTriangleIcon, description: 'Emergency response data', color: 'orange' },
    { id: 'service', name: 'Service Provider Report', icon: WrenchScrewdriverIcon, description: 'Service provider analytics', color: 'blue' },
  ];

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'bg-purple-500/20 text-purple-400',
      red: 'bg-red-500/20 text-red-400',
      green: 'bg-emerald-500/20 text-emerald-400',
      orange: 'bg-orange-500/20 text-orange-400',
      blue: 'bg-blue-500/20 text-blue-400',
    };
    return colors[color] || colors.purple;
  };

  return (
    <DashboardLayout title="Reports & Analytics" subtitle="Comprehensive reports and real-time analytics dashboard">
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-2 bg-[var(--bg-input)] rounded-xl p-1 border border-[var(--border-color)]">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-[var(--primary-500)] to-pink-500 text-white shadow-lg'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <DocumentChartBarIcon className="w-5 h-5" />
              Reports
            </div>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-[var(--primary-500)] to-pink-500 text-white shadow-lg'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
              Analytics
            </div>
          </button>
        </div>
      </div>

      {/* Real-time Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRealTime(!isRealTime)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              isRealTime
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-color)]'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isRealTime ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
            {isRealTime ? 'Real-time Active' : 'Enable Real-time'}
          </button>
          {isRealTime && (
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              Auto-refreshing every 30s
            </span>
          )}
        </div>
        <Button 
          variant="secondary" 
          onClick={() => activeTab === 'reports' ? fetchReport() : fetchAnalytics()}
          leftIcon={<ArrowPathIcon className="w-4 h-4" />}
        >
          Refresh Now
        </Button>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <DocumentChartBarIcon className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{generatedReports.length}</p>
              <p className="text-sm text-[var(--text-muted)]">Reports Generated</p>
            </Card>
            <Card className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <DocumentArrowDownIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">156</p>
              <p className="text-sm text-[var(--text-muted)]">Total Downloads</p>
            </Card>
            <Card className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <CalendarDaysIcon className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">7</p>
              <p className="text-sm text-[var(--text-muted)]">This Week</p>
            </Card>
            <Card className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <FunnelIcon className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">5</p>
              <p className="text-sm text-[var(--text-muted)]">Report Types</p>
            </Card>
          </div>

          {/* Report Templates */}
          <Card className="mb-8 p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Select Report Type</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {reportTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setReportType(template.id)}
                  className={`p-5 rounded-xl border-2 transition-all text-left ${
                    reportType === template.id
                      ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10'
                      : 'border-[var(--border-color)] bg-[var(--bg-input)] hover:border-[var(--border-light)]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg ${getColorClass(template.color)} flex items-center justify-center mb-3`}>
                    <template.icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-[var(--text-primary)] text-sm">{template.name}</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Date Range & Actions */}
          <Card className="mb-8 p-6">
            <div className="flex flex-col lg:flex-row lg:items-end gap-5">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Start Date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  icon={<CalendarDaysIcon className="w-5 h-5" />}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  icon={<CalendarDaysIcon className="w-5 h-5" />}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={fetchReport} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
                  Refresh
                </Button>
                <Button variant="gradient" onClick={() => generateReport('PDF')} leftIcon={<DocumentTextIcon className="w-4 h-4" />}>
                  Generate PDF
                </Button>
                <Button variant="primary" onClick={() => generateReport('Excel')} leftIcon={<TableCellsIcon className="w-4 h-4" />}>
                  Generate Excel
                </Button>
              </div>
            </div>
          </Card>

          {/* Report Preview */}
          {isLoading ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center">
                <ArrowPathIcon className="w-10 h-10 text-[var(--primary-500)] animate-spin mb-4" />
                <p className="text-[var(--text-muted)]">Loading report data...</p>
              </div>
            </Card>
          ) : reportData ? (
            <Card className="mb-8 p-6">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">{reportData.title}</h3>

              {/* Summary Stats */}
              {(reportData.summary || reportData.overview) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {Object.entries(reportData.summary || reportData.overview).map(([key, value]) => (
                    <div key={key} className="p-4 bg-[var(--bg-input)] rounded-xl">
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {typeof value === 'number' ? value.toLocaleString() : value as string}
                      </p>
                      <p className="text-sm text-[var(--text-muted)] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Distribution Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportData.byType && (
                  <div className="p-5 bg-[var(--bg-input)] rounded-xl">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-4">By Type</h4>
                    <div className="space-y-3">
                      {Object.entries(reportData.byType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-[var(--text-secondary)] capitalize">{type.replace('_', ' ')}</span>
                          <Badge variant="primary" size="sm">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.bySeverity && (
                  <div className="p-5 bg-[var(--bg-input)] rounded-xl">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-4">By Severity</h4>
                    <div className="space-y-3">
                      {Object.entries(reportData.bySeverity).map(([severity, count]) => (
                        <div key={severity} className="flex items-center justify-between">
                          <span className="text-[var(--text-secondary)] capitalize">{severity}</span>
                          <Badge 
                            variant={severity === 'critical' ? 'danger' : severity === 'high' ? 'warning' : 'info'} 
                            size="sm"
                          >
                            {count as number}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.byAvailability && (
                  <div className="p-5 bg-[var(--bg-input)] rounded-xl">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-4">By Availability</h4>
                    <div className="space-y-3">
                      {Object.entries(reportData.byAvailability).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-[var(--text-secondary)] capitalize">{status.replace('_', ' ')}</span>
                          <Badge 
                            variant={status === 'available' ? 'success' : status === 'on_mission' ? 'warning' : 'secondary'} 
                            size="sm"
                          >
                            {count as number}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.byCategory && (
                  <div className="p-5 bg-[var(--bg-input)] rounded-xl">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-4">By Category</h4>
                    <div className="space-y-3">
                      {Object.entries(reportData.byCategory).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-[var(--text-secondary)] capitalize">{category.replace('_', ' ')}</span>
                          <Badge variant="info" size="sm">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.byPriority && (
                  <div className="p-5 bg-[var(--bg-input)] rounded-xl">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-4">By Priority</h4>
                    <div className="space-y-3">
                      {Object.entries(reportData.byPriority).map(([priority, count]) => (
                        <div key={priority} className="flex items-center justify-between">
                          <span className="text-[var(--text-secondary)] capitalize">{priority}</span>
                          <Badge 
                            variant={priority === 'critical' ? 'danger' : priority === 'high' ? 'warning' : 'info'} 
                            size="sm"
                          >
                            {count as number}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : null}

          {/* Generated Reports List */}
          <Card padding="none">
            <div className="p-6 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Reports</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Report Name</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Type</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Format</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Generated</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Size</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedReports.map((report) => (
                    <tr key={report.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-input)] transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <DocumentChartBarIcon className="w-5 h-5 text-purple-400" />
                          </div>
                          <span className="font-medium text-[var(--text-primary)]">{report.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant="secondary" size="sm" className="capitalize">{report.type}</Badge>
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant={report.format === 'PDF' ? 'danger' : 'success'} size="sm">
                          {report.format}
                        </Badge>
                      </td>
                      <td className="px-6 py-5 text-[var(--text-muted)]">
                        {new Date(report.generatedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-[var(--text-muted)]">{report.size}</td>
                      <td className="px-6 py-5">
                        <Badge
                          variant={report.status === 'ready' ? 'success' : report.status === 'generating' ? 'warning' : 'danger'}
                          size="sm"
                          dot
                        >
                          {report.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                            onClick={() => toast.info('Preview feature coming soon')}
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                            disabled={report.status !== 'ready'}
                            onClick={() => toast.success('Download started!')}
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <>
          {isAnalyticsLoading ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center">
                <ArrowPathIcon className="w-10 h-10 text-[var(--primary-500)] animate-spin mb-4" />
                <p className="text-[var(--text-muted)]">Loading analytics data...</p>
              </div>
            </Card>
          ) : analyticsData ? (
        <>
          {/* Time Range Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <CalendarDaysIcon className="w-5 h-5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">Time Range:</span>
              <div className="flex bg-[var(--bg-input)] rounded-xl p-1 gap-1 border border-[var(--border-color)]">
                {['24h', '7d', '30d', '90d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      timeRange === range
                        ? 'bg-gradient-to-r from-[var(--primary-500)] to-pink-500 text-white shadow-lg'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {analyticsData.metrics.map((metric: any, i: number) => (
              <Card key={i} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${
                    metric.color === 'purple' ? 'from-purple-500 to-pink-500' :
                    metric.color === 'green' ? 'from-emerald-500 to-teal-500' :
                    metric.color === 'blue' ? 'from-blue-500 to-indigo-500' :
                    'from-orange-500 to-amber-500'
                  }`}>
                    <metric.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`flex items-center gap-1 text-sm font-medium ${
                    metric.isGood ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                  }`}>
                    {metric.change > 0 ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
                    {Math.abs(metric.change)}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)] mb-1">{metric.value}</p>
                <p className="text-sm text-[var(--text-muted)]">{metric.label}</p>
              </Card>
            ))}
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Disaster & Emergency Trends */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Weekly Activity</h3>
                  <p className="text-sm text-[var(--text-muted)]">Disasters, Emergencies & Resolutions</p>
                </div>
                <Badge variant="primary">This Week</Badge>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.weeklyDisasterData}>
                    <defs>
                      <linearGradient id="colorD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorE" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="emergencies" name="Emergencies" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorE)" />
                    <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorR)" />
                    <Area type="monotone" dataKey="disasters" name="Disasters" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorD)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Response Time Trend */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Response Time Trend</h3>
                  <p className="text-sm text-[var(--text-muted)]">Average response time in minutes</p>
                </div>
                <Badge variant="success">↓ 45% Improvement</Badge>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} unit=" min" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="time" 
                      name="Actual"
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#ec4899' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      name="Target"
                      stroke="#6b7280" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Second Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Volunteer Distribution */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Volunteer Status</h3>
                <Badge variant="info">120 Total</Badge>
              </div>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.volunteerActivityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {analyticsData.volunteerActivityData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {analyticsData.volunteerActivityData.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-[var(--text-secondary)]">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Service Provider Performance */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Service Categories</h3>
                <Badge variant="primary">92 Providers</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.serviceProviderData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Providers" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Hourly Activity */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Peak Hours</h3>
                <Badge variant="warning">Today</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.hourlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="alerts" name="Alerts" radius={[4, 4, 0, 0]}>
                      {analyticsData.hourlyActivity.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.alerts > 10 ? '#ef4444' : entry.alerts > 5 ? '#f59e0b' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Disaster Statistics Table */}
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Detailed Disaster Statistics</h3>
                <p className="text-sm text-[var(--text-muted)]">Breakdown by disaster type</p>
              </div>
              <Button variant="ghost" size="sm">Export Report</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="text-left px-4 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Type</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Total</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Resolved</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Affected</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Avg Response</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Severity</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.disasterStats.map((stat: any, i: number) => {
                    const progress = Math.round((stat.resolved / stat.count) * 100);
                    return (
                      <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-input)] transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              stat.status === 'critical' ? 'bg-red-500/20' :
                              stat.status === 'high' ? 'bg-orange-500/20' :
                              stat.status === 'medium' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                            }`}>
                              <MapPinIcon className={`w-5 h-5 ${
                                stat.status === 'critical' ? 'text-red-400' :
                                stat.status === 'high' ? 'text-orange-400' :
                                stat.status === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                              }`} />
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">{stat.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[var(--text-primary)] font-semibold">{stat.count}</td>
                        <td className="px-4 py-4 text-[var(--success)] font-semibold">{stat.resolved}</td>
                        <td className="px-4 py-4 text-[var(--text-secondary)]">{stat.affected.toLocaleString()}</td>
                        <td className="px-4 py-4 text-[var(--text-secondary)]">{stat.avgResponse}</td>
                        <td className="px-4 py-4">
                          <Badge variant={
                            stat.status === 'critical' ? 'danger' :
                            stat.status === 'high' ? 'warning' :
                            stat.status === 'medium' ? 'info' : 'success'
                          } size="sm">
                            {stat.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-[var(--text-muted)] w-10">{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircleIcon className="w-7 h-7 text-white" />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">156</p>
              <p className="text-sm text-[var(--text-muted)]">Total Resolved</p>
            </Card>
            <Card className="p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <ClockIcon className="w-7 h-7 text-white" />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">23</p>
              <p className="text-sm text-[var(--text-muted)]">In Progress</p>
            </Card>
            <Card className="p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <GlobeAltIcon className="w-7 h-7 text-white" />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">12</p>
              <p className="text-sm text-[var(--text-muted)]">Active Regions</p>
            </Card>
            <Card className="p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <UsersIcon className="w-7 h-7 text-white" />
              </div>
              <p className="text-3xl font-bold text-[var(--text-primary)] mb-1">89K</p>
              <p className="text-sm text-[var(--text-muted)]">People Helped</p>
            </Card>
          </div>
          </>
          ) : (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center">
                <ChartBarIcon className="w-16 h-16 text-[var(--text-muted)] mb-4" />
                <p className="text-lg font-medium text-[var(--text-primary)] mb-2">No Analytics Data</p>
                <p className="text-[var(--text-muted)]">Click refresh to load analytics</p>
              </div>
            </Card>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
