'use client';

import React, { useState, useEffect } from 'react';
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
} from '@heroicons/react/24/outline';

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

export default function ReportsPage() {
  const { token } = useAuth();
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([
    { id: '1', name: 'Monthly Disaster Summary - Jan 2025', type: 'disaster', format: 'PDF', generatedAt: '2025-01-15T10:30:00', size: '2.4 MB', status: 'ready' },
    { id: '2', name: 'Volunteer Performance Report', type: 'volunteer', format: 'Excel', generatedAt: '2025-01-14T14:20:00', size: '1.8 MB', status: 'ready' },
    { id: '3', name: 'Emergency Response Analysis', type: 'emergency', format: 'PDF', generatedAt: '2025-01-13T09:15:00', size: '3.2 MB', status: 'ready' },
    { id: '4', name: 'Service Provider Activity', type: 'service', format: 'Excel', generatedAt: '2025-01-12T16:45:00', size: '1.1 MB', status: 'ready' },
  ]);

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

  useEffect(() => {
    if (token) fetchReport();
  }, [token, reportType]);

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
    <DashboardLayout title="Reports" subtitle="Generate and download reports">
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

          {/* Distribution Charts (simplified as data cards) */}
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
                        variant={status === 'available' ? 'success' : status === 'on_mission' ? 'warning' : 'default'} 
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
                    <Badge variant="default" size="sm" className="capitalize">{report.type}</Badge>
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
    </DashboardLayout>
  );
}
