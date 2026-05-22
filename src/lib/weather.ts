import type {
  WeatherData,
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  WeatherCondition,
  LocationData,
} from "@/types";

// ── WMO code → app condition ──────────────────────────────────────────────────
function wmoToCondition(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code <= 2) return "partly_cloudy";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "foggy";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "heavy_rain";
  return "thunderstorm";
}

// ── Unit conversion ───────────────────────────────────────────────────────────
function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}

// ── Open-Meteo fetch ──────────────────────────────────────────────────────────
export async function fetchWeatherData(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "wind_speed_10m",
      "wind_direction_10m",
      "precipitation_probability",
      "weather_code",
      "is_day",
    ].join(","),
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "weather_code",
      "wind_speed_10m",
      "is_day",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_probability_max",
      "weather_code",
      "sunrise",
      "sunset",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: "7",
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  );
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const json = await res.json();

  return parseOpenMeteoResponse(json);
}

function parseOpenMeteoResponse(json: Record<string, unknown>): WeatherData {
  const cur = json.current as Record<string, unknown>;
  const hourly = json.hourly as Record<string, unknown[]>;
  const daily = json.daily as Record<string, unknown[]>;

  const current: CurrentWeather = {
    temp: Math.round(cur.temperature_2m as number),
    feelsLike: Math.round(cur.apparent_temperature as number),
    humidity: Math.round(cur.relative_humidity_2m as number),
    windSpeed: Math.round(cur.wind_speed_10m as number),
    windDirection: Math.round(cur.wind_direction_10m as number),
    precipProb: Math.round(cur.precipitation_probability as number),
    condition: wmoToCondition(cur.weather_code as number),
    weatherCode: cur.weather_code as number,
    isDay: (cur.is_day as number) === 1,
    location: "",
    updatedAt: new Date(),
  };

  const now = new Date();
  const currentHour = now.getHours();

  const hourlyTimes = hourly.time as string[];
  const hourlyData: HourlyForecast[] = hourlyTimes
    .map((timeStr, i) => ({
      time: new Date(timeStr),
      temp: Math.round((hourly.temperature_2m as number[])[i]),
      feelsLike: Math.round((hourly.apparent_temperature as number[])[i]),
      precipProb: Math.round(
        (hourly.precipitation_probability as number[])[i]
      ),
      condition: wmoToCondition((hourly.weather_code as number[])[i]),
      weatherCode: (hourly.weather_code as number[])[i],
      windSpeed: Math.round((hourly.wind_speed_10m as number[])[i]),
      isDay: (hourly.is_day as number[])[i] === 1,
    }))
    .filter((h) => h.time >= now)
    .slice(0, 48);

  const dailyData: DailyForecast[] = (daily.time as string[]).map(
    (timeStr, i) => ({
      date: new Date(timeStr),
      tempMin: Math.round((daily.temperature_2m_min as number[])[i]),
      tempMax: Math.round((daily.temperature_2m_max as number[])[i]),
      feelsLikeMin: Math.round(
        (daily.apparent_temperature_min as number[])[i]
      ),
      feelsLikeMax: Math.round(
        (daily.apparent_temperature_max as number[])[i]
      ),
      precipProb: Math.round(
        (daily.precipitation_probability_max as number[])[i]
      ),
      condition: wmoToCondition((daily.weather_code as number[])[i]),
      weatherCode: (daily.weather_code as number[])[i],
      sunrise: new Date((daily.sunrise as string[])[i]),
      sunset: new Date((daily.sunset as string[])[i]),
    })
  );

  return { current, hourly: hourlyData, daily: dailyData };
}

// ── Reverse-geocode with Open-Meteo geocoding ─────────────────────────────────
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return "Your Location";
    const json = await res.json();
    const addr = json.address;
    return (
      addr.city || addr.town || addr.village || addr.county || "Your Location"
    );
  } catch {
    return "Your Location";
  }
}

// ── Significant weather change detection ──────────────────────────────────────
export function detectSignificantChanges(
  hourly: HourlyForecast[],
  currentFeelsLike: number
): Array<{ hour: Date; message: string; feelsLike: number }> {
  const alerts: Array<{ hour: Date; message: string; feelsLike: number }> = [];
  const now = new Date();
  const next12h = hourly.filter((h) => {
    const diff = (h.time.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diff > 0 && diff <= 12;
  });

  for (let i = 1; i < next12h.length; i++) {
    const delta = next12h[i].feelsLike - currentFeelsLike;
    const prevCondition = next12h[i - 1].condition;
    const curCondition = next12h[i].condition;

    if (Math.abs(delta) >= 15) {
      const dir = delta < 0 ? "dropping" : "rising";
      alerts.push({
        hour: next12h[i].time,
        message: `Feels-like temp ${dir} ${Math.abs(delta)}° at ${next12h[i].time.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}`,
        feelsLike: next12h[i].feelsLike,
      });
    }

    if (
      prevCondition !== "rain" &&
      prevCondition !== "heavy_rain" &&
      (curCondition === "rain" || curCondition === "heavy_rain")
    ) {
      alerts.push({
        hour: next12h[i].time,
        message: `Rain expected around ${next12h[i].time.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })} — grab an umbrella`,
        feelsLike: next12h[i].feelsLike,
      });
    }
  }

  return alerts.slice(0, 2);
}
