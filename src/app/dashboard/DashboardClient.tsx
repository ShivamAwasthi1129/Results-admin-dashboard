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

export default function DashboardClient() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [liveDisasters, setLiveDisasters] = useState<LiveDisaster[]>([]);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [weatherSearchQuery, setWeatherSearchQuery] = useState('');
  const [weatherSearchResults, setWeatherSearchResults] = useState<CitySearchResult[]>([]);
  const [showWeatherSearchResults, setShowWeatherSearchResults] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Audio alert state
  const [isAlertPlaying, setIsAlertPlaying] = useState(false);
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingPlayRef = useRef(false);

  // Fetch all data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Fetch dashboard stats
        const statsResponse = await fetch('/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            setStats(statsData.data);
          }
        }

        // Fetch live disasters
        const disastersResponse = await fetch('/api/live-disasters');
        if (disastersResponse.ok) {
          const disastersData = await disastersResponse.json();
          if (disastersData.success) {
            const disasters = disastersData.data.disasters || [];
            const usaDisasters = disasters
              .filter((d: any) => {
                const hasCoordinates = d.location?.coordinates || (d.location?.lat && d.location?.lng);
                if (!hasCoordinates) return false;
                
                const country = d.location?.country || '';
                const isUSA = country.toLowerCase().includes('united states') || 
                             country.toLowerCase().includes('usa') || 
                             country.toLowerCase().includes('u.s.') ||
                             country.toLowerCase() === 'us';
                
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
            setLiveDisasters(usaDisasters);
          }
        }

        // Fetch users
        try {
          const usersResponse = await fetch('https://dms-rust-omega.vercel.app/api/admin/users', {
            headers: { 'Content-Type': 'application/json' }
          });
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            if (usersData.success && usersData.data?.users) {
              const mappedUsers = usersData.data.users.slice(0, 50).map((u: any) => ({
                id: u.id,
                fullName: u.fullName,
                username: u.username,
                email: u.email,
                phoneNumber: u.phoneNumber,
                city: u.city,
                state: u.state,
                country: u.country,
                role: u.role,
                isActive: u.isActive,
                isVerified: u.isVerified,
                isSubscriber: u.isSubscriber,
                emailVerified: u.emailVerified,
                phoneVerified: u.phoneVerified,
              }));
              setUsers(mappedUsers);
            }
          }
        } catch (error) {
          console.error('Error fetching users:', error);
        }

        // Fetch weather data
        const weatherResponse = await fetch('/api/weather?type=multi');
        if (weatherResponse.ok) {
          const weatherData = await weatherResponse.json();
          if (weatherData.success && weatherData.data) {
            setWeatherData(weatherData.data);
            if (weatherData.data.length > 0) {
              setSelectedWeather(weatherData.data[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchAllData();
    }
  }, [token]);

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Unlock audio automatically on page load
  useEffect(() => {
    const unlockAudio = async () => {
      if (!audioUnlocked && audioRef.current) {
        try {
          audioRef.current.volume = 0.01;
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.volume = 0.7;
          setAudioUnlocked(true);
        } catch (error) {
          console.error('Audio unlock failed:', error);
        }
      }
    };
    unlockAudio();
  }, [audioUnlocked]);

  // Check for critical disasters and play alert
  useEffect(() => {
    const criticalCount = liveDisasters.filter(d => d.severity === 'critical').length;
    if (criticalCount > 0 && audioUnlocked && audioRef.current && !isAlertPlaying) {
      setIsAlertPlaying(true);
      setShowCriticalAlert(true);
      audioRef.current.play().catch(console.error);
      
      setTimeout(() => {
        setIsAlertPlaying(false);
        setShowCriticalAlert(false);
      }, 5000);
    }
  }, [liveDisasters, audioUnlocked, isAlertPlaying]);

  const handleWeatherSearch = async (query: string) => {
    setWeatherSearchQuery(query);
    if (query.length >= 2) {
      try {
        const response = await fetch(`/api/weather?type=search&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.success && data.data) {
          setWeatherSearchResults(data.data);
          setShowWeatherSearchResults(true);
        }
      } catch (error) {
        console.error('Error searching cities:', error);
      }
    } else {
      setWeatherSearchResults([]);
      setShowWeatherSearchResults(false);
    }
  };

  const handleCitySelect = async (city: CitySearchResult) => {
    setWeatherSearchQuery('');
    setShowWeatherSearchResults(false);
    
    try {
      const response = await fetch(`/api/weather?type=onecall&lat=${city.lat}&lon=${city.lon}&city=${city.city}&state=${city.state}`);
      const data = await response.json();
      if (data.success && data.data) {
        const weather: WeatherData = {
          city: city.city,
          state: city.state,
          temperature: data.data.temperature,
          description: data.data.description,
          icon: data.data.icon,
          humidity: data.data.humidity,
          windSpeed: data.data.windSpeed,
          pressure: data.data.pressure,
          visibility: data.data.visibility,
          uvIndex: data.data.uvIndex,
          feelsLike: data.data.feelsLike,
          windDirection: data.data.windDirection,
          clouds: data.data.clouds,
        };
        setSelectedWeather(weather);
        // Update or add to weatherData array
        const existingIndex = weatherData.findIndex(w => w.city === city.city && w.state === city.state);
        if (existingIndex >= 0) {
          const updated = [...weatherData];
          updated[existingIndex] = weather;
          setWeatherData(updated);
        } else {
          setWeatherData([...weatherData, weather]);
        }
      }
    } catch (error) {
      console.error('Error fetching city weather:', error);
    }
  };

  // Weekly activity data
  const weeklyData = [
    { name: 'Mon', disasters: stats?.overview.activeDisasters || 0, emergencies: stats?.overview.pendingEmergencies || 0, resolved: stats?.overview.resolvedDisasters || 0 },
    { name: 'Tue', disasters: (stats?.overview.activeDisasters || 0) + 2, emergencies: (stats?.overview.pendingEmergencies || 0) + 1, resolved: (stats?.overview.resolvedDisasters || 0) + 3 },
    { name: 'Wed', disasters: (stats?.overview.activeDisasters || 0) + 1, emergencies: (stats?.overview.pendingEmergencies || 0) + 2, resolved: (stats?.overview.resolvedDisasters || 0) + 5 },
    { name: 'Thu', disasters: (stats?.overview.activeDisasters || 0) + 3, emergencies: (stats?.overview.pendingEmergencies || 0) + 1, resolved: (stats?.overview.resolvedDisasters || 0) + 4 },
    { name: 'Fri', disasters: (stats?.overview.activeDisasters || 0) + 2, emergencies: (stats?.overview.pendingEmergencies || 0) + 3, resolved: (stats?.overview.resolvedDisasters || 0) + 6 },
    { name: 'Sat', disasters: (stats?.overview.activeDisasters || 0) + 1, emergencies: (stats?.overview.pendingEmergencies || 0) + 2, resolved: (stats?.overview.resolvedDisasters || 0) + 3 },
    { name: 'Sun', disasters: stats?.overview.activeDisasters || 0, emergencies: stats?.overview.pendingEmergencies || 0, resolved: stats?.overview.resolvedDisasters || 0 },
  ];

  const liveDisasterCount = liveDisasters.length;
  const { user } = useAuth();

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
      <div className="space-y-6">
      {/* Critical Alert Banner */}
      {showCriticalAlert && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <BellAlertIcon className="w-6 h-6" />
            <div>
              <p className="font-bold">Critical Disaster Alert!</p>
              <p className="text-sm opacity-90">{liveDisasterCount} critical disaster(s) detected</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowCriticalAlert(false);
              if (audioRef.current) audioRef.current.pause();
            }}
            className="p-2 hover:bg-red-800 rounded-lg transition-colors"
          >
            <SpeakerXMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Audio element for alerts */}
      <audio ref={audioRef} src="/alert-sound.mp3" preload="auto" />

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          icon={<UsersIcon className="w-6 h-6" />}
          title="Total Users"
          value={stats?.overview.totalUsers || 0}
          trend={{ value: stats?.growth.users || 0, isPositive: true }}
          variant="blue"
        />
        <StatCard
          icon={<UserGroupIcon className="w-6 h-6" />}
          title="Active Volunteers"
          value={stats?.overview.totalVolunteers || 0}
          subtitle={`${stats?.overview.availableVolunteers || 0} available`}
          variant="purple"
        />
        <StatCard
          icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          title="Active Disasters"
          value={stats?.overview.activeDisasters || 0}
          subtitle={`${stats?.overview.criticalDisasters || 0} critical`}
          variant="red"
        />
        {/* <StatCard
          icon={<BoltIcon className="w-6 h-6" />}
          title="Emergencies"
          value={stats?.overview.pendingEmergencies || 0}
          subtitle={`${stats?.overview.inProgressEmergencies || 0} in progress`}
          variant="orange"
        /> */}
        <StatCard
          icon={<BuildingOfficeIcon className="w-6 h-6" />}
          title="Service Providers"
          value={stats?.overview.totalServiceProviders || 0}
          subtitle={`${stats?.overview.verifiedServiceProviders || 0} verified`}
          variant="green"
        />
        <StatCard
          icon={<MapPinIcon className="w-6 h-6" />}
          title="Incidents Reported"
          value={0}
          variant="blue"
        />
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
                  {selectedWeather && (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-5xl font-light">{selectedWeather.temperature}°F</p>
                          <p className="text-sm opacity-80 capitalize">{selectedWeather.description}</p>
                          <p className="text-xs opacity-60 mt-1">{selectedWeather.city}, {selectedWeather.state}</p>
                          {selectedWeather.feelsLike && (
                            <p className="text-xs opacity-70 mt-1">Feels like {selectedWeather.feelsLike}°F</p>
                          )}
                        </div>
                        <span className="text-5xl">{weatherIcons[selectedWeather.icon]}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20 text-xs">
                        <div className="flex items-center gap-2">
                          <span>💧</span>
                          <div>
                            <p className="opacity-60">Humidity</p>
                            <p className="font-semibold">{selectedWeather.humidity}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>💨</span>
                          <div>
                            <p className="opacity-60">Wind Speed</p>
                            <p className="font-semibold">{selectedWeather.windSpeed} mph</p>
                          </div>
                        </div>
                        {selectedWeather.pressure && (
                          <div className="flex items-center gap-2">
                            <span>📊</span>
                            <div>
                              <p className="opacity-60">Pressure</p>
                              <p className="font-semibold">{selectedWeather.pressure} hPa</p>
                            </div>
                          </div>
                        )}
                        {selectedWeather.visibility !== undefined && (
                          <div className="flex items-center gap-2">
                            <span>👁️</span>
                            <div>
                              <p className="opacity-60">Visibility</p>
                              <p className="font-semibold">{selectedWeather.visibility} mi</p>
                            </div>
                          </div>
                        )}
                        {selectedWeather.uvIndex !== undefined && (
                          <div className="flex items-center gap-2">
                            <span>☀️</span>
                            <div>
                              <p className="opacity-60">UV Index</p>
                              <p className="font-semibold">{selectedWeather.uvIndex}</p>
                            </div>
                          </div>
                        )}
                        {selectedWeather.clouds !== undefined && (
                          <div className="flex items-center gap-2">
                            <span>☁️</span>
                            <div>
                              <p className="opacity-60">Clouds</p>
                              <p className="font-semibold">{selectedWeather.clouds}%</p>
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
                    emailVerified: u.emailVerified,
                    phoneVerified: u.phoneVerified,
                    planLimit: 0,
                    isSubscriber: u.isSubscriber,
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
            <Link href="/dashboard/emergencies">
              <Button variant="primary" className="w-full justify-start" leftIcon={<BoltIcon className="w-5 h-5" />}>
                Report Emergency
              </Button>
            </Link>
            <Link href="/dashboard/disasters">
              <Button variant="secondary" className="w-full justify-start" leftIcon={<ExclamationTriangleIcon className="w-5 h-5" />}>
                Manage Disasters
              </Button>
            </Link>
            <Link href="/dashboard/volunteers">
              <Button variant="secondary" className="w-full justify-start" leftIcon={<UserGroupIcon className="w-5 h-5" />}>
                Assign Volunteers
              </Button>
            </Link>
            <Link href="/dashboard/shelters">
              <Button variant="secondary" className="w-full justify-start" leftIcon={<HomeModernIcon className="w-5 h-5" />}>
                View Shelters
              </Button>
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
            {stats?.recentDisasters?.slice(0, 5).map((disaster: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-input)] transition-colors">
                <div className={`w-2 h-2 rounded-full ${
                  disaster.severity === 'critical' ? 'bg-red-500' :
                  disaster.severity === 'high' ? 'bg-orange-500' :
                  disaster.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{disaster.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{disaster.type}</p>
                </div>
                <Badge variant={disaster.status === 'active' ? 'danger' : 'success'} size="sm">
                  {disaster.status}
                </Badge>
              </div>
            )) || (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">No recent disasters</p>
            )}
          </div>
        </Card>

        {/* Recent Emergencies */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Recent Emergencies</h3>
            <Link href="/dashboard/emergencies">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentEmergencies?.slice(0, 5).map((emergency: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-input)] transition-colors">
                <BoltIcon className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{emergency.description || 'Emergency'}</p>
                  <p className="text-xs text-[var(--text-muted)]">{emergency.type}</p>
                </div>
                <Badge variant={emergency.status === 'pending' ? 'warning' : emergency.status === 'resolved' ? 'success' : 'info'} size="sm">
                  {emergency.status}
                </Badge>
              </div>
            )) || (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">No recent emergencies</p>
            )}
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">System Status</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">All Systems Operational</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-lg">
            <ShieldCheckIcon className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-sm text-[var(--text-muted)]">Security</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-lg">
            <GlobeAltIcon className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-[var(--text-muted)]">API Status</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-lg">
            <ClockIcon className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-[var(--text-muted)]">Last Updated</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {currentTime.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-[var(--bg-input)] rounded-lg">
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-[var(--text-muted)]">Database</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">Connected</p>
            </div>
          </div>
        </div>
      </Card>
      </div>
    </DashboardLayout>
  );
}

