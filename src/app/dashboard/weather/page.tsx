import WeatherClient from './WeatherClient';

// Use any type for API response since we'll pass it directly to client
// The client component will handle the proper typing
async function fetchMultiCityWeather(): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/weather?type=multi`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch multi-city weather');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching multi-city weather:', error);
    return [];
  }
}

async function fetchAlerts(): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/weather?type=alerts`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch weather alerts');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      return [];
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching weather alerts:', error);
    return [];
  }
}

export default async function WeatherPage() {
  const [multiCityWeather, alerts] = await Promise.all([
    fetchMultiCityWeather(),
    fetchAlerts(),
  ]);
  
  return (
    <WeatherClient
      initialMultiCityWeather={multiCityWeather}
      initialAlerts={alerts}
    />
  );
}
