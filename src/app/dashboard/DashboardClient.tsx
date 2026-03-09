'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, StatCard, Badge, Button, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDataCache } from '@/context/DataCacheContext';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  HomeIcon,
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
  ChevronRightIcon,
  CloudIcon,
  SunIcon,
  ArrowPathIcon,
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

const ProductList = dynamic(
  () => import('@/components/dashboard/ProductList'),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div> }
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
  const { cache, updateCache, getCachedData, refreshData } = useDataCache();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [liveDisasters, setLiveDisasters] = useState<LiveDisaster[]>([]);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'with_device' | 'without_device'>('all');
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [weatherSearchQuery, setWeatherSearchQuery] = useState('');
  const [weatherSearchResults, setWeatherSearchResults] = useState<CitySearchResult[]>([]);
  const [showWeatherSearchResults, setShowWeatherSearchResults] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [userLocations, setUserLocations] = useState<Record<string, { latitude: number; longitude: number; accuracy?: number; lastUpdatedAt?: string; isActive?: boolean }>>({});
  
  // Helper function to process disasters (all worldwide; map shows USA first, user can pan/zoom)
  const processDisasters = (disasters: any[]) => {
    return disasters
      .filter((d: any) => {
        const hasCoordinates = d.location?.coordinates || (d.location?.lat && d.location?.lng);
        return !!hasCoordinates;
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
  };

  // Helper function to process users (from external admin API; location comes from tracking API)
  const processUsers = (users: any[]) => {
    return users.slice(0, 50).map((u: any) => ({
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      phoneNumber: u.phoneNumber,
      city: u.city,
      state: u.state,
      country: u.country,
      role: u.role || 'MEMBER',
      isActive: u.isActive,
      isVerified: u.isVerified,
      isSubscriber: u.isSubscriber,
      emailVerified: u.emailVerified,
      phoneVerified: u.phoneVerified,
      location: null as any,
    }));
  };

  // Track if fetchers are already set up to prevent infinite loops
  const fetchersSetupRef = useRef(false);
  const productsFetchingRef = useRef(false);

  // Auth token: context or localStorage (so requests always send header)
  const authToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null);

  // Fetch all data on mount - PARALLEL EXECUTION
  useEffect(() => {
    const t = authToken ?? (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null);
    if (!t) return;
    if (fetchersSetupRef.current) return; // Prevent multiple setups

    const fetchAllData = async () => {
      setIsLoading(true);
      const tokenForFetch = t;

      // Check cache first and set initial data
      const cachedStats = getCachedData('stats');
      const cachedDisasters = getCachedData('disasters');
      const cachedUsers = getCachedData('users');
      const cachedDevices = getCachedData('devices');
      const cachedWeather = getCachedData('weather');
      const cachedProducts = getCachedData('products');

      if (cachedStats) setStats(cachedStats);
      if (cachedDisasters) setLiveDisasters(cachedDisasters);
      if (cachedUsers) setUsers(cachedUsers);
      if (cachedDevices) setDevices(cachedDevices);
      if (cachedWeather) {
        setWeatherData(cachedWeather);
        if (cachedWeather.length > 0) {
          setSelectedWeather(cachedWeather[0]);
        }
      }
      if (cachedProducts && Array.isArray(cachedProducts) && cachedProducts.length > 0) {
        setProducts(cachedProducts);
        setIsLoadingProducts(false);
      }

      // Define all fetch functions
      const fetchStats = async () => {
        try {
          const response = await fetch('/api/dashboard/stats', {
            headers: { Authorization: `Bearer ${tokenForFetch}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              updateCache('stats', data.data);
              setStats(data.data);
              return data.data;
            }
          }
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
        return null;
      };

      const fetchDisasters = async () => {
        try {
          const response = await fetch('/api/merged-live-disasters');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              const disasters = data.data.disasters || [];
              const processed = processDisasters(disasters);
              updateCache('disasters', processed);
              setLiveDisasters(processed);
              return processed;
            }
          }
        } catch (error) {
          console.error('Error fetching disasters:', error);
        }
        return null;
      };

      const fetchUsers = async () => {
        try {
          const response = await fetch('/api/admin/users?limit=1000', {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenForFetch}` },
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.users) {
              const processed = processUsers(data.data.users);
              updateCache('users', processed);
              setUsers(processed);
              return processed;
            }
          }
        } catch (error) {
          console.error('Error fetching users:', error);
        }
        return null;
      };

      const fetchUserLocations = async () => {
        try {
          const response = await fetch('/api/tracking/location/all', {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenForFetch}` },
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data?.locations)) {
              const map: Record<string, { latitude: number; longitude: number; accuracy?: number; lastUpdatedAt?: string; isActive?: boolean }> = {};
              data.data.locations.forEach((loc: { userId: string; latitude: number; longitude: number; accuracy?: number; user?: { isActive?: boolean } }) => {
                if (loc.latitude != null && loc.longitude != null) {
                  map[loc.userId] = {
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    accuracy: loc.accuracy,
                    isActive: loc.user?.isActive,
                  };
                }
              });
              setUserLocations(map);
              return map;
            }
          }
        } catch (error) {
          console.error('Error fetching user locations:', error);
        }
        return null;
      };

      const fetchDevices = async () => {
        try {
          const response = await fetch('/api/devices?limit=1000', {
            headers: { 
              'Authorization': `Bearer ${tokenForFetch}`,
              'Content-Type': 'application/json' 
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.devices) {
              updateCache('devices', data.data.devices);
              setDevices(data.data.devices);
              return data.data.devices;
            }
          }
        } catch (error) {
          console.error('Error fetching devices:', error);
        }
        return null;
      };

      const fetchWeather = async () => {
        try {
          const response = await fetch('/api/weather?type=multi');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              updateCache('weather', data.data);
              setWeatherData(data.data);
              if (data.data.length > 0) {
                setSelectedWeather(data.data[0]);
              }
              return data.data;
            }
          }
        } catch (error) {
          console.error('Error fetching weather:', error);
        }
        return null;
      };

      const fetchProducts = async () => {
        // Prevent double fetching
        if (productsFetchingRef.current) {
          return null;
        }
        productsFetchingRef.current = true;
        try {
          setIsLoadingProducts(true);
          const response = await fetch('/api/products?status=active&limit=500', {
            headers: { Authorization: `Bearer ${tokenForFetch}` }
          });
          if (response.ok) {
            const data = await response.json();
            const list = data.success && (data.data?.products ?? Array.isArray(data.data))
              ? (data.data?.products ?? data.data)
              : [];
            updateCache('products', list);
            setProducts(list);
            return list;
          }
        } catch (error) {
          console.error('Error fetching products:', error);
        } finally {
          setIsLoadingProducts(false);
          productsFetchingRef.current = false;
        }
        return null;
      };

      // Run fetches in PARALLEL - skip products fetch if we already have cache (avoid double load / flash)
      const fetchers = [
        fetchStats(),
        fetchDisasters(),
        fetchUsers(),
        fetchUserLocations(),
        fetchDevices(),
        fetchWeather(),
      ];
      if (!cachedProducts || !Array.isArray(cachedProducts) || cachedProducts.length === 0) {
        fetchers.push(fetchProducts());
      } else {
        setIsLoadingProducts(false);
      }
      try {
        await Promise.all(fetchers);

        // Set up background refresh for each data source (only once)
        if (!fetchersSetupRef.current) {
          refreshData('stats', fetchStats);
          refreshData('disasters', fetchDisasters);
          refreshData('users', fetchUsers);
          refreshData('devices', fetchDevices);
          refreshData('weather', fetchWeather);
          refreshData('products', fetchProducts);
          fetchersSetupRef.current = true;
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [authToken]); // Run when token from context or localStorage is available

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleWeatherSearch = async (query: string) => {
    setWeatherSearchQuery(query);
    if (query.length >= 2) {
      try {
        const response = await fetch(`/api/weather?type=search&search=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.success && data.data) {
          // API returns { cities: [], states: [] }, we need to combine them
          const cities = data.data.cities || [];
          const states = data.data.states || [];
          
          // Convert to CitySearchResult format
          const results: CitySearchResult[] = [
            ...cities.map((c: any) => ({
              city: c.name || c.city,
              state: c.state,
              lat: c.lat,
              lon: c.lon,
            })),
            // For states, we can't provide lat/lon without a city, so skip them or use default
          ];
          
          setWeatherSearchResults(results);
          setShowWeatherSearchResults(results.length > 0);
        } else {
          setWeatherSearchResults([]);
          setShowWeatherSearchResults(false);
        }
      } catch (error) {
        console.error('Error searching cities:', error);
        setWeatherSearchResults([]);
        setShowWeatherSearchResults(false);
      }
    } else {
      setWeatherSearchResults([]);
      setShowWeatherSearchResults(false);
    }
  };

  const handleCitySelect = async (city: CitySearchResult) => {
    setWeatherSearchQuery(`${city.city}, ${city.state}`);
    setShowWeatherSearchResults(false);
    
    try {
      // Try current weather API first (more reliable)
      let response = await fetch(`/api/weather?lat=${city.lat}&lon=${city.lon}&city=${encodeURIComponent(city.city)}&state=${encodeURIComponent(city.state)}`);
      let data = await response.json();
      
      // If current weather fails, try onecall
      if (!data.success || !data.data) {
        response = await fetch(`/api/weather?type=onecall&lat=${city.lat}&lon=${city.lon}&city=${encodeURIComponent(city.city)}&state=${encodeURIComponent(city.state)}`);
        data = await response.json();
      }
      
      if (data.success && data.data) {
        const weather: WeatherData = {
          city: city.city,
          state: city.state,
          temperature: data.data.temperature || data.data.temp || 0,
          description: data.data.description || data.data.weather?.[0]?.description || 'Clear',
          icon: data.data.icon || data.data.weather?.[0]?.icon || '01d',
          humidity: data.data.humidity || data.data.main?.humidity || 0,
          windSpeed: data.data.windSpeed || data.data.wind?.speed || 0,
          pressure: data.data.pressure || data.data.main?.pressure || 0,
          visibility: data.data.visibility || 0,
          uvIndex: data.data.uvIndex || 0,
          feelsLike: data.data.feelsLike || data.data.main?.feels_like || data.data.temperature || 0,
          windDirection: data.data.windDirection || data.data.wind?.deg || 0,
          clouds: data.data.clouds || data.data.clouds?.all || 0,
        };
        
        // Set as selected weather immediately
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
      } else {
        console.error('Weather API returned unsuccessful response:', data);
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
      icon={<HomeIcon className="w-7 h-7" />}
    >
      <div className="space-y-6">
      {/* Stats Cards Row - Compact Style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card className="p-3 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Total Users</p>
            <UsersIcon className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{stats?.overview.totalUsers || 0}</p>
          {stats?.growth.users !== undefined && (
            <p className="text-xs text-blue-400 mt-0.5">
              {stats.growth.users > 0 ? '↑' : stats.growth.users < 0 ? '↓' : '→'} {Math.abs(stats.growth.users)}% from last month
            </p>
          )}
        </Card>
        <Card className="p-3 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Active Volunteers</p>
            <UserGroupIcon className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400 leading-tight">{stats?.overview.totalVolunteers || 0}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {stats?.overview.availableVolunteers || 0} available
          </p>
        </Card>
        <Card className="p-3 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Active Disasters</p>
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400 leading-tight">{stats?.overview.activeDisasters || 0}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {stats?.overview.criticalDisasters || 0} critical
          </p>
        </Card>
        <Card className="p-3 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Service Providers</p>
            <BuildingOfficeIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 leading-tight">{stats?.overview.totalServiceProviders || 0}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {stats?.overview.verifiedServiceProviders || 0} verified
          </p>
        </Card>
        <Card className="p-3 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-muted)]">Incidents</p>
            <MapPinIcon className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 leading-tight">0</p>
        </Card>
      </div>

      {/* Live Weather Section + Products Table - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Live Weather Section */}
        <div>
          <Card className="p-0 overflow-hidden h-full flex flex-col">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-4 text-white relative flex-shrink-0">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <CloudIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Live Weather</h3>
                      <p className="text-xs opacity-80">Real-time conditions</p>
                    </div>
                  </div>
                  <Link href="/dashboard/weather">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer">
                      <ChevronRightIcon className="w-5 h-5" />
                    </div>
                  </Link>
                </div>
                
                {/* Weather Search Bar */}
                <div className="relative mb-3 z-20">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <MagnifyingGlassIcon className="w-4 h-4 text-white/70" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search city or state..."
                      value={weatherSearchQuery}
                      onChange={(e) => handleWeatherSearch(e.target.value)}
                      onFocus={() => {
                        if (weatherSearchQuery.length >= 2 && weatherSearchResults.length > 0) {
                          setShowWeatherSearchResults(true);
                        }
                      }}
                      onBlur={(e) => {
                        // Don't close if clicking on dropdown
                        const relatedTarget = e.relatedTarget as HTMLElement;
                        const clickedElement = document.activeElement;
                        if (!relatedTarget && (!clickedElement || !clickedElement.closest('.weather-search-dropdown'))) {
                          setTimeout(() => setShowWeatherSearchResults(false), 300);
                        }
                      }}
                      className="w-full pl-10 pr-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder:text-white/70 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                    />
                  </div>
                  {showWeatherSearchResults && weatherSearchResults.length > 0 && (
                    <div 
                      className="weather-search-dropdown absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-2xl z-[100] max-h-60 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {weatherSearchResults.map((result, idx) => (
                        <button
                          key={`${result.city}-${result.state}-${idx}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCitySelect(result);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-[var(--bg-input)] transition-colors flex items-center gap-3 border-b border-[var(--border-color)] last:border-b-0 cursor-pointer"
                        >
                          <MapPinIcon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-[var(--text-primary)] truncate">{result.city}</p>
                            <p className="text-xs text-[var(--text-muted)]">{result.state}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedWeather && (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-4xl font-bold">{selectedWeather.temperature}°F</p>
                        <p className="text-sm opacity-90 capitalize font-medium mt-1">{selectedWeather.description}</p>
                        <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                          <MapPinIcon className="w-3 h-3" />
                          {selectedWeather.city}, {selectedWeather.state}
                        </p>
                        {selectedWeather.feelsLike && (
                          <p className="text-xs opacity-80 mt-1">Feels like {selectedWeather.feelsLike}°F</p>
                        )}
                      </div>
                      <div className="text-5xl drop-shadow-lg">{weatherIcons[selectedWeather.icon]}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                        <p className="text-xs opacity-70 mb-1">Humidity</p>
                        <p className="text-sm font-bold">{selectedWeather.humidity}%</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                        <p className="text-xs opacity-70 mb-1">Wind</p>
                        <p className="text-sm font-bold">{selectedWeather.windSpeed} mph</p>
                      </div>
                      {selectedWeather.pressure ? (
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                          <p className="text-xs opacity-70 mb-1">Pressure</p>
                          <p className="text-sm font-bold">{selectedWeather.pressure} hPa</p>
                        </div>
                      ) : selectedWeather.uvIndex !== undefined ? (
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                          <p className="text-xs opacity-70 mb-1">UV Index</p>
                          <p className="text-sm font-bold">{selectedWeather.uvIndex}</p>
                        </div>
                      ) : (
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                          <p className="text-xs opacity-70 mb-1">Clouds</p>
                          <p className="text-sm font-bold">{selectedWeather.clouds || 0}%</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Other Cities Section */}
            <div className="p-4 bg-[var(--bg-card)] flex-1 border-t border-[var(--border-color)]">
              <p className="text-xs font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wide">Other Cities</p>
              <div className="grid grid-cols-3 gap-2">
                {weatherData.slice(1, 4).map((city, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--bg-input)] transition-colors border border-[var(--border-color)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{weatherIcons[city.icon]}</span>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{city.city}</p>
                        <p className="text-xs text-[var(--text-muted)]">{city.state}</p>
                      </div>
                    </div>
                    <span className="text-base font-bold text-[var(--text-primary)]">{city.temperature}°F</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Product List */}
        <div className="h-full">
          <ProductList products={products} isLoading={isLoadingProducts} />
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
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-input)]">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-[var(--text-muted)]">Loading disaster data...</p>
                  </div>
                </div>
              ) : liveDisasters.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-input)] z-10">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheckIcon className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="font-medium text-[var(--text-primary)] mb-1">No Active Disasters</p>
                    <p className="text-sm text-[var(--text-muted)]">All clear in your monitored regions.</p>
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">All Users Map</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    User locations in USA region • Total: <span className="font-semibold text-[var(--text-primary)]">{users.length}</span> users
                  </p>
                </div>
                <Link href="/dashboard/user-management">
                  <Button variant="secondary" size="sm" rightIcon={<ArrowRightIcon className="w-4 h-4" />}>
                    Manage Users
                  </Button>
                </Link>
              </div>
              {/* Device Filter Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setDeviceFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    deviceFilter === 'all'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)]'
                  }`}
                >
                  All Users ({users.length})
                </button>
                <button
                  onClick={() => setDeviceFilter('with_device')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    deviceFilter === 'with_device'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)]'
                  }`}
                >
                  With Device ({users.filter(u => {
                    const userDevice = devices.find(d => 
                      d.ownerName?.toLowerCase() === u.fullName?.toLowerCase() ||
                      d.primaryOwner?.name?.toLowerCase() === u.fullName?.toLowerCase()
                    );
                    return !!userDevice;
                  }).length})
                </button>
                <button
                  onClick={() => setDeviceFilter('without_device')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    deviceFilter === 'without_device'
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)]'
                  }`}
                >
                  Without Device ({users.filter(u => {
                    const userDevice = devices.find(d => 
                      d.ownerName?.toLowerCase() === u.fullName?.toLowerCase() ||
                      d.primaryOwner?.name?.toLowerCase() === u.fullName?.toLowerCase()
                    );
                    return !userDevice;
                  }).length})
                </button>
              </div>
            </div>
            <div className="flex-1 relative min-h-[500px]">
              {users.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-input)]">
                  <div className="text-center">
                    {isLoading ? (
                      <>
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-sm text-[var(--text-muted)]">Loading user data...</p>
                      </>
                    ) : (
                      <>
                        <UsersIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No user location data</p>
                        <p className="text-sm text-[var(--text-muted)]">User locations are loaded from the tracking API. Visit User Management to see all users.</p>
                      </>
                    )}
                  </div>
                </div>
              ) : (() => {
                // Filter users based on device filter
                const filteredUsers = users.filter(u => {
                  if (deviceFilter === 'all') return true;
                  const userDevice = devices.find(d => 
                    d.ownerName?.toLowerCase() === u.fullName?.toLowerCase() ||
                    d.primaryOwner?.name?.toLowerCase() === u.fullName?.toLowerCase()
                  );
                  if (deviceFilter === 'with_device') return !!userDevice;
                  if (deviceFilter === 'without_device') return !userDevice;
                  return true;
                });

                return (
                  <AllUsersMap
                    userLocations={userLocations}
                    users={filteredUsers.map(u => ({
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
                );
              })()}
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

      {/* Weekly Activity Chart */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Weekly Activity</h3>
            <p className="text-sm text-[var(--text-muted)]">Disasters, Emergencies & Resolutions</p>
          </div>
          <Badge variant="primary">This Week</Badge>
        </div>
        <div className="h-64 w-full">
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

