'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, StatCard, Badge, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  UsersIcon,
  UserGroupIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  ClockIcon,
  BoltIcon,
  GlobeAltIcon,
  HomeModernIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  ChevronRightIcon,
  CloudIcon,
  SunIcon,
  ArrowPathIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  overview: {
    totalUsers: number;
    totalAdmins: number;
    totalVolunteers: number;
    availableVolunteers: number;
    totalServiceProviders: number;
    verifiedServiceProviders: number;
    activeDisasters: number;
    resolvedDisasters: number;
    criticalDisasters: number;
    pendingEmergencies: number;
    inProgressEmergencies: number;
    resolvedEmergencies: number;
    totalAffectedPeople: number;
  };
  growth: { users: number; volunteers: number };
  recentDisasters: any[];
  recentEmergencies: any[];
}

interface WeatherData {
  city: string;
  state?: string;
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

const weatherIcons: Record<string, string> = {
  '01d': '☀️', '01n': '🌙',
  '02d': '⛅', '02n': '☁️',
  '03d': '☁️', '03n': '☁️',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)] shadow-2xl">
        <p className="text-[var(--text-muted)] text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-[var(--text-primary)] font-semibold text-sm">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveDisasterCount, setLiveDisasterCount] = useState(0);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Audio alert state
  const [isAlertPlaying, setIsAlertPlaying] = useState(false);
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingPlayRef = useRef(false);

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Load map on client side
    setMapLoaded(true);
  }, []);

  // Unlock audio automatically on page load (try to play silently)
  useEffect(() => {
    const unlockAudio = async () => {
      if (!audioUnlocked && audioRef.current) {
        try {
          // Try to play and immediately pause to unlock audio
          audioRef.current.volume = 0.01; // Very low volume for unlock
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.volume = 0.7; // Restore normal volume
          setAudioUnlocked(true);
          console.log('Audio unlocked - alerts can now play automatically');
          
          // If there was a pending play request, play now
          if (pendingPlayRef.current) {
            pendingPlayRef.current = false;
            playAlertSound();
          }
        } catch (err) {
          // Audio not unlocked yet, will try on user interaction
          console.log('Auto-unlock failed, waiting for user interaction:', err);
          
          // Fallback: unlock on user interaction
          const unlockOnInteraction = async () => {
            if (audioRef.current && !audioUnlocked) {
              try {
                await audioRef.current.play();
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                setAudioUnlocked(true);
                if (pendingPlayRef.current) {
                  pendingPlayRef.current = false;
                  playAlertSound();
                }
              } catch (e) {
                console.error('Failed to unlock audio:', e);
              }
            }
          };
          
          const events = ['click', 'touchstart', 'keydown'];
          events.forEach(event => {
            document.addEventListener(event, unlockOnInteraction, { once: true, passive: true });
          });
        }
      }
    };

    // Try to unlock immediately on mount
    const timer = setTimeout(() => {
      unlockAudio();
    }, 500);

    return () => clearTimeout(timer);
  }, [audioUnlocked]);

  // Initialize audio
  useEffect(() => {
    // Use local alert sound file from public folder
    audioRef.current = new Audio('/alert-sound.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.7; // Set volume to 70%
    audioRef.current.preload = 'auto';
    
    // Handle audio loading errors
    audioRef.current.addEventListener('error', (e) => {
      console.error('Audio loading error:', e);
      console.error('Failed to load /alert-sound.mp3. Please ensure the file exists in the public folder.');
    });
    
    // Handle successful loading
    audioRef.current.addEventListener('loadeddata', () => {
      console.log('Alert sound loaded successfully');
    });
    
    // Preload the audio
    audioRef.current.load();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  // Check for critical alerts and play audio
  useEffect(() => {
    const criticalCount = stats?.overview.criticalDisasters || 0;
    if (criticalCount > 0 && !showCriticalAlert) {
      setShowCriticalAlert(true);
      // Small delay to ensure audio is loaded
      setTimeout(() => {
        playAlertSound();
      }, 300);
    } else if (criticalCount === 0 && showCriticalAlert) {
      // Stop audio if no critical alerts
      stopAlertSound();
      setShowCriticalAlert(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.overview.criticalDisasters]);

  const playAlertSound = () => {
    if (!audioRef.current) return;

    // If audio is not unlocked yet, mark as pending
    if (!audioUnlocked) {
      pendingPlayRef.current = true;
      console.log('Audio not unlocked yet. Waiting for user interaction...');
      return;
    }

    // Check if audio is ready to play
    if (audioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or higher
      // Reset audio to start if it's already playing
      if (audioRef.current.currentTime > 0) {
        audioRef.current.currentTime = 0;
      }
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Alert sound playing');
            setIsAlertPlaying(true);
            pendingPlayRef.current = false;
          })
          .catch(err => {
            console.error('Audio play failed:', err);
            // If play fails, mark as not unlocked and wait for interaction
            setAudioUnlocked(false);
            pendingPlayRef.current = true;
          });
      }
    } else {
      // Wait for audio to load
      const handleCanPlay = () => {
        if (audioRef.current && audioUnlocked) {
          audioRef.current.play()
            .then(() => {
              setIsAlertPlaying(true);
              pendingPlayRef.current = false;
            })
            .catch(err => {
              console.error('Audio play failed after load:', err);
              setAudioUnlocked(false);
              pendingPlayRef.current = true;
            });
        }
      };
      audioRef.current.addEventListener('canplay', handleCanPlay, { once: true });
    }
  };

  const stopAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAlertPlaying(false);
    }
  };

  const handleAlertDismiss = () => {
    stopAlertSound();
    setShowCriticalAlert(false);
  };

  const handlePlayButtonClick = async () => {
    if (isAlertPlaying) {
      stopAlertSound();
    } else {
      // If audio is not unlocked, unlock it first
      if (!audioUnlocked && audioRef.current) {
        try {
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setAudioUnlocked(true);
          console.log('Audio unlocked via button click');
        } catch (err) {
          console.error('Failed to unlock audio:', err);
        }
      }
      // Now play the alert sound
      playAlertSound();
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) setStats(data.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchLiveDisasters = async () => {
      try {
        const response = await fetch('/api/live-disasters');
        const data = await response.json();
        if (data.success) setLiveDisasterCount(data.data.length);
      } catch (error) {
        console.error('Error fetching live disasters:', error);
      }
    };

    const fetchWeather = async () => {
      try {
        const response = await fetch('/api/weather?type=multi');
        const data = await response.json();
        if (data.success) setWeatherData(data.data);
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    if (token) {
      fetchStats();
      fetchLiveDisasters();
      fetchWeather();
    }
  }, [token]);

  // Chart data
  const weeklyData = [
    { name: 'Mon', disasters: 4, emergencies: 12, resolved: 8 },
    { name: 'Tue', disasters: 3, emergencies: 8, resolved: 10 },
    { name: 'Wed', disasters: 5, emergencies: 15, resolved: 12 },
    { name: 'Thu', disasters: 2, emergencies: 6, resolved: 14 },
    { name: 'Fri', disasters: 6, emergencies: 18, resolved: 9 },
    { name: 'Sat', disasters: 4, emergencies: 10, resolved: 11 },
    { name: 'Sun', disasters: 3, emergencies: 8, resolved: 13 },
  ];

  const disasterTypeData = [
    { name: 'Hurricane', value: 30, color: '#3b82f6' },
    { name: 'Wildfire', value: 25, color: '#ef4444' },
    { name: 'Tornado', value: 20, color: '#f59e0b' },
    { name: 'Flood', value: 15, color: '#8b5cf6' },
    { name: 'Earthquake', value: 10, color: '#6b7280' },
  ];

  // USA disaster locations for map
  const disasterLocations = [
    { id: 1, lat: 25.76, lng: -80.19, title: 'Hurricane Watch', severity: 'critical', city: 'Miami, FL' },
    { id: 2, lat: 34.05, lng: -118.24, title: 'Wildfire Alert', severity: 'high', city: 'Los Angeles, CA' },
    { id: 3, lat: 35.22, lng: -97.44, title: 'Tornado Warning', severity: 'critical', city: 'Oklahoma City, OK' },
    { id: 4, lat: 29.76, lng: -95.37, title: 'Flood Warning', severity: 'high', city: 'Houston, TX' },
    { id: 5, lat: 47.61, lng: -122.33, title: 'Earthquake Advisory', severity: 'medium', city: 'Seattle, WA' },
  ];

  const formatGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <DashboardLayout
      title={`${formatGreeting()}, ${user?.name?.split(' ')[0] || 'User'}! 👋`}
      subtitle={`${currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
    >
      {/* Critical Alert Banner with Audio */}
      {showCriticalAlert && (stats?.overview.criticalDisasters || 0) > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-700 to-red-600 dark:from-red-600/90 dark:via-red-700/90 dark:to-red-600/90 border-2 border-red-500 dark:border-red-500/50 backdrop-blur-sm animate-pulse shadow-lg shadow-red-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 dark:bg-red-500/40 flex items-center justify-center animate-bounce">
                <BellAlertIcon className="w-8 h-8 text-white dark:text-red-300" />
              </div>
              <div>
                <p className="text-xl font-bold text-white dark:text-white flex items-center gap-2">
                  🚨 {stats?.overview.criticalDisasters} Critical Alert{(stats?.overview.criticalDisasters || 0) > 1 ? 's' : ''} - Immediate Action Required!
                </p>
                <p className="text-sm text-white/90 dark:text-red-200">Emergency response teams have been notified</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayButtonClick}
                className="p-3 rounded-xl bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 transition-colors"
                title={isAlertPlaying ? 'Mute Alert' : 'Play Alert'}
              >
                {isAlertPlaying ? (
                  <SpeakerWaveIcon className="w-6 h-6 text-white" />
                ) : (
                  <SpeakerXMarkIcon className="w-6 h-6 text-white" />
                )}
              </button>
              <Link href="/dashboard/disasters" onClick={handleAlertDismiss}>
                <Button variant="danger" rightIcon={<ArrowRightIcon className="w-4 h-4" />} className="bg-white text-red-600 hover:bg-red-50 dark:bg-red-500 dark:text-white dark:hover:bg-red-600">
                  View Details & Dismiss
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid - Weather + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Weather Widget */}
        <Card className="lg:col-span-1 p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-5 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CloudIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Live Weather</span>
                </div>
                <Link href="/dashboard/weather">
                  <ChevronRightIcon className="w-5 h-5 hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              {weatherData.length > 0 && (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-5xl font-light">{weatherData[0].temperature}°F</p>
                      <p className="text-sm opacity-80 capitalize">{weatherData[0].description}</p>
                      <p className="text-xs opacity-60 mt-1">{weatherData[0].city}, {weatherData[0].state}</p>
                    </div>
                    <span className="text-5xl">{weatherIcons[weatherData[0].icon]}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20 text-sm">
                    <span>💧 {weatherData[0].humidity}%</span>
                    <span>💨 {weatherData[0].windSpeed} mph</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="p-4 bg-[var(--bg-card)]">
            <div className="space-y-2">
              {weatherData.slice(1, 4).map((city, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-input)] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{weatherIcons[city.icon]}</span>
                    <span className="text-sm text-[var(--text-secondary)]">{city.city}, {city.state}</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{city.temperature}°F</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-5 bg-gradient-to-br from-[var(--bg-card)] to-purple-500/5 border-purple-500/20 hover:border-purple-500/40 transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <Badge variant="success" size="sm">+12%</Badge>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.overview.totalUsers || 0}</p>
            <p className="text-sm text-[var(--text-muted)]">Total Users</p>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-[var(--bg-card)] to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <UserGroupIcon className="w-6 h-6 text-white" />
              </div>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.overview.availableVolunteers || 0}</p>
            <p className="text-sm text-[var(--text-muted)]">Active Volunteers</p>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-[var(--bg-card)] to-red-500/5 border-red-500/20 hover:border-red-500/40 transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                <MapPinIcon className="w-6 h-6 text-white" />
              </div>
              <Badge variant="danger" size="sm">Critical</Badge>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.overview.activeDisasters || 0}</p>
            <p className="text-sm text-[var(--text-muted)]">Active Disasters</p>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-[var(--bg-card)] to-amber-500/5 border-amber-500/20 hover:border-amber-500/40 transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <ExclamationTriangleIcon className="w-6 h-6 text-white" />
              </div>
              <Badge variant="warning" size="sm">Pending</Badge>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {(stats?.overview.pendingEmergencies || 0) + (stats?.overview.inProgressEmergencies || 0)}
            </p>
            <p className="text-sm text-[var(--text-muted)]">Emergencies</p>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-[var(--bg-card)] to-blue-500/5 border-blue-500/20 hover:border-blue-500/40 transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <BuildingOfficeIcon className="w-6 h-6 text-white" />
              </div>
              <Badge variant="info" size="sm">Verified</Badge>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stats?.overview.totalServiceProviders || 0}</p>
            <p className="text-sm text-[var(--text-muted)]">Service Providers</p>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-[var(--bg-card)] to-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40 transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
              <Badge variant="success" size="sm">↓15%</Badge>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">12 min</p>
            <p className="text-sm text-[var(--text-muted)]">Avg Response Time</p>
          </Card>
        </div>
      </div>

      {/* Map and Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Live Disaster Map */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Live Disaster Map - USA</h3>
                <p className="text-sm text-[var(--text-muted)]">Real-time disaster tracking across United States</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-medium text-red-400">{liveDisasterCount || disasterLocations.length} Active</span>
              </div>
            </div>
          </div>
          <div className="h-80 relative bg-[#0d1117] overflow-hidden">
            {/* USA Map background */}
            <div className="absolute inset-0 opacity-60">
              <Image
                src="https://images.unsplash.com/photo-1422464804701-7d8356b3a42f?w=800&h=400&fit=crop"
                alt="USA Map"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-[#0d1117]/50" />
            {/* Disaster markers overlay */}
            <div className="absolute inset-0 z-10">
              {disasterLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="absolute group cursor-pointer"
                  style={{
                    top: `${((50 - loc.lat) / 30) * 100}%`,
                    left: `${((loc.lng + 130) / 65) * 100}%`,
                  }}
                >
                  <div className={`w-4 h-4 rounded-full animate-ping absolute ${
                    loc.severity === 'critical' ? 'bg-red-500' :
                    loc.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <div className={`w-4 h-4 rounded-full relative ${
                    loc.severity === 'critical' ? 'bg-red-500' :
                    loc.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  {/* Tooltip */}
                  <div className="absolute left-6 top-0 hidden group-hover:block bg-[var(--bg-card)] p-2 rounded-lg shadow-xl border border-[var(--border-color)] min-w-max z-20">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{loc.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{loc.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 bg-[var(--bg-input)]">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> High</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Medium</span>
              </div>
              <Link href="/dashboard/live-disasters" className="text-[var(--primary-500)] hover:underline">
                View Full Map →
              </Link>
            </div>
          </div>
        </Card>

        {/* Weekly Activity Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Weekly Activity</h3>
              <p className="text-sm text-[var(--text-muted)]">Disasters, Emergencies & Resolutions</p>
            </div>
            <Badge variant="primary">This Week</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorDisasters" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEmergencies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="emergencies" name="Emergencies" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorEmergencies)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" />
                <Area type="monotone" dataKey="disasters" name="Disasters" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDisasters)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/live-disasters" className="block">
              <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <GlobeAltIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Live Disasters</p>
                  <p className="text-xs text-[var(--text-muted)]">{liveDisasterCount || 5} active alerts</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link href="/dashboard/sos" className="block">
              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-red-500/10 border border-pink-500/20 hover:border-pink-500/40 transition-all flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center shadow-lg">
                  <BellAlertIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">SOS Alerts</p>
                  <p className="text-xs text-[var(--text-muted)]">3 pending requests</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link href="/dashboard/volunteers" className="block">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Volunteers</p>
                  <p className="text-xs text-[var(--text-muted)]">{stats?.overview.availableVolunteers || 0} available</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link href="/dashboard/shelters" className="block">
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <HomeModernIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">Shelters</p>
                  <p className="text-xs text-[var(--text-muted)]">12 active shelters</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </Card>

        {/* Recent Disasters */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Recent Disasters</h3>
            <Link href="/dashboard/disasters">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-input)] animate-pulse">
                  <div className="w-10 h-10 bg-[var(--border-color)] rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--border-color)] rounded w-3/4" />
                    <div className="h-3 bg-[var(--border-color)] rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : stats?.recentDisasters?.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                <p className="text-[var(--text-muted)]">No active disasters</p>
              </div>
            ) : (
              (stats?.recentDisasters || disasterLocations).slice(0, 4).map((disaster: any, idx: number) => (
                <div key={disaster._id || idx} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    disaster.severity === 'critical' ? 'bg-red-500/20' :
                    disaster.severity === 'high' ? 'bg-orange-500/20' : 'bg-amber-500/20'
                  }`}>
                    <MapPinIcon className={`w-5 h-5 ${
                      disaster.severity === 'critical' ? 'text-red-400' :
                      disaster.severity === 'high' ? 'text-orange-400' : 'text-amber-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] text-sm truncate">{disaster.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{disaster.city || disaster.location?.city}</p>
                  </div>
                  <Badge variant={disaster.status === 'active' || disaster.severity === 'critical' ? 'danger' : 'warning'} size="sm">
                    {disaster.status || disaster.severity}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Disaster Types */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Disaster Types</h3>
            <Badge variant="info">All Time</Badge>
          </div>
          <div className="h-48 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={disasterTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {disasterTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {disasterTypeData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-[var(--text-secondary)]">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">System Status</h3>
            <p className="text-sm text-[var(--text-muted)]">Real-time monitoring of all services</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">All Systems Operational</span>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--text-secondary)]">API Response</span>
              <span className="text-sm font-bold text-emerald-400">45ms</span>
            </div>
            <div className="h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
              <div className="h-full w-[92%] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--text-secondary)]">Database</span>
              <span className="text-sm font-bold text-blue-400">98%</span>
            </div>
            <div className="h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
              <div className="h-full w-[98%] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--text-secondary)]">Uptime</span>
              <span className="text-sm font-bold text-purple-400">99.9%</span>
            </div>
            <div className="h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
              <div className="h-full w-[99.9%] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--text-secondary)]">Active Users</span>
              <span className="text-sm font-bold text-amber-400">156</span>
            </div>
            <div className="h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
              <div className="h-full w-[75%] bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
            </div>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
