import { NextRequest, NextResponse } from 'next/server';

const OPENWEATHER_BASE = 'https://api.openweathermap.org/data';
const GEO_BASE = 'https://api.openweathermap.org/geo/1.0';

/** Default cities for type=multi when no coordinates */
const DEFAULT_CITIES = [
  { city: 'New York', state: 'NY', lat: 40.7128, lon: -74.006 },
  { city: 'London', state: 'England', lat: 51.5074, lon: -0.1278 },
  { city: 'Tokyo', state: 'Japan', lat: 35.6762, lon: 139.6503 },
  { city: 'Sydney', state: 'NSW', lat: -33.8688, lon: 151.2093 },
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lon: 72.8777 },
];

export async function GET(request: NextRequest) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    return NextResponse.json(
      { success: false, error: 'OPENWEATHER_API_KEY not configured' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'multi';
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const city = searchParams.get('city') || '';
  const state = searchParams.get('state') || '';
  const search = searchParams.get('search');

  try {
    if (type === 'search' && search) {
      const res = await fetch(
        `${GEO_BASE}/direct?q=${encodeURIComponent(search)}&limit=5&appid=${key}`
      );
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: data?.message || 'Geocoding failed' },
          { status: res.status }
        );
      }
      const cities = Array.isArray(data) ? data.map((c: any) => ({
        name: c.name,
        city: c.name,
        state: c.state,
        lat: c.lat,
        lon: c.lon,
        country: c.country,
      })) : [];
      return NextResponse.json({
        success: true,
        data: { cities, states: [] },
      });
    }

    if (type === 'onecall' && lat && lon) {
      const oneCallUrl = `${OPENWEATHER_BASE}/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
      const res = await fetch(oneCallUrl);
      const data = await res.json();
      if (!res.ok) {
        const fallback = await fetch(
          `${OPENWEATHER_BASE}/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`
        );
        const cur = await fallback.json();
        if (!fallback.ok) {
          return NextResponse.json(
            { success: false, error: data?.message || cur?.message || 'Weather fetch failed' },
            { status: 502 }
          );
        }
        return NextResponse.json({
          success: true,
          data: {
            current: {
              temperature: cur.main?.temp,
              temp: cur.main?.temp,
              description: cur.weather?.[0]?.description,
              icon: cur.weather?.[0]?.icon,
              humidity: cur.main?.humidity,
              windSpeed: cur.wind?.speed,
              pressure: cur.main?.pressure,
              visibility: cur.visibility,
              feelsLike: cur.main?.feels_like,
              windDirection: cur.wind?.deg,
            },
            hourly: [],
            daily: [],
            alerts: [],
          },
        });
      }
      return NextResponse.json({
        success: true,
        data: {
          current: data.current,
          hourly: data.hourly || [],
          daily: data.daily || [],
          alerts: data.alerts || [],
        },
      });
    }

    if (type === 'alerts') {
      const first = DEFAULT_CITIES[0];
      const res = await fetch(
        `${OPENWEATHER_BASE}/3.0/onecall?lat=${first.lat}&lon=${first.lon}&appid=${key}`
      );
      const data = await res.json();
      return NextResponse.json({
        success: true,
        data: data.alerts || [],
      });
    }

    if (type === 'multi' || !type) {
      const results: any[] = [];
      for (const c of DEFAULT_CITIES) {
        const res = await fetch(
          `${OPENWEATHER_BASE}/2.5/weather?lat=${c.lat}&lon=${c.lon}&units=metric&appid=${key}`
        );
        const d = await res.json();
        if (res.ok) {
          results.push({
            city: c.city,
            state: c.state,
            lat: c.lat,
            lon: c.lon,
            temperature: d.main?.temp,
            description: d.weather?.[0]?.description,
            icon: d.weather?.[0]?.icon,
            humidity: d.main?.humidity,
            windSpeed: d.wind?.speed,
          });
        }
      }
      return NextResponse.json({ success: true, data: results });
    }

    if (lat && lon) {
      const res = await fetch(
        `${OPENWEATHER_BASE}/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`
      );
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: data?.message || 'Weather fetch failed' },
          { status: 502 }
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          current: {
            temperature: data.main?.temp,
            description: data.weather?.[0]?.description,
            icon: data.weather?.[0]?.icon,
            humidity: data.main?.humidity,
            windSpeed: data.wind?.speed,
            pressure: data.main?.pressure,
          },
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Missing lat/lon or type' },
      { status: 400 }
    );
  } catch (err) {
    console.error('[api/weather] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Weather service error' },
      { status: 500 }
    );
  }
}
