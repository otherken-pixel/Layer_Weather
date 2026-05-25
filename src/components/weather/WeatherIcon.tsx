import React from "react";
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle,
  CloudRain, CloudRainWind, CloudSnow, CloudLightning,
  type LucideProps,
} from "lucide-react";
import { useAccentColor } from "@/hooks/useAccentColor";

type LucideIcon = React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;

const ICON_MAP: Record<string, LucideIcon> = {
  clear: Sun,
  partly_cloudy: CloudSun,
  cloudy: Cloud,
  foggy: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  heavy_rain: CloudRainWind,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
};

const SIZE_PX: Record<"sm" | "md" | "lg", number> = {
  sm: 20,
  md: 26,
  lg: 28,
};

interface WeatherIconProps {
  condition: string;
  size?: "sm" | "md" | "lg";
  /** Override the icon color. Pass "white" when the icon sits on an accent-colored background. */
  color?: string;
}

export function WeatherIcon({ condition, size = "md", color }: WeatherIconProps) {
  const { accent } = useAccentColor();
  const IconComponent = ICON_MAP[condition] ?? CloudSun;
  return (
    <IconComponent
      size={SIZE_PX[size]}
      color={color ?? accent}
      strokeWidth={2.5}
    />
  );
}
