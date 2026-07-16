// Skyline Tower is a San Francisco property (+1 415 area code on resident records).
const LATITUDE = 37.7749
const LONGITUDE = -122.4194
const TIMEZONE = 'America/Los_Angeles'

const CONDITION_LABELS: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  56: 'Freezing Drizzle',
  57: 'Freezing Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  66: 'Freezing Rain',
  67: 'Freezing Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Heavy Rain Showers',
  85: 'Snow Showers',
  86: 'Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
}

export interface WeatherSnapshot {
  tempF: number
  condition: string
  sunset: Date
}

export async function getWeather(): Promise<WeatherSnapshot> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,weather_code&daily=sunset&temperature_unit=fahrenheit&timezone=${encodeURIComponent(TIMEZONE)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather request failed')
  const data = await res.json()
  return {
    tempF: Math.round(data.current.temperature_2m),
    condition: CONDITION_LABELS[data.current.weather_code] ?? 'Unknown',
    sunset: new Date(data.daily.sunset[0]),
  }
}
