import type { WeatherScenario, WeatherData } from "@/types";

export function getWeatherScenario(weather: WeatherData): WeatherScenario {
  const { feelsLike, weatherCode, precipProb } = weather.current;

  const isSnowy =
    (weatherCode >= 71 && weatherCode <= 77) ||
    weatherCode === 85 ||
    weatherCode === 86;
  const isRainy =
    precipProb > 40 ||
    (weatherCode >= 51 && weatherCode <= 82) ||
    weatherCode >= 95;

  if (isSnowy) return "snowy";
  if (isRainy) return "rainy";
  if (feelsLike >= 72) return "hot";
  if (feelsLike >= 65) return "warm";  // t-shirt / dress territory — no jacket needed
  if (feelsLike >= 60) return "mild";  // light jacket territory
  if (feelsLike >= 45) return "cool";  // heavy jacket territory
  return "cold";
}
