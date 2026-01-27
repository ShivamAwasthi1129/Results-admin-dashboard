'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  KeyIcon,
  EnvelopeIcon,
  PhoneIcon,
  CameraIcon,
  CheckIcon,
  MapPinIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import { BLOOD_GROUPS, GENDER_OPTIONS, US_STATES, RELATION_OPTIONS } from '@/lib/constants/usa';

type TabKey = 'profile' | 'notifications' | 'security' | 'appearance';

interface OpsProfile {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  profilePhoto: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  ssnNumber: string;
  driversLicense: { number: string; state: string; expiryDate: string };
  emergencyContact: { firstName: string; lastName: string; phone: string; relation: string };
  address: { street: string; apartment: string; city: string; state: string; zipCode: string; country: string };
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      emergencyAlerts?: boolean;
      disasterUpdates?: boolean;
      volunteerAssignments?: boolean;
      systemUpdates?: boolean;
      weeklyReport?: boolean;
    };
  };
}

export default function SettingsPage() {
  const { user, token } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<OpsProfile | null>(null);

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    ssnNumber: '',
    driversLicenseNumber: '',
    driversLicenseState: '',
    driversLicenseExpiry: '',
    emergencyFirstName: '',
    emergencyLastName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    emergencyAlerts: true,
    disasterUpdates: true,
    volunteerAssignments: true,
    systemUpdates: false,
    weeklyReport: true,
  });

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setProfileLoading(false);
      return;
    }
    try {
      setProfileLoading(true);
      const res = await fetch('/api/ops-users/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.data) {
        const p = data.data;
        setProfile(p);
        setProfileForm({
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          email: p.email || '',
          phone: p.phone || '',
          dateOfBirth: p.dateOfBirth || '',
          gender: p.gender || '',
          bloodGroup: p.bloodGroup || '',
          ssnNumber: p.ssnNumber || '',
          driversLicenseNumber: p.driversLicense?.number || '',
          driversLicenseState: p.driversLicense?.state || '',
          driversLicenseExpiry: p.driversLicense?.expiryDate || '',
          emergencyFirstName: p.emergencyContact?.firstName || '',
          emergencyLastName: p.emergencyContact?.lastName || '',
          emergencyPhone: p.emergencyContact?.phone || '',
          emergencyRelation: p.emergencyContact?.relation || '',
          street: p.address?.street || '',
          apartment: p.address?.apartment || '',
          city: p.address?.city || '',
          state: p.address?.state || '',
          zipCode: p.address?.zipCode || '',
          country: p.address?.country || 'United States',
        });
        if (p.preferences?.notifications) {
          setNotifications((prev) => ({ ...prev, ...p.preferences!.notifications }));
        }
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async () => {
    if (!token || !user?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ops-users?id=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          email: profileForm.email,
          phone: profileForm.phone,
          dateOfBirth: profileForm.dateOfBirth || undefined,
          gender: profileForm.gender || undefined,
          bloodGroup: profileForm.bloodGroup || undefined,
          ssnNumber: profileForm.ssnNumber || undefined,
          driversLicense: {
            number: profileForm.driversLicenseNumber,
            state: profileForm.driversLicenseState,
            expiryDate: profileForm.driversLicenseExpiry || undefined,
          },
          emergencyContact: {
            firstName: profileForm.emergencyFirstName,
            lastName: profileForm.emergencyLastName,
            phone: profileForm.emergencyPhone,
            relation: profileForm.emergencyRelation,
          },
          address: {
            street: profileForm.street,
            apartment: profileForm.apartment,
            city: profileForm.city,
            state: profileForm.state,
            zipCode: profileForm.zipCode,
            country: profileForm.country,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Profile updated successfully');
        fetchProfile();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!token || !user?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ops-users?id=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferences: { notifications } }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Notification preferences saved');
        fetchProfile();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (securityForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/ops-users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: securityForm.currentPassword,
          newPassword: securityForm.newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Password updated successfully');
        setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Failed to update password');
      }
    } catch {
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
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

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile', icon: <UserCircleIcon className="w-5 h-5" /> },
    { key: 'notifications', label: 'Notifications', icon: <BellIcon className="w-5 h-5" /> },
    { key: 'security', label: 'Security', icon: <ShieldCheckIcon className="w-5 h-5" /> },
    { key: 'appearance', label: 'Appearance', icon: <PaintBrushIcon className="w-5 h-5" /> },
  ];

  return (
    <DashboardLayout title="Settings" subtitle="Manage your OPS account and preferences">
      <div className="flex flex-col lg:flex-row gap-8">
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

        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card>
              {profileLoading ? (
                <div className="py-12 text-center text-[var(--text-muted)]">Loading profile...</div>
              ) : (
                <>
                  <div className="flex items-center gap-5 mb-10 pb-8 border-b border-[var(--border-color)]">
                    <Avatar
                      name={profile ? `${profile.firstName} ${profile.lastName}`.trim() || user?.name : user?.name || 'User'}
                      size="xl"
                      src={profile?.profilePhoto}
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
                        {profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.name : user?.name}
                      </h3>
                      <p className="text-[var(--text-muted)] mb-3">{user?.email}</p>
                      <Badge variant="primary" size="sm" className="capitalize">
                        {user?.role?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Basic Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="First Name" value={profileForm.firstName} onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} icon={<UserCircleIcon className="w-5 h-5" />} />
                        <Input label="Last Name" value={profileForm.lastName} onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))} icon={<UserCircleIcon className="w-5 h-5" />} />
                        <Input label="Email" type="email" value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} icon={<EnvelopeIcon className="w-5 h-5" />} />
                        <Input label="Phone" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} icon={<PhoneIcon className="w-5 h-5" />} />
                        <Input label="Date of Birth" type="date" value={profileForm.dateOfBirth} onChange={(e) => setProfileForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
                        <Select label="Gender" value={profileForm.gender} onChange={(v) => setProfileForm((f) => ({ ...f, gender: v }))} options={GENDER_OPTIONS} />
                        <Select label="Blood Group" value={profileForm.bloodGroup} onChange={(v) => setProfileForm((f) => ({ ...f, bloodGroup: v }))} options={BLOOD_GROUPS} />
                        <Input label="SSN (last 4 or masked)" value={profileForm.ssnNumber} onChange={(e) => setProfileForm((f) => ({ ...f, ssnNumber: e.target.value }))} icon={<IdentificationIcon className="w-5 h-5" />} />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Driver&apos;s License (USA)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input label="License Number" value={profileForm.driversLicenseNumber} onChange={(e) => setProfileForm((f) => ({ ...f, driversLicenseNumber: e.target.value }))} />
                        <Select label="State" value={profileForm.driversLicenseState} onChange={(v) => setProfileForm((f) => ({ ...f, driversLicenseState: v }))} options={[{ value: '', label: 'Select State' }, ...US_STATES]} />
                        <Input label="Expiry Date" type="date" value={profileForm.driversLicenseExpiry} onChange={(e) => setProfileForm((f) => ({ ...f, driversLicenseExpiry: e.target.value }))} />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="First Name" value={profileForm.emergencyFirstName} onChange={(e) => setProfileForm((f) => ({ ...f, emergencyFirstName: e.target.value }))} />
                        <Input label="Last Name" value={profileForm.emergencyLastName} onChange={(e) => setProfileForm((f) => ({ ...f, emergencyLastName: e.target.value }))} />
                        <Input label="Phone" value={profileForm.emergencyPhone} onChange={(e) => setProfileForm((f) => ({ ...f, emergencyPhone: e.target.value }))} icon={<PhoneIcon className="w-5 h-5" />} />
                        <Select label="Relation" value={profileForm.emergencyRelation} onChange={(v) => setProfileForm((f) => ({ ...f, emergencyRelation: v }))} options={RELATION_OPTIONS} />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <Input label="Street" value={profileForm.street} onChange={(e) => setProfileForm((f) => ({ ...f, street: e.target.value }))} icon={<MapPinIcon className="w-5 h-5" />} />
                        </div>
                        <Input label="Apartment / Suite" value={profileForm.apartment} onChange={(e) => setProfileForm((f) => ({ ...f, apartment: e.target.value }))} />
                        <Input label="City" value={profileForm.city} onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))} />
                        <Select label="State" value={profileForm.state} onChange={(v) => setProfileForm((f) => ({ ...f, state: v }))} options={[{ value: '', label: 'Select State' }, ...US_STATES]} />
                        <Input label="ZIP Code" value={profileForm.zipCode} onChange={(e) => setProfileForm((f) => ({ ...f, zipCode: e.target.value }))} />
                      </div>
                    </div>

                    <div className="flex justify-end pt-6">
                      <Button variant="gradient" onClick={handleSaveProfile} isLoading={isLoading}>Save profile</Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-8">Notification Preferences</h3>
              <div className="space-y-10">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5">Channels</h4>
                  <div className="space-y-4">
                    {[
                      { key: 'email' as const, label: 'Email Notifications', desc: 'Receive notifications via email' },
                      { key: 'push' as const, label: 'Push Notifications', desc: 'Receive push notifications in browser' },
                      { key: 'sms' as const, label: 'SMS Notifications', desc: 'Receive notifications via SMS' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                        <div>
                          <p className="font-medium text-[var(--text-primary)] mb-1">{item.label}</p>
                          <p className="text-sm text-[var(--text-muted)]">{item.desc}</p>
                        </div>
                        <Toggle checked={notifications[item.key]} onChange={() => setNotifications((n) => ({ ...n, [item.key]: !n[item.key] }))} />
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
                      { key: 'systemUpdates' as const, label: 'System Updates', desc: 'Platform and maintenance updates' },
                      { key: 'weeklyReport' as const, label: 'Weekly Report', desc: 'Weekly activity summary email' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                        <div>
                          <p className="font-medium text-[var(--text-primary)] mb-1">{item.label}</p>
                          <p className="text-sm text-[var(--text-muted)]">{item.desc}</p>
                        </div>
                        <Toggle checked={notifications[item.key]} onChange={() => setNotifications((n) => ({ ...n, [item.key]: !n[item.key] }))} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pt-6">
                  <Button variant="gradient" onClick={handleSaveNotifications} isLoading={isLoading}>Save preferences</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-8">Change Password</h3>
              <div className="space-y-6">
                <Input label="Current Password" type="password" value={securityForm.currentPassword} onChange={(e) => setSecurityForm((f) => ({ ...f, currentPassword: e.target.value }))} icon={<KeyIcon className="w-5 h-5" />} />
                <Input label="New Password" type="password" value={securityForm.newPassword} onChange={(e) => setSecurityForm((f) => ({ ...f, newPassword: e.target.value }))} icon={<KeyIcon className="w-5 h-5" />} />
                <Input label="Confirm New Password" type="password" value={securityForm.confirmPassword} onChange={(e) => setSecurityForm((f) => ({ ...f, confirmPassword: e.target.value }))} icon={<KeyIcon className="w-5 h-5" />} />
                <div className="flex justify-end pt-6">
                  <Button variant="gradient" onClick={handleChangePassword} isLoading={isLoading}>Update password</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-8">Theme</h3>
              <div className="grid grid-cols-2 gap-5 max-w-md">
                {(['light', 'dark'] as const).map((themeOption) => (
                  <button
                    key={themeOption}
                    type="button"
                    onClick={() => setTheme(themeOption)}
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
                      theme === themeOption ? 'border-purple-500 bg-purple-500/10' : 'border-[var(--border-color)] hover:border-[var(--border-light)]'
                    }`}
                  >
                    <div className={`w-full h-14 rounded-lg mb-4 ${themeOption === 'light' ? 'bg-gray-200' : 'bg-[#1e1e32]'}`} />
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--text-primary)] capitalize">{themeOption}</span>
                      {theme === themeOption && <CheckIcon className="w-5 h-5 text-purple-400" />}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-4">Theme is saved to your device and applies immediately.</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
