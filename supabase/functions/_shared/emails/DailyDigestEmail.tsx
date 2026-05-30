import { Button, Column, Row, Section, Text } from "npm:@react-email/components@0.0.28";
import * as React from "npm:react@18";
import { LayerWeatherBase, colors } from "./components/LayerWeatherBase.tsx";

export type TempUnit = "C" | "F";
export type AlertSeverity = "advisory" | "watch" | "warning" | "extreme";

export interface ForecastPeriod {
  label: "Morning" | "Afternoon" | "Evening";
  icon: string;
  condition: string;
  high: number;
  low: number;
  precipChance: number;
}

export interface WeatherAlert {
  severity: AlertSeverity;
  headline: string;
  message: string;
}

export interface DailyDigestEmailProps {
  userName: string;
  location: string;
  currentTemp: number;
  feelsLike: number;
  unit: "F" | "C";
  condition: string;
  conditionIcon: string;
  humidity: number;
  windSpeed: number;
  windUnit: string;
  uvIndex: number;
  aqi?: number;
  pollenLevel?: "Low" | "Moderate" | "High" | "Very High";
  outfitSummary?: string;
  forecast: ForecastPeriod[];
  alerts?: WeatherAlert[];
  appUrl: string;
  unsubscribeUrl: string;
}

function uvColor(uvIndex: number): string {
  if (uvIndex <= 2) return "#22c55e";
  if (uvIndex <= 5) return "#eab308";
  if (uvIndex <= 7) return "#f97316";
  if (uvIndex <= 10) return "#ef4444";
  return "#a855f7";
}

function alertStyles(severity: AlertSeverity): {
  section: React.CSSProperties;
  badge: React.CSSProperties;
  headline: React.CSSProperties;
  message: React.CSSProperties;
} {
  const isExtreme = severity === "extreme" || severity === "warning";
  const borderColor = isExtreme ? "#7f1d1d" : "#78350f";
  const bgColor = isExtreme ? "#1a0a0a" : "#1a1208";
  const badgeBg = isExtreme ? colors.alertRed : colors.alertAmber;
  const headlineColor = isExtreme ? colors.alertRed : colors.alertAmber;
  const messageColor = isExtreme ? "#f87171" : "#fcd34d";

  return {
    section: {
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: "8px",
      margin: "0 32px 12px",
      padding: "16px 20px",
    },
    badge: {
      backgroundColor: badgeBg,
      borderRadius: "4px",
      color: "#ffffff",
      display: "inline-block",
      fontSize: "9px",
      fontWeight: "700",
      letterSpacing: "1px",
      marginBottom: "8px",
      padding: "3px 8px",
    },
    headline: {
      color: headlineColor,
      fontSize: "13px",
      fontWeight: "600",
      margin: "0 0 4px",
    },
    message: {
      color: messageColor,
      fontSize: "13px",
      lineHeight: "20px",
      margin: 0,
    },
  };
}

export default function DailyDigestEmail({
  userName,
  location,
  currentTemp,
  feelsLike,
  unit,
  condition,
  conditionIcon,
  humidity,
  windSpeed,
  windUnit,
  uvIndex,
  aqi,
  pollenLevel,
  outfitSummary,
  forecast,
  alerts = [],
  appUrl,
  unsubscribeUrl,
}: DailyDigestEmailProps) {
  const hasAlerts = alerts.length > 0;
  const showPollen = pollenLevel === "High" || pollenLevel === "Very High";
  const uvBadgeColor = uvColor(uvIndex);

  return (
    <LayerWeatherBase
      preview={`${location} · ${currentTemp}°${unit} ${conditionIcon} — Your daily weather digest`}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Hero */}
      <Section style={styles.hero}>
        <Text style={styles.conditionIcon}>{conditionIcon}</Text>
        <Text style={styles.currentTemp}>
          {currentTemp}°{unit}
        </Text>
        <Text style={styles.condition}>{condition}</Text>
        <Text style={styles.feelsLike}>
          Feels like {feelsLike}°{unit}
        </Text>
        <Text style={styles.locationBadge}>📍 {location}</Text>
        <Text style={styles.greeting}>Good morning, {userName}.</Text>
      </Section>

      {/* At a Glance strip */}
      <Section style={styles.glanceSection}>
        <Text style={styles.sectionLabel}>AT A GLANCE</Text>
        <Row style={styles.glanceRow}>
          <Column style={styles.glanceCol}>
            <Text style={styles.glancePillLabel}>HUMIDITY</Text>
            <Text style={styles.glancePillValue}>{humidity}%</Text>
          </Column>
          <Column style={styles.glanceCol}>
            <Text style={styles.glancePillLabel}>WIND</Text>
            <Text style={styles.glancePillValue}>
              {windSpeed} {windUnit}
            </Text>
          </Column>
          <Column style={styles.glanceCol}>
            <Text style={styles.glancePillLabel}>UV INDEX</Text>
            <Text style={{ ...styles.glancePillValue, color: uvBadgeColor }}>
              {uvIndex}
            </Text>
          </Column>
          {aqi !== undefined && (
            <Column style={styles.glanceCol}>
              <Text style={styles.glancePillLabel}>AQI</Text>
              <Text style={styles.glancePillValue}>{aqi}</Text>
            </Column>
          )}
        </Row>
      </Section>

      {/* Outfit of the Day */}
      {outfitSummary && (
        <Section style={styles.outfitSection}>
          <Text style={styles.outfitHeading}>👔 OUTFIT OF THE DAY</Text>
          <Text style={styles.outfitText}>{outfitSummary}</Text>
        </Section>
      )}

      {/* Pollen Alert */}
      {showPollen && (
        <Section style={styles.pollenSection}>
          <Text style={styles.pollenText}>
            🌿 Pollen Alert — {pollenLevel} levels today. Consider allergy precautions.
          </Text>
        </Section>
      )}

      {/* Active Alerts */}
      {hasAlerts && (
        <>
          <Section style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>⚡ ACTIVE ALERTS</Text>
          </Section>
          {alerts.map((alert, i) => {
            const s = alertStyles(alert.severity);
            return (
              <Section key={i} style={s.section}>
                <Text style={s.badge}>{alert.severity.toUpperCase()}</Text>
                <Text style={s.headline}>{alert.headline}</Text>
                <Text style={s.message}>{alert.message}</Text>
              </Section>
            );
          })}
        </>
      )}

      {/* Today's Forecast */}
      <Section style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>📅 TODAY'S FORECAST</Text>
      </Section>
      <Section style={styles.forecastSection}>
        <Row>
          {forecast.map((period) => (
            <Column key={period.label} style={styles.forecastCol}>
              <Text style={styles.periodLabel}>{period.label}</Text>
              <Text style={styles.periodIcon}>{period.icon}</Text>
              <Text style={styles.periodCondition}>{period.condition}</Text>
              <Text style={styles.tempHigh}>
                {period.high}°{unit}
              </Text>
              <Text style={styles.tempLow}>
                {period.low}°{unit}
              </Text>
              <Text style={styles.precip}>💧 {period.precipChance}%</Text>
            </Column>
          ))}
        </Row>
      </Section>

      {/* CTA */}
      <Section style={styles.ctaSection}>
        <Button href={`${appUrl}/app/forecast`} style={styles.button}>
          View Full Forecast →
        </Button>
      </Section>
    </LayerWeatherBase>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    padding: "40px 32px 28px",
    borderBottom: `1px solid ${colors.border}`,
    textAlign: "center",
  },
  conditionIcon: {
    fontSize: "48px",
    lineHeight: "1",
    margin: "0 0 8px",
  },
  currentTemp: {
    color: colors.textPrimary,
    fontSize: "64px",
    fontWeight: "700",
    letterSpacing: "-2px",
    lineHeight: "1",
    margin: "0 0 8px",
  },
  condition: {
    color: colors.textPrimary,
    fontSize: "18px",
    fontWeight: "500",
    margin: "0 0 6px",
  },
  feelsLike: {
    color: colors.textMuted,
    fontSize: "14px",
    margin: "0 0 12px",
  },
  locationBadge: {
    backgroundColor: colors.bg,
    borderRadius: "20px",
    color: colors.textMuted,
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "500",
    margin: "0 0 16px",
    padding: "4px 12px",
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: "16px",
    fontWeight: "600",
    margin: 0,
  },
  glanceSection: {
    borderBottom: `1px solid ${colors.border}`,
    padding: "20px 32px",
  },
  glanceRow: {
    marginTop: "10px",
  },
  glanceCol: {
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    padding: "10px 8px",
    textAlign: "center",
    verticalAlign: "top",
  },
  glancePillLabel: {
    color: colors.textMuted,
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "1px",
    margin: "0 0 4px",
  },
  glancePillValue: {
    color: colors.textPrimary,
    fontSize: "15px",
    fontWeight: "700",
    margin: 0,
  },
  outfitSection: {
    backgroundColor: "#111827",
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    margin: "16px 32px 0",
    padding: "14px 18px",
  },
  outfitHeading: {
    color: colors.textMuted,
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "1px",
    margin: "0 0 6px",
  },
  outfitText: {
    color: colors.textPrimary,
    fontSize: "14px",
    fontWeight: "500",
    margin: 0,
  },
  pollenSection: {
    backgroundColor: "#1c1400",
    border: `1px solid #78350f`,
    borderRadius: "8px",
    margin: "12px 32px 0",
    padding: "10px 16px",
  },
  pollenText: {
    color: colors.alertAmber,
    fontSize: "13px",
    fontWeight: "500",
    margin: 0,
  },
  sectionHeader: {
    padding: "24px 32px 4px",
  },
  sectionLabel: {
    color: colors.accent,
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    margin: 0,
  },
  forecastSection: {
    padding: "12px 32px 4px",
  },
  forecastCol: {
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    padding: "14px 10px",
    textAlign: "center",
    verticalAlign: "top",
  },
  periodLabel: {
    color: colors.textMuted,
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.8px",
    margin: "0 0 6px",
    textTransform: "uppercase",
  },
  periodIcon: {
    fontSize: "22px",
    lineHeight: "1",
    margin: "0 0 6px",
  },
  periodCondition: {
    color: colors.textPrimary,
    fontSize: "12px",
    fontWeight: "500",
    margin: "0 0 6px",
  },
  tempHigh: {
    color: colors.textPrimary,
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 2px",
  },
  tempLow: {
    color: colors.textMuted,
    fontSize: "13px",
    margin: "0 0 4px",
  },
  precip: {
    color: colors.textMuted,
    fontSize: "11px",
    margin: 0,
  },
  ctaSection: {
    padding: "24px 32px 32px",
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 28px",
    textDecoration: "none",
  },
};
