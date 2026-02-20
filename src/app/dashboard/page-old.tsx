'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, StatCard, Badge, Button, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import dynamic from 'next/dynamic';
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
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// Dynamic import for map to avoid SSR issues
const LiveDisasterMap = dynamic(
  () => import('@/components/dashboard/LiveDisasterMap'),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div> }
);

const AllUsersMap = dynamic(
  () => import('@/components/user-management/AllUsersMap'),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div> }
);

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
  pressure?: number;
  visibility?: number;
  uvIndex?: number;
  feelsLike?: number;
  windDirection?: number;
  clouds?: number;
}

interface CitySearchResult {
  city: string;
  state: string;
  lat: number;
  lon: number;
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

interface LiveDisaster {
  id: string;
  title: string;
  type: string;
  severity: string;
  description?: string;
  category?: string;
  date?: string;
  magnitude?: number;
  magnitudeUnit?: string;
  source?: string;
  location: {
    coordinates?: { lat: number; lng: number };
    country?: string;
    state?: string;
  };
}

interface DashboardUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  city: string | null;
  state: string | null;
  country: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  isSubscriber: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveDisasterCount, setLiveDisasterCount] = useState(0);
  const [liveDisasters, setLiveDisasters] = useState<LiveDisaster[]>([]);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [weatherSearchQuery, setWeatherSearchQuery] = useState('');
  const [weatherSearchResults, setWeatherSearchResults] = useState<CitySearchResult[]>([]);
  const [showWeatherSearchResults, setShowWeatherSearchResults] = useState(false);
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

  const fetchWeatherForCity = async (lat: number, lon: number, city: string, state: string) => {
    try {
      const response = await fetch(`/api/weather?type=onecall&lat=${lat}&lon=${lon}&city=${city}&state=${state}`);
      const data = await response.json();
      if (data.success && data.data.current) {
        const current = data.data.current;
        setSelectedWeather({
          city: current.city,
          state: current.state,
          temperature: current.temperature,
          description: current.description,
          icon: current.icon,
          humidity: current.humidity,
          windSpeed: current.windSpeed,
          pressure: current.pressure,
          visibility: current.visibility,
          uvIndex: current.uvIndex,
          feelsLike: current.feelsLike,
          windDirection: current.windDirection,
          clouds: current.clouds,
        });
      } else if (data.success && data.data) {
        // Handle case where data.data is the current weather object directly (from multi endpoint)
        const current = data.data;
        setSelectedWeather({
          city: current.city,
          state: current.state,
          temperature: current.temperature,
          description: current.description,
          icon: current.icon,
          humidity: current.humidity,
          windSpeed: current.windSpeed,
          pressure: current.pressure,
          visibility: current.visibility,
          uvIndex: current.uvIndex,
          feelsLike: current.feelsLike,
          windDirection: current.windDirection,
          clouds: current.clouds,
        });
      }
    } catch (error) {
      console.error('Error fetching city weather:', error);
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
        if (data.success) {
          const disasters = data.data.disasters || [];
          setLiveDisasterCount(disasters.length);
          // Transform to LiveDisaster format for the map
          // Filter to only show USA-based disasters
          const transformedDisasters = disasters
            .filter((d: any) => {
              // Only include disasters with valid coordinates AND in USA
              const hasCoordinates = d.location?.coordinates || (d.location?.lat && d.location?.lng);
              if (!hasCoordinates) return false;
              
              // Check if disaster is in USA
              const country = d.location?.country || '';
              const isUSA = country.toLowerCase().includes('united states') || 
                           country.toLowerCase().includes('usa') || 
                           country.toLowerCase().includes('u.s.') ||
                           country.toLowerCase() === 'us';
              
              // Also check coordinates - USA is roughly between lat 24-49 and lng -125 to -66
              let coordinates;
              if (d.location?.coordinates) {
                coordinates = d.location.coordinates;
              } else if (d.location?.lat && d.location?.lng) {
                coordinates = { lat: d.location.lat, lng: d.location.lng };
              }
              
              const isInUSABounds = coordinates && 
                coordinates.lat >= 24 && coordinates.lat <= 49 &&
                coordinates.lng >= -125 && coordinates.lng <= -66;
              
              return isUSA || isInUSABounds;
            })
            .map((d: any) => {
              // Handle different coordinate formats
              let coordinates;
              if (d.location?.coordinates) {
                coordinates = d.location.coordinates;
              } else if (d.location?.lat && d.location?.lng) {
                coordinates = { lat: d.location.lat, lng: d.location.lng };
              }
              
              return {
                id: d.id || `disaster-${Math.random()}`,
                title: d.title || 'Unknown Disaster',
                type: d.type || 'other',
                severity: d.severity || 'medium',
                description: d.description,
                category: d.category || d.type,
                date: d.date,
                magnitude: d.magnitude,
                magnitudeUnit: d.magnitudeUnit,
                source: d.source,
                location: {
                  coordinates: coordinates,
                  country: d.location?.country,
                  state: d.location?.state,
                }
              };
            });
          setLiveDisasters(transformedDisasters);
          console.log('Live disasters loaded:', transformedDisasters.length, transformedDisasters);
        }
      } catch (error) {
        console.error('Error fetching live disasters:', error);
      }
    };

    const fetchWeather = async () => {
      try {
        const response = await fetch('/api/weather?type=multi');
        const data = await response.json();
        if (data.success) {
          setWeatherData(data.data);
          if (data.data.length > 0 && !selectedWeather) {
            // Fetch detailed weather for the first city to get all fields
            const firstCity = data.data[0];
            if (firstCity.lat && firstCity.lon) {
              await fetchWeatherForCity(firstCity.lat, firstCity.lon, firstCity.city, firstCity.state || '');
            } else {
              // If no lat/lon, use the data as-is but ensure all fields are present
              setSelectedWeather({
                city: firstCity.city,
                state: firstCity.state,
                temperature: firstCity.temperature,
                description: firstCity.description,
                icon: firstCity.icon,
                humidity: firstCity.humidity,
                windSpeed: firstCity.windSpeed,
                pressure: firstCity.pressure,
                visibility: firstCity.visibility,
                uvIndex: firstCity.uvIndex,
                feelsLike: firstCity.feelsLike,
                windDirection: firstCity.windDirection,
                clouds: firstCity.clouds,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await fetch('https://r3sults-backend.vercel.app/api/admin/users', {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.users) {
            setUsers(data.data.users.slice(0, 50)); // Limit to 50 users for performance
          }
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (token) {
      fetchStats();
      fetchLiveDisasters();
      fetchWeather();
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Major US cities for search
  const usCities: CitySearchResult[] = [
    { city: 'New York', state: 'NY', lat: 40.7128, lon: -74.0060 },
    { city: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
    { city: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298 },
    { city: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 },
    { city: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.0740 },
    { city: 'Philadelphia', state: 'PA', lat: 39.9526, lon: -75.1652 },
    { city: 'San Antonio', state: 'TX', lat: 29.4241, lon: -98.4936 },
    { city: 'San Diego', state: 'CA', lat: 32.7157, lon: -117.1611 },
    { city: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.7970 },
    { city: 'San Jose', state: 'CA', lat: 37.3382, lon: -121.8863 },
    { city: 'Austin', state: 'TX', lat: 30.2672, lon: -97.7431 },
    { city: 'Jacksonville', state: 'FL', lat: 30.3322, lon: -81.6557 },
    { city: 'Fort Worth', state: 'TX', lat: 32.7555, lon: -97.3308 },
    { city: 'Columbus', state: 'OH', lat: 39.9612, lon: -82.9988 },
    { city: 'Charlotte', state: 'NC', lat: 35.2271, lon: -80.8431 },
    { city: 'San Francisco', state: 'CA', lat: 37.7749, lon: -122.4194 },
    { city: 'Indianapolis', state: 'IN', lat: 39.7684, lon: -86.1581 },
    { city: 'Seattle', state: 'WA', lat: 47.6062, lon: -122.3321 },
    { city: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903 },
    { city: 'Boston', state: 'MA', lat: 42.3601, lon: -71.0589 },
    { city: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918 },
    { city: 'Atlanta', state: 'GA', lat: 33.7490, lon: -84.3880 },
    { city: 'Las Vegas', state: 'NV', lat: 36.1699, lon: -115.1398 },
    { city: 'Portland', state: 'OR', lat: 45.5152, lon: -122.6784 },
    { city: 'New Orleans', state: 'LA', lat: 29.9511, lon: -90.0715 },
  ];

  const handleWeatherSearch = (query: string) => {
    setWeatherSearchQuery(query);
    if (query.length >= 2) {
      const matchingCities = usCities.filter(c => 
        c.city.toLowerCase().includes(query.toLowerCase()) ||
        c.state.toLowerCase().includes(query.toLowerCase())
      );
      setWeatherSearchResults(matchingCities.slice(0, 5));
      setShowWeatherSearchResults(true);
    } else {
      setWeatherSearchResults([]);
      setShowWeatherSearchResults(false);
    }
  };

  const handleCitySelect = (city: CitySearchResult) => {
    setWeatherSearchQuery('');
    setShowWeatherSearchResults(false);
    fetchWeatherForCity(city.lat, city.lon, city.city, city.state);
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

      {/* Compact Stats Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card className="p-3 bg-gradient-to-br from-[var(--bg-card)] to-purple-500/5 border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <UsersIcon className="w-4 h-4 text-white" />
            </div>
            <Badge variant="success" size="sm">+12%</Badge>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.overview.totalUsers || 0}</p>
          <p className="text-xs text-[var(--text-muted)]">Total Users</p>
        </Card>

        <Card className="p-3 bg-gradient-to-br from-[var(--bg-card)] to-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <UserGroupIcon className="w-4 h-4 text-white" />
            </div>
            <Badge variant="success" size="sm">Active</Badge>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.overview.availableVolunteers || 0}</p>
          <p className="text-xs text-[var(--text-muted)]">Active Volunteers</p>
        </Card>

        <Card className="p-3 bg-gradient-to-br from-[var(--bg-card)] to-red-500/5 border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <MapPinIcon className="w-4 h-4 text-white" />
            </div>
            <Badge variant="danger" size="sm">Critical</Badge>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.overview.activeDisasters || 0}</p>
          <p className="text-xs text-[var(--text-muted)]">Active Disasters</p>
        </Card>

        {/* <Card className="p-3 bg-gradient-to-br from-[var(--bg-card)] to-amber-500/5 border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-4 h-4 text-white" />
            </div>
            <Badge variant="warning" size="sm">Pending</Badge>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {(stats?.overview.pendingEmergencies || 0) + (stats?.overview.inProgressEmergencies || 0)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Emergencies</p>
        </Card> */}

        <Card className="p-3 bg-gradient-to-br from-[var(--bg-card)] to-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <BuildingOfficeIcon className="w-4 h-4 text-white" />
            </div>
            <Badge variant="info" size="sm">Verified</Badge>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.overview.totalServiceProviders || 0}</p>
          <p className="text-xs text-[var(--text-muted)]">Service Providers</p>
        </Card>

        <Card className="p-3 bg-gradient-to-br from-[var(--bg-card)] to-cyan-500/5 border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-4 h-4 text-white" />
            </div>
            <Badge variant="info" size="sm">Today</Badge>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {(stats?.overview.pendingEmergencies || 0) + (stats?.overview.inProgressEmergencies || 0) + (stats?.overview.activeDisasters || 0)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Incidents Reported</p>
        </Card>
      </div>

      {/* Weather Search Bar */}
      <div className="mb-6 relative">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Input
              icon={<MagnifyingGlassIcon className="w-5 h-5" />}
              placeholder="Search any US city or state (e.g., New York, Miami, Seattle)..."
              value={weatherSearchQuery}
              onChange={(e) => handleWeatherSearch(e.target.value)}
              onFocus={() => weatherSearchQuery.length >= 2 && setShowWeatherSearchResults(true)}
              onBlur={() => setTimeout(() => setShowWeatherSearchResults(false), 200)}
            />
            {showWeatherSearchResults && weatherSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                {weatherSearchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCitySelect(result)}
                    className="w-full px-4 py-3 text-left hover:bg-[var(--bg-input)] transition-colors flex items-center gap-3 border-b border-[var(--border-color)] last:border-b-0"
                  >
                    <MapPinIcon className="w-5 h-5 text-[var(--text-muted)]" />
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{result.city}</p>
                      <p className="text-sm text-[var(--text-muted)]">{result.state}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Weather Section + Weekly Activity - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Live Weather Section */}
        <div>
          <Link href="/dashboard/weather" className="block">
            <Card className="p-0 overflow-hidden hover:shadow-xl transition-all cursor-pointer h-full flex flex-col">
              <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-5 text-white relative flex-shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CloudIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">Live Weather</span>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 hover:translate-x-1 transition-transform" />
                  </div>
                  {(selectedWeather || (weatherData.length > 0 && weatherData[0])) && (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-5xl font-light">{(selectedWeather || weatherData[0]).temperature}°F</p>
                          <p className="text-sm opacity-80 capitalize">{(selectedWeather || weatherData[0]).description}</p>
                          <p className="text-xs opacity-60 mt-1">{(selectedWeather || weatherData[0]).city}, {(selectedWeather || weatherData[0]).state}</p>
                          {(selectedWeather || weatherData[0]).feelsLike && (
                            <p className="text-xs opacity-70 mt-1">Feels like {(selectedWeather || weatherData[0]).feelsLike}°F</p>
                          )}
                        </div>
                        <span className="text-5xl">{weatherIcons[(selectedWeather || weatherData[0]).icon]}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20 text-xs">
                        <div className="flex items-center gap-2">
                          <span>💧</span>
                          <div>
                            <p className="opacity-60">Humidity</p>
                            <p className="font-semibold">{(selectedWeather || weatherData[0]).humidity}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>💨</span>
                          <div>
                            <p className="opacity-60">Wind Speed</p>
                            <p className="font-semibold">{(selectedWeather || weatherData[0]).windSpeed} mph</p>
                          </div>
                        </div>
                        {(selectedWeather || weatherData[0]).pressure && (
                          <div className="flex items-center gap-2">
                            <span>📊</span>
                            <div>
                              <p className="opacity-60">Pressure</p>
                              <p className="font-semibold">{(selectedWeather || weatherData[0]).pressure} hPa</p>
                            </div>
                          </div>
                        )}
                        {(selectedWeather || weatherData[0]).visibility !== undefined && (
                          <div className="flex items-center gap-2">
                            <span>👁️</span>
                            <div>
                              <p className="opacity-60">Visibility</p>
                              <p className="font-semibold">{(selectedWeather || weatherData[0]).visibility} mi</p>
                            </div>
                          </div>
                        )}
                        {(selectedWeather || weatherData[0]).uvIndex !== undefined && (
                          <div className="flex items-center gap-2">
                            <span>☀️</span>
                            <div>
                              <p className="opacity-60">UV Index</p>
                              <p className="font-semibold">{(selectedWeather || weatherData[0]).uvIndex}</p>
                            </div>
                          </div>
                        )}
                        {(selectedWeather || weatherData[0]).clouds !== undefined && (
                          <div className="flex items-center gap-2">
                            <span>☁️</span>
                            <div>
                              <p className="opacity-60">Clouds</p>
                              <p className="font-semibold">{(selectedWeather || weatherData[0]).clouds}%</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4 bg-[var(--bg-card)] flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {weatherData.slice(1, 4).map((city, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-input)] transition-colors">
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
          </Link>
        </div>

        {/* Weekly Activity Chart */}
        <div>
          <Card className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Weekly Activity</h3>
                <p className="text-sm text-[var(--text-muted)]">Disasters, Emergencies & Resolutions</p>
              </div>
              <Badge variant="primary">This Week</Badge>
            </div>
            <div className="h-64 w-full flex-1">
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
      </div>

      {/* Maps Section - Live Disaster Map + All Users Map Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Live Disaster Map */}
        <div>
          <Card className="p-0 overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-[var(--border-color)] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Live Disaster Map</h3>
                  <p className="text-sm text-[var(--text-muted)]">USA-based disasters only</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-medium text-red-400">{liveDisasterCount} Active</span>
                </div>
              </div>
            </div>
            <div className="flex-1 relative min-h-[500px]">
              {liveDisasters.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-input)]">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-[var(--text-muted)]">Loading disaster data...</p>
                  </div>
                </div>
              ) : (
                <LiveDisasterMap
                  disasters={liveDisasters}
                />
              )}
            </div>
            <div className="p-4 bg-[var(--bg-input)] border-t border-[var(--border-color)] flex-shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> 
                    <span className="text-xs font-medium text-red-400">Critical</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20">
                    <span className="w-2 h-2 rounded-full bg-orange-500" /> 
                    <span className="text-xs font-medium text-orange-400">High</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> 
                    <span className="text-xs font-medium text-amber-400">Medium</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> 
                    <span className="text-xs font-medium text-emerald-400">Low</span>
                  </span>
                </div>
                <Link href="/dashboard/live-disasters" className="text-xs text-[var(--primary-500)] hover:underline font-medium">
                  View Full Map →
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* All Users Map */}
        <div>
          <Card className="p-0 overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-[var(--border-color)] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">All Users Map</h3>
                  <p className="text-sm text-[var(--text-muted)]">User locations in USA region</p>
                </div>
                <Link href="/dashboard/user-management">
                  <Button variant="secondary" size="sm" rightIcon={<ArrowRightIcon className="w-4 h-4" />}>
                    Manage Users
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 relative min-h-[500px]">
              {users.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-input)]">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-[var(--text-muted)]">Loading user data...</p>
                  </div>
                </div>
              ) : (
                <AllUsersMap
                  users={users.map(u => ({
                    id: u.id,
                    phoneNumber: u.phoneNumber,
                    email: u.email,
                    username: u.username,
                    fullName: u.fullName,
                    dateOfBirth: '',
                    gender: '',
                    profilePictureUrl: null,
                    address: null,
                    city: u.city,
                    state: u.state,
                    country: u.country,
                    pincode: null,
                    emergencyContactName: null,
                    emergencyContactPhone: null,
                    bloodGroup: null,
                    medicalConditions: null,
                    authProvider: '',
                    providerId: null,
                    isVerified: u.isVerified,
                    isActive: u.isActive,
                    emailVerified: false,
                    phoneVerified: false,
                    planLimit: 0,
                    isSubscriber: false,
                    role: u.role,
                    roleAssignedBy: null,
                    roleAssignedAt: null,
                    lastLoginAt: null,
                    deletedAt: null,
                    createdAt: '',
                    updatedAt: '',
                    adminGroups: [],
                    memberGroups: [],
                  }))}
                  showPaths={false}
                  height="100%"
                />
              )}
            </div>
          </Card>
        </div>
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
