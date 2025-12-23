'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  BoltIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import ResultsLogo from '@/Results_logo.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        toast.success('Login successful! Redirecting...');
        router.push('/dashboard');
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-10 h-10 border-4 border-[var(--primary-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Theme Toggle - Top Right */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--primary-500)] transition-all z-20"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? (
          <SunIcon className="w-5 h-5 text-amber-400" />
        ) : (
          <MoonIcon className="w-5 h-5 text-[var(--primary-500)]" />
        )}
      </button>

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--primary-500)]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--primary-600)]/10 rounded-full blur-3xl" />
      </div>

      {/* Main Container - Centered */}
      <div className="relative z-10 w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Side - Branding */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Logo */}
            <div className="flex justify-center lg:justify-start mb-8">
              <Image 
                src={ResultsLogo} 
                alt="Results Logo" 
                width={200} 
                height={65} 
                className="h-16 w-auto object-contain"
                priority
              />
            </div>
            
            {/* <h1 className="text-5xl lg:text-6xl font-bold gradient-text mb-4">
              Results
            </h1> */}
            
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
              <BoltIcon className="w-5 h-5 text-amber-400" />
              <span className="text-lg font-semibold text-[var(--text-secondary)]">Disaster Management System</span>
            </div>
            
            <p className="text-[var(--text-muted)] text-lg mb-10 max-w-md mx-auto lg:mx-0 leading-relaxed">
              Coordinating relief efforts and evacuation services through volunteers. Saving lives when it matters most.
            </p>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
              <div className="card p-5 hover:border-[var(--primary-500)]/50">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-600)] flex items-center justify-center mb-4 shadow-lg shadow-[var(--primary-500)]/30">
                  <BoltIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Lightning Fast</h3>
                <p className="text-sm text-[var(--text-muted)]">Rapid emergency response</p>
              </div>
              
              <div className="card p-5 hover:border-pink-500/50">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-4 shadow-lg shadow-pink-500/30">
                  <ShieldCheckIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Secure Access</h3>
                <p className="text-sm text-[var(--text-muted)]">Enterprise security</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8 mt-10">
              <div className="text-center">
                <p className="text-3xl font-bold text-[var(--text-primary)]">50+</p>
                <p className="text-sm text-[var(--text-muted)]">Volunteers</p>
              </div>
              <div className="w-px h-10 bg-[var(--border-color)]" />
              <div className="text-center">
                <p className="text-3xl font-bold text-[var(--text-primary)]">24/7</p>
                <p className="text-sm text-[var(--text-muted)]">Support</p>
              </div>
              <div className="w-px h-10 bg-[var(--border-color)]" />
              <div className="text-center">
                <p className="text-3xl font-bold text-[var(--text-primary)]">99%</p>
                <p className="text-sm text-[var(--text-muted)]">Uptime</p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="order-1 lg:order-2">
            <div className="card p-8 lg:p-10 border border-[var(--border-color)]">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  Welcome Back! 👋
                </h2>
                <p className="text-[var(--text-muted)]">Sign in to access your dashboard</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-3">
                    <EnvelopeIcon className="w-4 h-4" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-3">
                    <LockClosedIcon className="w-4 h-4" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pr-12"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                    >
                      {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-lg"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <BoltIcon className="w-5 h-5" />
                      <span>Sign In</span>
                      <ArrowRightIcon className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              {/* <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-[var(--border-color)]" />
                <span className="text-sm text-[var(--text-muted)]">Demo Credentials</span>
                <div className="flex-1 h-px bg-[var(--border-color)]" />
              </div> */}

              {/* Demo Credentials */}
              {/* <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)] hover:border-[var(--primary-500)]/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--primary-500)]/20 flex items-center justify-center">
                      <ShieldCheckIcon className="w-5 h-5 text-[var(--primary-500)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Super Admin</span>
                  </div>
                  <span className="text-sm text-[var(--primary-500)] font-mono">superadmin@results.com</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)] hover:border-pink-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-pink-500" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Admin</span>
                  </div>
                  <span className="text-sm text-pink-500 font-mono">admin@results.com</span>
                </div>
                <p className="text-center text-sm text-[var(--text-muted)]">
                  Password: <span className="font-mono text-[var(--text-secondary)]">superadmin123 / admin123</span>
                </p>
              </div> */}
            </div>
            
            {/* Footer */}
            <p className="text-center text-[var(--text-muted)] text-sm mt-6 flex items-center justify-center gap-2">
              <BoltIcon className="w-4 h-4" />
              © 2025 Results. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
