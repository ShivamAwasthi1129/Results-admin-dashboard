'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, Badge, Button, Input } from '@/components/ui';
import {
  SunIcon,
  CloudIcon,
  MapPinIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  BeakerIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface CurrentWeather {
  city: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windGust?: number;
  windDirection: number;
  description: string;
  icon: string;
  visibility: number;
  clouds: number;
  sunrise: number;
  sunset: number;
  timezone: string;
  timezoneOffset: number;
  uvIndex: number;
  dewPoint: number;
}

interface HourlyForecast {
  dt: number;
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  pop: number;
  uvIndex: number;
}

interface DailyForecast {
  dt: number;
  sunrise: number;
  sunset: number;
  tempDay: number;
  tempMin: number;
  tempMax: number;
  tempNight: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  pop: number;
  uvIndex: number;
  summary?: string;
}

interface WeatherAlert {
  senderName: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
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

const getWindDirection = (deg: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(deg / 45) % 8];
};

const getUVIndexLevel = (uvi: number): { level: string; color: string } => {
  if (uvi <= 2) return { level: 'Low', color: 'text-green-400' };
  if (uvi <= 5) return { level: 'Moderate', color: 'text-yellow-400' };
  if (uvi <= 7) return { level: 'High', color: 'text-orange-400' };
  if (uvi <= 10) return { level: 'Very High', color: 'text-red-400' };
  return { level: 'Extreme', color: 'text-purple-400' };
};

// Major US cities for search
const usCities = [
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

export default function WeatherPage() {
  const [multiCityWeather, setMultiCityWeather] = useState<CurrentWeather[]>([]);
  const [selectedCity, setSelectedCity] = useState<CurrentWeather | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [dailyForecast, setDailyForecast] = useState<DailyForecast[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ city: string; state: string; lat: number; lon: number }[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const fetchWeatherData = async () => {
    setIsLoading(true);
    try {
      // Fetch multi-city weather
      const multiResponse = await fetch('/api/weather?type=multi');
      const multiData = await multiResponse.json();
      if (multiData.success) {
        setMultiCityWeather(multiData.data);
        if (multiData.data.length > 0 && !selectedCity) {
          setSelectedCity(multiData.data[0]);
          // Fetch full data for first city
          fetchCityWeather(multiData.data[0].lat, multiData.data[0].lon, multiData.data[0].city, multiData.data[0].state);
        }
      }

      // Fetch alerts
      const alertsResponse = await fetch('/api/weather?type=alerts');
      const alertsData = await alertsResponse.json();
      if (alertsData.success) {
        setAlerts(alertsData.data);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCityWeather = async (lat: number, lon: number, city: string, state: string) => {
    try {
      // Fetch full One Call data
      const response = await fetch(`/api/weather?type=onecall&lat=${lat}&lon=${lon}&city=${city}&state=${state}`);
      const data = await response.json();
      if (data.success) {
        setSelectedCity(data.data.current);
        setHourlyForecast(data.data.hourly?.slice(0, 24) || []);
        setDailyForecast(data.data.daily || []);
        if (data.data.alerts?.length > 0) {
          setAlerts(data.data.alerts);
        }
      }
    } catch (error) {
      console.error('Error fetching city weather:', error);
    }
  };

  useEffect(() => {
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const matchingCities = usCities.filter(c => 
        c.city.toLowerCase().includes(query.toLowerCase()) ||
        c.state.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(matchingCities);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleCitySelect = (city: { city: string; state: string; lat: number; lon: number }) => {
    setSearchQuery('');
    setShowSearchResults(false);
    fetchCityWeather(city.lat, city.lon, city.city, city.state);
  };

  const formatTime = (timestamp: number, timezoneOffset?: number) => {
    const date = new Date((timestamp + (timezoneOffset || 0)) * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
  };

  const formatHour = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  };

  const getDayName = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getFullDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <DashboardLayout
      title="Live Weather - USA"
      subtitle="Real-time weather data powered by OpenWeather One Call API 3.0"
    >
      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Input
              icon={<MagnifyingGlassIcon className="w-5 h-5" />}
              placeholder="Search any US city (e.g., New York, Miami, Seattle)..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    className="w-full px-4 py-3 text-left hover:bg-[var(--bg-input)] transition-colors flex items-center justify-between border-b border-[var(--border-color)] last:border-b-0"
                    onClick={() => handleCitySelect(result)}
                  >
                    <div className="flex items-center gap-3">
                      <MapPinIcon className="w-5 h-5 text-[var(--text-muted)]" />
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{result.city}</p>
                        <p className="text-sm text-[var(--text-muted)]">{result.state}, USA</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-[var(--text-muted)]" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button 
            variant="secondary" 
            leftIcon={<ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={fetchWeatherData}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Weather Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className="p-4 rounded-2xl border flex items-start gap-4 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-amber-500/40"
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-amber-500/30 shrink-0">
                <ExclamationTriangleIcon className="w-7 h-7 text-amber-300" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-[var(--text-primary)] text-lg">{alert.event}</p>
                    <p className="text-sm text-[var(--text-muted)]">{alert.senderName}</p>
                  </div>
                  <div className="flex gap-2">
                    {alert.tags?.map((tag, i) => (
                      <Badge key={i} variant="warning" size="sm">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-2">{alert.description}</p>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Valid until: {new Date(alert.end * 1000).toLocaleString('en-US')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Weather Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Current Weather - Large Card */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-8 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5" />
                  <span className="text-lg font-medium">
                    {selectedCity?.city}, {selectedCity?.state || selectedCity?.country}
                  </span>
                </div>
                <button
                  onClick={fetchWeatherData}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <div className="text-8xl font-extralight mb-2">
                    {selectedCity?.temperature}°<span className="text-4xl">F</span>
                  </div>
                  <p className="text-xl capitalize opacity-90">{selectedCity?.description}</p>
                  <p className="text-sm opacity-70 mt-1">
                    Feels like {selectedCity?.feelsLike}°F
                  </p>
                </div>
                <div className="text-9xl opacity-80">
                  {weatherIcons[selectedCity?.icon || '01d']}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4 mt-8 pt-6 border-t border-white/20">
                <div className="text-center">
                  <p className="text-2xl font-light">{selectedCity?.humidity}%</p>
                  <p className="text-xs opacity-70">Humidity</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-light">{selectedCity?.windSpeed} mph</p>
                  <p className="text-xs opacity-70">Wind {getWindDirection(selectedCity?.windDirection || 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-light">{selectedCity?.uvIndex}</p>
                  <p className="text-xs opacity-70">UV Index</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-light">{selectedCity?.pressure}</p>
                  <p className="text-xs opacity-70">Pressure hPa</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-light">{selectedCity?.dewPoint}°F</p>
                  <p className="text-xs opacity-70">Dew Point</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sun Info */}
          <div className="p-6 bg-[var(--bg-card)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <SunIcon className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Sunrise</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {formatTime(selectedCity?.sunrise || 0, selectedCity?.timezoneOffset)}
                  </p>
                </div>
              </div>
              <div className="flex-1 mx-8">
                <div className="h-2 bg-gradient-to-r from-amber-500 via-blue-500 to-indigo-500 rounded-full" />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)] text-right">Sunset</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {formatTime(selectedCity?.sunset || 0, selectedCity?.timezoneOffset)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  🌙
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* City List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Major US Cities</h3>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
            {multiCityWeather.map((city, index) => (
              <button
                key={index}
                onClick={() => fetchCityWeather(city.lat, city.lon, city.city, city.state || '')}
                className={`w-full p-4 rounded-xl transition-all flex items-center justify-between ${
                  selectedCity?.city === city.city
                    ? 'bg-[var(--primary-500)]/20 border border-[var(--primary-500)]/50'
                    : 'bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{weatherIcons[city.icon]}</span>
                  <div className="text-left">
                    <p className="font-medium text-[var(--text-primary)]">{city.city}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">{city.state}, USA • {city.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{city.temperature}°F</p>
                  <p className="text-xs text-[var(--text-muted)]">H: {city.humidity}%</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
            Last updated: {lastUpdated.toLocaleTimeString('en-US')}
          </p>
        </Card>
      </div>

      {/* Hourly Forecast */}
      {hourlyForecast.length > 0 && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">24-Hour Forecast</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {hourlyForecast.map((hour, index) => (
              <div
                key={index}
                className="flex-shrink-0 text-center p-4 rounded-2xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] transition-colors min-w-[100px]"
              >
                <p className="text-sm font-medium text-[var(--text-muted)] mb-2">
                  {index === 0 ? 'Now' : formatHour(hour.dt)}
                </p>
                <div className="text-3xl mb-2">{weatherIcons[hour.icon]}</div>
                <p className="text-xl font-bold text-[var(--text-primary)]">{hour.temp}°F</p>
                {hour.pop > 0 && (
                  <p className="text-xs text-blue-400 mt-1">💧 {Math.round(hour.pop * 100)}%</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 8-Day Forecast */}
      {dailyForecast.length > 0 && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">8-Day Forecast</h3>
          <div className="grid grid-cols-8 gap-3">
            {dailyForecast.map((day, index) => (
              <div
                key={index}
                className="text-center p-4 rounded-2xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">
                  {index === 0 ? 'Today' : getDayName(day.dt)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mb-2">{getFullDate(day.dt)}</p>
                <div className="text-4xl mb-2">{weatherIcons[day.icon]}</div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{day.tempDay}°F</p>
                <div className="flex items-center justify-center gap-2 mt-2 text-sm">
                  <span className="text-red-400">
                    <ArrowTrendingUpIcon className="w-3 h-3 inline" /> {day.tempMax}°
                  </span>
                  <span className="text-blue-400">
                    <ArrowTrendingDownIcon className="w-3 h-3 inline" /> {day.tempMin}°
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2 capitalize line-clamp-1">{day.description}</p>
                {day.pop > 0 && (
                  <p className="text-xs text-blue-400 mt-1">💧 {Math.round(day.pop * 100)}%</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Weather Details Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              💧
            </div>
            <span className="text-sm text-[var(--text-muted)]">Humidity</span>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{selectedCity?.humidity}%</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {selectedCity?.humidity && selectedCity.humidity > 70 ? 'High humidity' : 'Comfortable'}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              💨
            </div>
            <span className="text-sm text-[var(--text-muted)]">Wind</span>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{selectedCity?.windSpeed} mph</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {getWindDirection(selectedCity?.windDirection || 0)} • Gusts {selectedCity?.windGust || 'N/A'} mph
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              ☀️
            </div>
            <span className="text-sm text-[var(--text-muted)]">UV Index</span>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{selectedCity?.uvIndex}</p>
          <p className={`text-xs mt-1 ${getUVIndexLevel(selectedCity?.uvIndex || 0).color}`}>
            {getUVIndexLevel(selectedCity?.uvIndex || 0).level}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <BeakerIcon className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">Pressure</span>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{selectedCity?.pressure}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">hPa (hectopascal)</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <EyeIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">Visibility</span>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {selectedCity?.visibility} mi
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {(selectedCity?.visibility || 0) > 5 ? 'Clear visibility' : 'Reduced visibility'}
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
