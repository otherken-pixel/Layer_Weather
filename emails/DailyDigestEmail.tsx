import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { LayerWeatherBase, colors } from "./components/LayerWeatherBase";

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
  unit: TempUnit;
  forecast: ForecastPeriod[];
  alerts?: WeatherAlert[];
  appUrl: string;
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
  unit,
  forecast,
  alerts = [],
  appUrl,
}: DailyDigestEmailProps) {
  const hasAlerts = alerts.length > 0;

  return (
    <LayerWeatherBase
      preview={`${location} · ${currentTemp}°${unit} — Your daily weather digest`}
    >
      {/* Current conditions */}
      <Section style={styles.hero}>
        <Text style={styles.location}>📍 {location}</Text>
        <Text style={styles.currentTemp}>
          {currentTemp}°{unit}
        </Text>
        <Text style={styles.greeting}>Good morning, {userName}.</Text>
        <Text style={styles.subtext}>
          Here's your atmospheric summary for today.
        </Text>
      </Section>

      {/* Active alerts (conditional) */}
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

      {/* Forecast periods */}
      <Section style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>📅 TODAY'S FORECAST</Text>
      </Section>
      <Section style={styles.forecastGrid}>
        {forecast.map((period) => (
          <Section key={period.label} style={styles.forecastCard}>
            <Text style={styles.periodLabel}>{period.label}</Text>
            <Text style={styles.periodIcon}>{period.icon}</Text>
            <Text style={styles.periodCondition}>{period.condition}</Text>
            <Text style={styles.periodTemps}>
              <span style={styles.tempHigh}>
                {period.high}°{unit}
              </span>{" "}
              <span style={styles.tempLow}>
                {period.low}°{unit}
              </span>
            </Text>
            <Text style={styles.precip}>💧 {period.precipChance}%</Text>
          </Section>
        ))}
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
  },
  location: {
    color: colors.textMuted,
    fontSize: "13px",
    fontWeight: "500",
    letterSpacing: "0.3px",
    margin: "0 0 8px",
  },
  currentTemp: {
    color: colors.textPrimary,
    fontSize: "56px",
    fontWeight: "700",
    letterSpacing: "-2px",
    lineHeight: "1",
    margin: "0 0 16px",
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 4px",
  },
  subtext: {
    color: colors.textMuted,
    fontSize: "14px",
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
  forecastGrid: {
    padding: "12px 32px 4px",
  },
  forecastCard: {
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    marginBottom: "8px",
    padding: "16px 20px",
  },
  periodLabel: {
    color: colors.textMuted,
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.8px",
    margin: "0 0 6px",
    textTransform: "uppercase",
  },
  periodIcon: {
    fontSize: "24px",
    lineHeight: "1",
    margin: "0 0 6px",
  },
  periodCondition: {
    color: colors.textPrimary,
    fontSize: "14px",
    fontWeight: "500",
    margin: "0 0 6px",
  },
  periodTemps: {
    margin: "0 0 4px",
  },
  tempHigh: {
    color: colors.textPrimary,
    fontSize: "14px",
    fontWeight: "700",
  },
  tempLow: {
    color: colors.textMuted,
    fontSize: "14px",
  },
  precip: {
    color: colors.textMuted,
    fontSize: "12px",
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
