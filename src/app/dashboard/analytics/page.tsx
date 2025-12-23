'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar
} from 'recharts';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

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

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  const metrics = [
    { label: 'Response Time', value: '12 min', change: -15, isGood: true, icon: ClockIcon, color: 'purple' },
    { label: 'Resolution Rate', value: '94%', change: 5, isGood: true, icon: CheckCircleIcon, color: 'green' },
    { label: 'Active Volunteers', value: '48', change: 8, isGood: true, icon: UserGroupIcon, color: 'blue' },
    { label: 'Pending Requests', value: '7', change: -3, isGood: true, icon: ExclamationTriangleIcon, color: 'orange' },
  ];

  // Weekly disaster data
  const weeklyDisasterData = [
    { name: 'Mon', disasters: 4, emergencies: 12, resolved: 8 },
    { name: 'Tue', disasters: 3, emergencies: 8, resolved: 10 },
    { name: 'Wed', disasters: 5, emergencies: 15, resolved: 12 },
    { name: 'Thu', disasters: 2, emergencies: 6, resolved: 14 },
    { name: 'Fri', disasters: 6, emergencies: 18, resolved: 9 },
    { name: 'Sat', disasters: 4, emergencies: 10, resolved: 11 },
    { name: 'Sun', disasters: 3, emergencies: 8, resolved: 13 },
  ];

  // Monthly response time data
  const responseTimeData = [
    { month: 'Jan', time: 22, target: 15 },
    { month: 'Feb', time: 20, target: 15 },
    { month: 'Mar', time: 18, target: 15 },
    { month: 'Apr', time: 16, target: 15 },
    { month: 'May', time: 14, target: 15 },
    { month: 'Jun', time: 12, target: 15 },
  ];

  // Volunteer activity data
  const volunteerActivityData = [
    { name: 'Active', value: 48, color: '#10b981' },
    { name: 'On Mission', value: 24, color: '#3b82f6' },
    { name: 'Available', value: 32, color: '#8b5cf6' },
    { name: 'Off Duty', value: 16, color: '#6b7280' },
  ];

  // Service provider categories
  const serviceProviderData = [
    { name: 'Medical', count: 25, rating: 4.8 },
    { name: 'Transport', count: 18, rating: 4.5 },
    { name: 'Shelter', count: 12, rating: 4.7 },
    { name: 'Food & Water', count: 22, rating: 4.6 },
    { name: 'Rescue', count: 15, rating: 4.9 },
  ];

  // Region performance
  const regionPerformance = [
    { region: 'North', score: 92, fill: '#8b5cf6' },
    { region: 'South', score: 88, fill: '#3b82f6' },
    { region: 'East', score: 95, fill: '#10b981' },
    { region: 'West', score: 85, fill: '#f59e0b' },
    { region: 'Central', score: 90, fill: '#ec4899' },
  ];

  // Disaster statistics table
  const disasterStats = [
    { type: 'Flood', count: 12, affected: 45000, status: 'high', resolved: 8, avgResponse: '14min' },
    { type: 'Earthquake', count: 3, affected: 8500, status: 'medium', resolved: 2, avgResponse: '18min' },
    { type: 'Cyclone', count: 5, affected: 25000, status: 'critical', resolved: 3, avgResponse: '12min' },
    { type: 'Fire', count: 8, affected: 2100, status: 'low', resolved: 7, avgResponse: '8min' },
    { type: 'Landslide', count: 4, affected: 3200, status: 'medium', resolved: 3, avgResponse: '20min' },
  ];

  // Hourly activity
  const hourlyActivity = [
    { hour: '00:00', alerts: 2 }, { hour: '04:00', alerts: 1 }, { hour: '08:00', alerts: 8 },
    { hour: '12:00', alerts: 12 }, { hour: '16:00', alerts: 15 }, { hour: '20:00', alerts: 6 },
  ];

  return (
    <DashboardLayout title="Analytics & Insights" subtitle="Comprehensive system performance metrics">
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
        <Button variant="secondary" leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric, i) => (
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
              <AreaChart data={weeklyDisasterData}>
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
              <LineChart data={responseTimeData}>
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
                  data={volunteerActivityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {volunteerActivityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {volunteerActivityData.map((item, i) => (
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
              <BarChart data={serviceProviderData} layout="vertical">
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
              <BarChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={10} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="alerts" name="Alerts" radius={[4, 4, 0, 0]}>
                  {hourlyActivity.map((entry, index) => (
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
              {disasterStats.map((stat, i) => {
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
    </DashboardLayout>
  );
}
