import { NextRequest, NextResponse } from 'next/server';

// OpenWeatherMap One Call API 3.0
// Documentation: https://openweathermap.org/api/one-call-3
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';

interface CurrentWeather {
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  temperature: number;
  temperatureCelsius: number;
  feelsLike: number;
  feelsLikeCelsius: number;
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
  dewPointCelsius: number;
  airQuality?: string;
}

// Helper function to convert Fahrenheit to Celsius
function fahrenheitToCelsius(f: number): number {
  return Math.round((f - 32) * 5 / 9);
}

interface MinutelyForecast {
  dt: number;
  precipitation: number;
}

interface HourlyForecast {
  dt: number;
  temp: number;
  tempCelsius: number;
  feelsLike: number;
  feelsLikeCelsius: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windGust?: number;
  windDirection: number;
  description: string;
  icon: string;
  clouds: number;
  visibility: number;
  pop: number; // Probability of precipitation
  uvIndex: number;
}

interface DailyForecast {
  dt: number;
  sunrise: number;
  sunset: number;
  moonrise: number;
  moonset: number;
  moonPhase: number;
  summary?: string;
  tempDay: number;
  tempDayCelsius: number;
  tempMin: number;
  tempMinCelsius: number;
  tempMax: number;
  tempMaxCelsius: number;
  tempNight: number;
  tempNightCelsius: number;
  tempMorning: number;
  tempMorningCelsius: number;
  tempEvening: number;
  tempEveningCelsius: number;
  feelsLikeDay: number;
  feelsLikeDayCelsius: number;
  feelsLikeNight: number;
  feelsLikeNightCelsius: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windGust?: number;
  windDirection: number;
  description: string;
  icon: string;
  clouds: number;
  pop: number;
  rain?: number;
  snow?: number;
  uvIndex: number;
}

interface WeatherAlert {
  senderName: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
}

// USA cities with state information - disaster prone regions
const defaultCities = [
  { name: 'New York', state: 'NY', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
  { name: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 },
  { name: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918 },
  { name: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298 },
  { name: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.0740 },
  { name: 'San Francisco', state: 'CA', lat: 37.7749, lon: -122.4194 },
  { name: 'Seattle', state: 'WA', lat: 47.6062, lon: -122.3321 },
  { name: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903 },
  { name: 'New Orleans', state: 'LA', lat: 29.9511, lon: -90.0715 },
  { name: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.7970 },
  { name: 'Atlanta', state: 'GA', lat: 33.7490, lon: -84.3880 },
];

// US States for search
const usStates = [
  { name: 'Alabama', abbr: 'AL' }, { name: 'Alaska', abbr: 'AK' }, { name: 'Arizona', abbr: 'AZ' },
  { name: 'Arkansas', abbr: 'AR' }, { name: 'California', abbr: 'CA' }, { name: 'Colorado', abbr: 'CO' },
  { name: 'Connecticut', abbr: 'CT' }, { name: 'Delaware', abbr: 'DE' }, { name: 'Florida', abbr: 'FL' },
  { name: 'Georgia', abbr: 'GA' }, { name: 'Hawaii', abbr: 'HI' }, { name: 'Idaho', abbr: 'ID' },
  { name: 'Illinois', abbr: 'IL' }, { name: 'Indiana', abbr: 'IN' }, { name: 'Iowa', abbr: 'IA' },
  { name: 'Kansas', abbr: 'KS' }, { name: 'Kentucky', abbr: 'KY' }, { name: 'Louisiana', abbr: 'LA' },
  { name: 'Maine', abbr: 'ME' }, { name: 'Maryland', abbr: 'MD' }, { name: 'Massachusetts', abbr: 'MA' },
  { name: 'Michigan', abbr: 'MI' }, { name: 'Minnesota', abbr: 'MN' }, { name: 'Mississippi', abbr: 'MS' },
  { name: 'Missouri', abbr: 'MO' }, { name: 'Montana', abbr: 'MT' }, { name: 'Nebraska', abbr: 'NE' },
  { name: 'Nevada', abbr: 'NV' }, { name: 'New Hampshire', abbr: 'NH' }, { name: 'New Jersey', abbr: 'NJ' },
  { name: 'New Mexico', abbr: 'NM' }, { name: 'New York', abbr: 'NY' }, { name: 'North Carolina', abbr: 'NC' },
  { name: 'North Dakota', abbr: 'ND' }, { name: 'Ohio', abbr: 'OH' }, { name: 'Oklahoma', abbr: 'OK' },
  { name: 'Oregon', abbr: 'OR' }, { name: 'Pennsylvania', abbr: 'PA' }, { name: 'Rhode Island', abbr: 'RI' },
  { name: 'South Carolina', abbr: 'SC' }, { name: 'South Dakota', abbr: 'SD' }, { name: 'Tennessee', abbr: 'TN' },
  { name: 'Texas', abbr: 'TX' }, { name: 'Utah', abbr: 'UT' }, { name: 'Vermont', abbr: 'VT' },
  { name: 'Virginia', abbr: 'VA' }, { name: 'Washington', abbr: 'WA' }, { name: 'West Virginia', abbr: 'WV' },
  { name: 'Wisconsin', abbr: 'WI' }, { name: 'Wyoming', abbr: 'WY' }
];

// Mock data generator - ONLY used when no API key is available
// Shows a warning that data is not real
const getMockCurrentWeather = (city: string, state: string = ''): CurrentWeather => {
  const mockConditions = [
    { description: 'API key not configured - mock data', icon: '01d' },
  ];
  
  const condition = mockConditions[0];
  const tempF = 32; // Show a fixed temperature to indicate mock data
  const feelsLikeF = 28;
  const dewPointF = 25;
  
  return {
    city,
    state: state || 'USA',
    country: 'US',
    lat: 40.7128,
    lon: -74.006,
    temperature: tempF,
    temperatureCelsius: fahrenheitToCelsius(tempF),
    feelsLike: feelsLikeF,
    feelsLikeCelsius: fahrenheitToCelsius(feelsLikeF),
    humidity: 50,
    pressure: 1015,
    windSpeed: 10,
    windGust: 15,
    windDirection: 180,
    description: condition.description,
    icon: condition.icon,
    visibility: 10,
    clouds: 25,
    sunrise: Date.now() / 1000 - 3600 * 6,
    sunset: Date.now() / 1000 + 3600 * 6,
    timezone: 'America/New_York',
    timezoneOffset: -18000,
    uvIndex: 3,
    dewPoint: dewPointF,
    dewPointCelsius: fahrenheitToCelsius(dewPointF),
  };
};

const getMockHourlyForecast = (): HourlyForecast[] => {
  const forecasts: HourlyForecast[] = [];
  const now = Date.now() / 1000;
  
  for (let i = 0; i < 48; i++) {
    const tempF = 32 + (i % 10); // Fixed pattern to show mock data
    const feelsLikeF = tempF - 4;
    forecasts.push({
      dt: now + (i * 3600),
      temp: tempF,
      tempCelsius: fahrenheitToCelsius(tempF),
      feelsLike: feelsLikeF,
      feelsLikeCelsius: fahrenheitToCelsius(feelsLikeF),
      humidity: 50,
      pressure: 1015,
      windSpeed: 10,
      windDirection: 180,
      description: 'API key not configured - mock data',
      icon: '01d',
      clouds: 25,
      visibility: 10,
      pop: 0.1,
      uvIndex: 3,
    });
  }
  
  return forecasts;
};

const getMockDailyForecast = (): DailyForecast[] => {
  const forecasts: DailyForecast[] = [];
  const now = Date.now() / 1000;
  
  for (let i = 0; i < 8; i++) {
    const tempDay = 35 + i * 2; // Fixed pattern
    const tempMin = tempDay - 8;
    const tempMax = tempDay + 5;
    const tempNight = tempDay - 10;
    const tempMorning = tempDay - 5;
    const tempEvening = tempDay + 2;
    const feelsLikeDay = tempDay - 3;
    const feelsLikeNight = tempNight - 5;
    
    forecasts.push({
      dt: now + (i * 86400),
      sunrise: now + (i * 86400) + 21600,
      sunset: now + (i * 86400) + 64800,
      moonrise: now + (i * 86400) + 28800,
      moonset: now + (i * 86400) + 72000,
      moonPhase: 0.5,
      summary: 'API key not configured - mock data',
      tempDay,
      tempDayCelsius: fahrenheitToCelsius(tempDay),
      tempMin,
      tempMinCelsius: fahrenheitToCelsius(tempMin),
      tempMax,
      tempMaxCelsius: fahrenheitToCelsius(tempMax),
      tempNight,
      tempNightCelsius: fahrenheitToCelsius(tempNight),
      tempMorning,
      tempMorningCelsius: fahrenheitToCelsius(tempMorning),
      tempEvening,
      tempEveningCelsius: fahrenheitToCelsius(tempEvening),
      feelsLikeDay,
      feelsLikeDayCelsius: fahrenheitToCelsius(feelsLikeDay),
      feelsLikeNight,
      feelsLikeNightCelsius: fahrenheitToCelsius(feelsLikeNight),
      humidity: 50,
      pressure: 1015,
      windSpeed: 10,
      windDirection: 180,
      description: 'API key not configured - mock data',
      icon: '01d',
      clouds: 25,
      pop: 0.1,
      uvIndex: 3,
    });
  }
  
  return forecasts;
};

const getMockAlerts = (): WeatherAlert[] => {
  const alertTypes = [
    { event: 'Hurricane Warning', description: 'Hurricane approaching. Evacuate low-lying areas immediately.', tags: ['Hurricane', 'Extreme'] },
    { event: 'Tornado Watch', description: 'Conditions favorable for tornado development. Seek shelter immediately if warning issued.', tags: ['Tornado', 'Severe'] },
    { event: 'Flash Flood Warning', description: 'Heavy rainfall expected. Avoid flooded roads and low-lying areas.', tags: ['Flood', 'Severe'] },
    { event: 'Extreme Heat Advisory', description: 'Temperatures exceeding 105°F expected. Stay hydrated and avoid outdoor activities.', tags: ['Heat', 'Advisory'] },
    { event: 'Winter Storm Warning', description: 'Heavy snowfall and blizzard conditions expected. Travel not recommended.', tags: ['Winter', 'Storm'] },
    { event: 'Red Flag Warning', description: 'High fire danger due to dry conditions and high winds. No outdoor burning.', tags: ['Fire', 'Warning'] },
  ];
  
  return alertTypes.filter(() => Math.random() > 0.6).slice(0, 3).map(alert => ({
    senderName: 'NWS National Weather Service',
    event: alert.event,
    start: Date.now() / 1000,
    end: Date.now() / 1000 + 86400 * 2,
    description: alert.description,
    tags: alert.tags,
  }));
};

// Fetch from One Call API 3.0
async function fetchOneCallData(lat: number, lon: number) {
  if (!WEATHER_API_KEY) {
    return null;
  }

  try {
    // One Call API 3.0 endpoint
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=imperial`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('One Call API error:', response.status, response.statusText);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch One Call data:', error);
    return null;
  }
}

// Fetch from free OpenWeatherMap 2.5 API (doesn't require paid subscription)
async function fetchCurrentWeatherFree(lat: number, lon: number) {
  if (!WEATHER_API_KEY) {
    return null;
  }
  
  try {
    // Current weather API 2.5 (free tier)
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=imperial`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Weather API 2.5 error:', response.status, response.statusText);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch current weather:', error);
    return null;
  }
}

// Fetch 5-day forecast from free API
async function fetchForecastFree(lat: number, lon: number) {
  if (!WEATHER_API_KEY) {
    return null;
  }
  
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=imperial`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Forecast API error:', response.status, response.statusText);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch forecast:', error);
    return null;
  }
}

// Parse free API current weather response
function parseFreeCurrentWeather(data: any, cityInfo: { name: string; state: string }): CurrentWeather {
  const tempF = Math.round(data.main.temp);
  const feelsLikeF = Math.round(data.main.feels_like);
  const dewPointF = tempF - Math.round((100 - data.main.humidity) / 5); // Approximate dew point
  
  return {
    city: cityInfo.name,
    state: cityInfo.state,
    country: 'US',
    lat: data.coord.lat,
    lon: data.coord.lon,
    temperature: tempF,
    temperatureCelsius: fahrenheitToCelsius(tempF),
    feelsLike: feelsLikeF,
    feelsLikeCelsius: fahrenheitToCelsius(feelsLikeF),
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    windSpeed: Math.round(data.wind?.speed || 0),
    windGust: data.wind?.gust ? Math.round(data.wind.gust) : undefined,
    windDirection: data.wind?.deg || 0,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    visibility: Math.round((data.visibility || 10000) / 1609),
    clouds: data.clouds?.all || 0,
    sunrise: data.sys.sunrise,
    sunset: data.sys.sunset,
    timezone: `UTC${data.timezone >= 0 ? '+' : ''}${data.timezone / 3600}`,
    timezoneOffset: data.timezone,
    uvIndex: 0, // Not available in free API
    dewPoint: dewPointF,
    dewPointCelsius: fahrenheitToCelsius(dewPointF),
  };
}

// Parse free API forecast response to hourly format
function parseFreeForecastToHourly(data: any): HourlyForecast[] {
  return data.list.map((item: any) => {
    const tempF = Math.round(item.main.temp);
    const feelsLikeF = Math.round(item.main.feels_like);
    
    return {
      dt: item.dt,
      temp: tempF,
      tempCelsius: fahrenheitToCelsius(tempF),
      feelsLike: feelsLikeF,
      feelsLikeCelsius: fahrenheitToCelsius(feelsLikeF),
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      windSpeed: Math.round(item.wind?.speed || 0),
      windGust: item.wind?.gust ? Math.round(item.wind.gust) : undefined,
      windDirection: item.wind?.deg || 0,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      clouds: item.clouds?.all || 0,
      visibility: Math.round((item.visibility || 10000) / 1609),
      pop: item.pop || 0,
      uvIndex: 0,
    };
  });
}

// Parse free API forecast response to daily format
function parseFreeForecastToDaily(data: any): DailyForecast[] {
  // Group forecast by day
  const dailyMap = new Map<string, any[]>();
  
  data.list.forEach((item: any) => {
    const date = new Date(item.dt * 1000).toDateString();
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date)?.push(item);
  });
  
  const dailyForecasts: DailyForecast[] = [];
  
  dailyMap.forEach((items, date) => {
    const temps = items.map(i => i.main.temp);
    const tempMin = Math.round(Math.min(...temps));
    const tempMax = Math.round(Math.max(...temps));
    const tempDay = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    const tempMorning = items.find(i => new Date(i.dt * 1000).getHours() === 9)?.main.temp || tempDay;
    const tempEvening = items.find(i => new Date(i.dt * 1000).getHours() === 18)?.main.temp || tempDay;
    const tempNight = items.find(i => new Date(i.dt * 1000).getHours() === 21)?.main.temp || tempDay - 10;
    
    const midday = items.find(i => new Date(i.dt * 1000).getHours() === 12) || items[0];
    const feelsLikeDay = Math.round(midday.main.feels_like);
    const feelsLikeNight = Math.round(tempNight - 2);
    
    dailyForecasts.push({
      dt: items[0].dt,
      sunrise: 0,
      sunset: 0,
      moonrise: 0,
      moonset: 0,
      moonPhase: 0,
      tempDay: Math.round(tempDay),
      tempDayCelsius: fahrenheitToCelsius(Math.round(tempDay)),
      tempMin,
      tempMinCelsius: fahrenheitToCelsius(tempMin),
      tempMax,
      tempMaxCelsius: fahrenheitToCelsius(tempMax),
      tempNight: Math.round(tempNight),
      tempNightCelsius: fahrenheitToCelsius(Math.round(tempNight)),
      tempMorning: Math.round(tempMorning),
      tempMorningCelsius: fahrenheitToCelsius(Math.round(tempMorning)),
      tempEvening: Math.round(tempEvening),
      tempEveningCelsius: fahrenheitToCelsius(Math.round(tempEvening)),
      feelsLikeDay,
      feelsLikeDayCelsius: fahrenheitToCelsius(feelsLikeDay),
      feelsLikeNight,
      feelsLikeNightCelsius: fahrenheitToCelsius(feelsLikeNight),
      humidity: midday.main.humidity,
      pressure: midday.main.pressure,
      windSpeed: Math.round(midday.wind?.speed || 0),
      windGust: midday.wind?.gust ? Math.round(midday.wind.gust) : undefined,
      windDirection: midday.wind?.deg || 0,
      description: midday.weather[0].description,
      icon: midday.weather[0].icon,
      clouds: midday.clouds?.all || 0,
      pop: Math.max(...items.map(i => i.pop || 0)),
      rain: items.reduce((acc, i) => acc + (i.rain?.['3h'] || 0), 0),
      snow: items.reduce((acc, i) => acc + (i.snow?.['3h'] || 0), 0),
      uvIndex: 0,
    });
  });
  
  return dailyForecasts;
}

// Parse One Call API response
function parseOneCallData(data: any, cityInfo: { name: string; state: string }) {
  const tempF = Math.round(data.current.temp);
  const feelsLikeF = Math.round(data.current.feels_like);
  const dewPointF = Math.round(data.current.dew_point);
  
  const current: CurrentWeather = {
    city: cityInfo.name,
    state: cityInfo.state,
    country: 'US',
    lat: data.lat,
    lon: data.lon,
    temperature: tempF,
    temperatureCelsius: fahrenheitToCelsius(tempF),
    feelsLike: feelsLikeF,
    feelsLikeCelsius: fahrenheitToCelsius(feelsLikeF),
    humidity: data.current.humidity,
    pressure: data.current.pressure,
    windSpeed: Math.round(data.current.wind_speed),
    windGust: data.current.wind_gust ? Math.round(data.current.wind_gust) : undefined,
    windDirection: data.current.wind_deg,
    description: data.current.weather[0].description,
    icon: data.current.weather[0].icon,
    visibility: Math.round(data.current.visibility / 1609), // Convert meters to miles
    clouds: data.current.clouds,
    sunrise: data.current.sunrise,
    sunset: data.current.sunset,
    timezone: data.timezone,
    timezoneOffset: data.timezone_offset,
    uvIndex: Math.round(data.current.uvi),
    dewPoint: dewPointF,
    dewPointCelsius: fahrenheitToCelsius(dewPointF),
  };

  const minutely: MinutelyForecast[] = data.minutely?.map((m: any) => ({
    dt: m.dt,
    precipitation: m.precipitation,
  })) || [];

  const hourly: HourlyForecast[] = data.hourly?.map((h: any) => {
    const hTempF = Math.round(h.temp);
    const hFeelsLikeF = Math.round(h.feels_like);
    return {
      dt: h.dt,
      temp: hTempF,
      tempCelsius: fahrenheitToCelsius(hTempF),
      feelsLike: hFeelsLikeF,
      feelsLikeCelsius: fahrenheitToCelsius(hFeelsLikeF),
      humidity: h.humidity,
      pressure: h.pressure,
      windSpeed: Math.round(h.wind_speed),
      windGust: h.wind_gust ? Math.round(h.wind_gust) : undefined,
      windDirection: h.wind_deg,
      description: h.weather[0].description,
      icon: h.weather[0].icon,
      clouds: h.clouds,
      visibility: Math.round(h.visibility / 1609),
      pop: h.pop,
      uvIndex: Math.round(h.uvi),
    };
  }) || [];

  const daily: DailyForecast[] = data.daily?.map((d: any) => {
    const dTempDay = Math.round(d.temp.day);
    const dTempMin = Math.round(d.temp.min);
    const dTempMax = Math.round(d.temp.max);
    const dTempNight = Math.round(d.temp.night);
    const dTempMorning = Math.round(d.temp.morn);
    const dTempEvening = Math.round(d.temp.eve);
    const dFeelsLikeDay = Math.round(d.feels_like.day);
    const dFeelsLikeNight = Math.round(d.feels_like.night);
    
    return {
      dt: d.dt,
      sunrise: d.sunrise,
      sunset: d.sunset,
      moonrise: d.moonrise,
      moonset: d.moonset,
      moonPhase: d.moon_phase,
      summary: d.summary,
      tempDay: dTempDay,
      tempDayCelsius: fahrenheitToCelsius(dTempDay),
      tempMin: dTempMin,
      tempMinCelsius: fahrenheitToCelsius(dTempMin),
      tempMax: dTempMax,
      tempMaxCelsius: fahrenheitToCelsius(dTempMax),
      tempNight: dTempNight,
      tempNightCelsius: fahrenheitToCelsius(dTempNight),
      tempMorning: dTempMorning,
      tempMorningCelsius: fahrenheitToCelsius(dTempMorning),
      tempEvening: dTempEvening,
      tempEveningCelsius: fahrenheitToCelsius(dTempEvening),
      feelsLikeDay: dFeelsLikeDay,
      feelsLikeDayCelsius: fahrenheitToCelsius(dFeelsLikeDay),
      feelsLikeNight: dFeelsLikeNight,
      feelsLikeNightCelsius: fahrenheitToCelsius(dFeelsLikeNight),
      humidity: d.humidity,
      pressure: d.pressure,
      windSpeed: Math.round(d.wind_speed),
      windGust: d.wind_gust ? Math.round(d.wind_gust) : undefined,
      windDirection: d.wind_deg,
      description: d.weather[0].description,
      icon: d.weather[0].icon,
      clouds: d.clouds,
      pop: d.pop,
      rain: d.rain,
      snow: d.snow,
      uvIndex: Math.round(d.uvi),
    };
  }) || [];

  const alerts: WeatherAlert[] = data.alerts?.map((a: any) => ({
    senderName: a.sender_name,
    event: a.event,
    start: a.start,
    end: a.end,
    description: a.description,
    tags: a.tags || [],
  })) || [];

  return { current, minutely, hourly, daily, alerts };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const type = searchParams.get('type') || 'current';
    const search = searchParams.get('search');
    
    // Search for cities
    if (type === 'search' && search) {
      const searchLower = search.toLowerCase();
      const matchingCities = defaultCities.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.state.toLowerCase().includes(searchLower)
      );
      const matchingStates = usStates.filter(s =>
        s.name.toLowerCase().includes(searchLower) ||
        s.abbr.toLowerCase().includes(searchLower)
      );
      
      return NextResponse.json({
        success: true,
        data: { cities: matchingCities, states: matchingStates },
      });
    }
    
    // Return states list
    if (type === 'states') {
      return NextResponse.json({
        success: true,
        data: usStates,
      });
    }

    // Return cities list
    if (type === 'cities') {
      return NextResponse.json({
        success: true,
        data: defaultCities,
      });
    }
    
    // Get coordinates
    let targetLat = lat ? parseFloat(lat) : 40.7128;
    let targetLon = lon ? parseFloat(lon) : -74.0060;
    let cityInfo = { name: city || 'New York', state: state || 'NY' };

    // If city name provided, find coordinates
    if (city) {
      const foundCity = defaultCities.find(c => 
        c.name.toLowerCase() === city.toLowerCase() ||
        c.state.toLowerCase() === city.toLowerCase()
      );
      if (foundCity) {
        targetLat = foundCity.lat;
        targetLon = foundCity.lon;
        cityInfo = { name: foundCity.name, state: foundCity.state };
      }
    }

    // If no API key, return mock data
    if (!WEATHER_API_KEY) {
      console.warn('OPENWEATHER_API_KEY not set. Using mock data.');
      
      if (type === 'multi') {
        const multiCityData = defaultCities.slice(0, 8).map(c => getMockCurrentWeather(c.name, c.state));
        return NextResponse.json({
          success: true,
          data: multiCityData,
          source: 'mock',
        });
      }
      
      if (type === 'onecall' || type === 'full') {
        return NextResponse.json({
          success: true,
          data: {
            current: getMockCurrentWeather(cityInfo.name, cityInfo.state),
            hourly: getMockHourlyForecast(),
            daily: getMockDailyForecast(),
            alerts: getMockAlerts(),
          },
          source: 'mock',
        });
      }

      if (type === 'hourly') {
        return NextResponse.json({
          success: true,
          data: getMockHourlyForecast(),
          source: 'mock',
        });
      }

      if (type === 'daily' || type === 'forecast') {
        return NextResponse.json({
          success: true,
          data: getMockDailyForecast(),
          source: 'mock',
        });
      }
      
      if (type === 'alerts') {
        return NextResponse.json({
          success: true,
          data: getMockAlerts(),
          source: 'mock',
        });
      }
      
      return NextResponse.json({
        success: true,
        data: getMockCurrentWeather(cityInfo.name, cityInfo.state),
        source: 'mock',
      });
    }
    
    // Real API calls - Try One Call API 3.0 first, then fallback to free API 2.5
    if (type === 'multi') {
      const promises = defaultCities.slice(0, 8).map(async (c) => {
        // Try One Call API first
        let data = await fetchOneCallData(c.lat, c.lon);
        if (data) {
          const parsed = parseOneCallData(data, { name: c.name, state: c.state });
          return { ...parsed.current, source: 'onecall' };
        }
        
        // Fallback to free API 2.5
        const freeData = await fetchCurrentWeatherFree(c.lat, c.lon);
        if (freeData) {
          return { ...parseFreeCurrentWeather(freeData, { name: c.name, state: c.state }), source: 'free' };
        }
        
        return { ...getMockCurrentWeather(c.name, c.state), source: 'mock' };
      });
      
      const multiCityData = await Promise.all(promises);
      return NextResponse.json({
        success: true,
        data: multiCityData,
        source: multiCityData[0]?.source || 'api',
      });
    }

    // Full One Call data (current + minutely + hourly + daily + alerts)
    if (type === 'onecall' || type === 'full') {
      // Try One Call API first
      const data = await fetchOneCallData(targetLat, targetLon);
      if (data) {
        const parsed = parseOneCallData(data, cityInfo);
        return NextResponse.json({
          success: true,
          data: parsed,
          source: 'onecall',
        });
      }
      
      // Fallback to free API 2.5
      const currentData = await fetchCurrentWeatherFree(targetLat, targetLon);
      const forecastData = await fetchForecastFree(targetLat, targetLon);
      
      if (currentData && forecastData) {
        return NextResponse.json({
          success: true,
          data: {
            current: parseFreeCurrentWeather(currentData, cityInfo),
            hourly: parseFreeForecastToHourly(forecastData),
            daily: parseFreeForecastToDaily(forecastData),
            alerts: [], // Free API doesn't include alerts
          },
          source: 'free',
        });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          current: getMockCurrentWeather(cityInfo.name, cityInfo.state),
          hourly: getMockHourlyForecast(),
          daily: getMockDailyForecast(),
          alerts: getMockAlerts(),
        },
        source: 'mock',
        warning: 'OPENWEATHER_API_KEY not configured. Showing mock data.',
      });
    }

    // Hourly forecast only
    if (type === 'hourly') {
      // Try One Call API first
      const data = await fetchOneCallData(targetLat, targetLon);
      if (data) {
        const parsed = parseOneCallData(data, cityInfo);
        return NextResponse.json({
          success: true,
          data: parsed.hourly,
          source: 'onecall',
        });
      }
      
      // Fallback to free forecast API
      const forecastData = await fetchForecastFree(targetLat, targetLon);
      if (forecastData) {
        return NextResponse.json({
          success: true,
          data: parseFreeForecastToHourly(forecastData),
          source: 'free',
        });
      }
      
      return NextResponse.json({
        success: true,
        data: getMockHourlyForecast(),
        source: 'mock',
      });
    }

    // Daily/8-day forecast
    if (type === 'daily' || type === 'forecast') {
      // Try One Call API first
      const data = await fetchOneCallData(targetLat, targetLon);
      if (data) {
        const parsed = parseOneCallData(data, cityInfo);
        return NextResponse.json({
          success: true,
          data: parsed.daily,
          source: 'onecall',
        });
      }
      
      // Fallback to free forecast API
      const forecastData = await fetchForecastFree(targetLat, targetLon);
      if (forecastData) {
        return NextResponse.json({
          success: true,
          data: parseFreeForecastToDaily(forecastData),
          source: 'free',
        });
      }
      
      return NextResponse.json({
        success: true,
        data: getMockDailyForecast(),
        source: 'mock',
      });
    }
    
    // Weather alerts
    if (type === 'alerts') {
      const data = await fetchOneCallData(targetLat, targetLon);
      if (data) {
        const parsed = parseOneCallData(data, cityInfo);
        return NextResponse.json({
          success: true,
          data: parsed.alerts,
          source: 'onecall',
        });
      }
      // Free API doesn't have alerts
      return NextResponse.json({
        success: true,
        data: [],
        source: 'free',
        message: 'Alerts require One Call API 3.0 subscription',
      });
    }
    
    // Single city current weather (default)
    // Try One Call API first
    const oneCallData = await fetchOneCallData(targetLat, targetLon);
    if (oneCallData) {
      const parsed = parseOneCallData(oneCallData, cityInfo);
      return NextResponse.json({
        success: true,
        data: parsed.current,
        source: 'onecall',
      });
    }
    
    // Fallback to free current weather API
    const freeCurrentData = await fetchCurrentWeatherFree(targetLat, targetLon);
    if (freeCurrentData) {
      return NextResponse.json({
        success: true,
        data: parseFreeCurrentWeather(freeCurrentData, cityInfo),
        source: 'free',
      });
    }
    
    return NextResponse.json({
      success: true,
      data: getMockCurrentWeather(cityInfo.name, cityInfo.state),
      source: 'mock',
      warning: 'OPENWEATHER_API_KEY not configured. Showing mock data.',
    });
    
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
