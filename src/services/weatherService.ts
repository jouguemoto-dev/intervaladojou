/**
 * Weather Service using Open-Meteo API
 * Open-Meteo is a free, open-source weather API requiring NO API KEY.
 * Provides current temperature, weather code, humidity, windspeed, and weather condition label.
 */

export interface WeatherInfo {
  temperatureC: number;
  apparentTemperatureC?: number;
  humidityPct?: number;
  windSpeedKmh?: number;
  weatherCode: number;
  description: string;
  conditionIcon: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' | 'wind' | 'fog';
  cityName?: string;
  fetchedAt: number;
}

/**
 * Maps WMO Weather interpretation codes to friendly Portuguese labels & icon keys
 */
export function interpretWmoCode(code: number): { description: string; icon: WeatherInfo['conditionIcon'] } {
  if (code === 0) return { description: 'Céu limpo', icon: 'sun' };
  if (code === 1) return { description: 'Principalmente ensolarado', icon: 'sun' };
  if (code === 2) return { description: 'Parcialmente nublado', icon: 'cloud' };
  if (code === 3) return { description: 'Nublado', icon: 'cloud' };
  if (code === 45 || code === 48) return { description: 'Neblina', icon: 'fog' };
  if (code >= 51 && code <= 55) return { description: 'Garoa leve', icon: 'rain' };
  if (code >= 61 && code <= 65) return { description: 'Chuva', icon: 'rain' };
  if (code >= 71 && code <= 77) return { description: 'Neve', icon: 'snow' };
  if (code >= 80 && code <= 82) return { description: 'Pancadas de chuva', icon: 'rain' };
  if (code >= 95 && code <= 99) return { description: 'Tempestade com raios', icon: 'storm' };
  return { description: 'Condição amena', icon: 'cloud' };
}

// In-memory cache to prevent excessive network requests when GPS moves
let cachedWeather: WeatherInfo | null = null;
let lastCoordKey = '';

export async function fetchCurrentWeather(lat: number, lng: number): Promise<WeatherInfo | null> {
  const coordKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const now = Date.now();

  // 10-minute cache per coordinate cell
  if (cachedWeather && lastCoordKey === coordKey && now - cachedWeather.fetchedAt < 10 * 60 * 1000) {
    return cachedWeather;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return cachedWeather;

    const data = await res.json();
    const current = data.current;
    if (!current) return cachedWeather;

    const wmo = interpretWmoCode(current.weather_code ?? 0);
    const info: WeatherInfo = {
      temperatureC: Math.round(current.temperature_2m),
      apparentTemperatureC: current.apparent_temperature != null ? Math.round(current.apparent_temperature) : undefined,
      humidityPct: current.relative_humidity_2m,
      windSpeedKmh: current.wind_speed_10m != null ? Math.round(current.wind_speed_10m) : undefined,
      weatherCode: current.weather_code,
      description: wmo.description,
      conditionIcon: wmo.icon,
      fetchedAt: now,
    };

    cachedWeather = info;
    lastCoordKey = coordKey;
    return info;
  } catch (e) {
    // If offline or blocked, return cached or graceful null
    return cachedWeather;
  }
}
