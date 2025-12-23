'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Button, Input, Select, Badge, Avatar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'react-toastify';
import {
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  KeyIcon,
  EnvelopeIcon,
  PhoneIcon,
  CameraIcon,
  CheckIcon,
  MapPinIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';

type TabKey = 'profile' | 'notifications' | 'security' | 'appearance';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [isLoading, setIsLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '', 
    email: user?.email || '', 
    phone: user?.phone || '',
    city: '', 
    state: '', 
    bio: '',
    address: '',
    pincode: '',
    emergencyContact: '',
    aadharNumber: '',
    bloodGroup: '',
    dateOfBirth: '',
    occupation: '',
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    email: true, push: true, sms: false,
    emergencyAlerts: true, disasterUpdates: true, volunteerAssignments: true,
    systemUpdates: false, weeklyReport: true
  });

  const [appearance, setAppearance] = useState({
    language: 'en', timezone: 'Asia/Kolkata'
  });

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile', icon: <UserCircleIcon className="w-5 h-5" /> },
    { key: 'notifications', label: 'Notifications', icon: <BellIcon className="w-5 h-5" /> },
    { key: 'security', label: 'Security', icon: <ShieldCheckIcon className="w-5 h-5" /> },
    { key: 'appearance', label: 'Appearance', icon: <PaintBrushIcon className="w-5 h-5" /> }
  ];

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Settings saved!');
    }, 1000);
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-[var(--bg-input)]'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and preferences">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-72 shrink-0">
          <Card>
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <div className="flex items-center gap-5 mb-10 pb-8 border-b border-[var(--border-color)]">
                <div className="relative">
                  <Avatar name={user?.name || 'User'} size="xl" />
                  <button className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg hover:bg-purple-600 transition-colors">
                    <CameraIcon className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">{user?.name}</h3>
                  <p className="text-[var(--text-muted)] mb-3">{user?.email}</p>
                  <Badge variant="primary" size="sm" className="capitalize">
                    {user?.role?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-8">
                {/* Basic Info */}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label="Full Name" 
                      value={profileForm.name} 
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} 
                      icon={<UserCircleIcon className="w-5 h-5" />} 
                    />
                    <Input 
                      label="Email" 
                      type="email" 
                      value={profileForm.email} 
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} 
                      icon={<EnvelopeIcon className="w-5 h-5" />} 
                    />
                    <Input 
                      label="Phone" 
                      value={profileForm.phone} 
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} 
                      icon={<PhoneIcon className="w-5 h-5" />} 
                    />
                    <Input 
                      label="Date of Birth" 
                      type="date" 
                      value={profileForm.dateOfBirth} 
                      onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })} 
                    />
                    <Input 
                      label="Occupation" 
                      value={profileForm.occupation} 
                      onChange={(e) => setProfileForm({ ...profileForm, occupation: e.target.value })} 
                    />
                    <Select 
                      label="Blood Group" 
                      value={profileForm.bloodGroup} 
                      onChange={(value) => setProfileForm({ ...profileForm, bloodGroup: value })} 
                      options={[
                        { value: '', label: 'Select Blood Group' },
                        { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
                        { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
                        { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
                        { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
                      ]} 
                    />
                  </div>
                </div>

                {/* Address Info */}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Address Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Input 
                        label="Address" 
                        value={profileForm.address} 
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} 
                        icon={<MapPinIcon className="w-5 h-5" />} 
                      />
                    </div>
                    <Input label="City" value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} />
                    <Input label="State" value={profileForm.state} onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })} />
                    <Input label="Pincode" value={profileForm.pincode} onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })} />
                    <Input 
                      label="Emergency Contact" 
                      value={profileForm.emergencyContact} 
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })} 
                      icon={<PhoneIcon className="w-5 h-5" />}
                    />
                    <Input 
                      label="Aadhar Number" 
                      value={profileForm.aadharNumber} 
                      onChange={(e) => setProfileForm({ ...profileForm, aadharNumber: e.target.value })} 
                      icon={<IdentificationIcon className="w-5 h-5" />}
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2.5">Bio</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3.5 bg-[var(--bg-input)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--primary-500)] focus:ring-4 focus:ring-[var(--primary-500)]/20 transition-all resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex justify-end pt-6">
                  <Button variant="gradient" onClick={handleSave} isLoading={isLoading}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-8">Notification Preferences</h3>

              <div className="space-y-10">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5">Channels</h4>
                  <div className="space-y-4">
                    {[
                      { key: 'email' as const, label: 'Email Notifications', desc: 'Receive notifications via email' },
                      { key: 'push' as const, label: 'Push Notifications', desc: 'Receive push notifications' },
                      { key: 'sms' as const, label: 'SMS Notifications', desc: 'Receive notifications via SMS' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                        <div>
                          <p className="font-medium text-[var(--text-primary)] mb-1">{item.label}</p>
                          <p className="text-sm text-[var(--text-muted)]">{item.desc}</p>
                        </div>
                        <Toggle
                          checked={notifications[item.key]}
                          onChange={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5">Alert Types</h4>
                  <div className="space-y-4">
                    {[
                      { key: 'emergencyAlerts' as const, label: 'Emergency Alerts', desc: 'Critical emergency notifications' },
                      { key: 'disasterUpdates' as const, label: 'Disaster Updates', desc: 'Updates on active disasters' },
                      { key: 'volunteerAssignments' as const, label: 'Volunteer Assignments', desc: 'New mission assignments' },
                      { key: 'systemUpdates' as const, label: 'System Updates', desc: 'Platform updates' },
                      { key: 'weeklyReport' as const, label: 'Weekly Report', desc: 'Weekly activity summary' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                        <div>
                          <p className="font-medium text-[var(--text-primary)] mb-1">{item.label}</p>
                          <p className="text-sm text-[var(--text-muted)]">{item.desc}</p>
                        </div>
                        <Toggle
                          checked={notifications[item.key]}
                          onChange={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button variant="gradient" onClick={handleSave} isLoading={isLoading}>
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              <Card>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-8">Change Password</h3>
                <div className="space-y-6">
                  <Input 
                    label="Current Password" 
                    type="password" 
                    value={securityForm.currentPassword} 
                    onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })} 
                    icon={<KeyIcon className="w-5 h-5" />} 
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      label="New Password" 
                      type="password" 
                      value={securityForm.newPassword} 
                      onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })} 
                      icon={<KeyIcon className="w-5 h-5" />} 
                    />
                    <Input 
                      label="Confirm Password" 
                      type="password" 
                      value={securityForm.confirmPassword} 
                      onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })} 
                      icon={<KeyIcon className="w-5 h-5" />} 
                    />
                  </div>
                  <div className="flex justify-end pt-6">
                    <Button variant="gradient" onClick={handleSave} isLoading={isLoading}>
                      Update Password
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between p-5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                  <div>
                    <p className="font-medium text-[var(--text-primary)] mb-1">2FA Status</p>
                    <p className="text-sm text-[var(--text-muted)]">Add extra security to your account</p>
                  </div>
                  <Badge variant="warning" size="sm">Not Enabled</Badge>
                </div>
                <Button variant="secondary" className="mt-5">Enable 2FA</Button>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Active Sessions</h3>
                <div className="flex items-center justify-between p-5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <GlobeAltIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)] mb-0.5">Current Session</p>
                      <p className="text-sm text-[var(--text-muted)]">Windows • Chrome • India</p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm" dot>Active</Badge>
                </div>
              </Card>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-8">Appearance Settings</h3>

              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-4">Theme</label>
                  <div className="grid grid-cols-3 gap-5">
                    {['light', 'dark'].map((themeOption) => (
                      <button
                        key={themeOption}
                        onClick={() => setTheme(themeOption as 'light' | 'dark')}
                        className={`p-5 rounded-xl border-2 transition-all ${
                          theme === themeOption
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-[var(--border-color)] hover:border-[var(--border-light)]'
                        }`}
                      >
                        <div className={`w-full h-14 rounded-lg mb-4 ${
                          themeOption === 'light' ? 'bg-gray-200' : 'bg-[#1e1e32]'
                        }`} />
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[var(--text-primary)] capitalize">{themeOption}</span>
                          {theme === themeOption && (
                            <CheckIcon className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select 
                    label="Language" 
                    value={appearance.language} 
                    onChange={(value) => setAppearance({ ...appearance, language: value })} 
                    options={[
                      { value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' },
                      { value: 'ta', label: 'Tamil' }, { value: 'te', label: 'Telugu' }
                    ]} 
                  />
                  <Select 
                    label="Timezone" 
                    value={appearance.timezone} 
                    onChange={(value) => setAppearance({ ...appearance, timezone: value })} 
                    options={[
                      { value: 'Asia/Kolkata', label: 'India (IST)' },
                      { value: 'America/New_York', label: 'New York (EST)' },
                      { value: 'Europe/London', label: 'London (GMT)' }
                    ]} 
                  />
                </div>

                <div className="flex justify-end pt-6">
                  <Button variant="gradient" onClick={handleSave} isLoading={isLoading}>
                    Save Settings
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
