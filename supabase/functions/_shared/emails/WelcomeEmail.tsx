import { Button, Section, Text } from "npm:@react-email/components@0.0.28";
import * as React from "npm:react@18";
import { LayerWeatherBase, colors } from "./components/LayerWeatherBase.tsx";

export interface WelcomeEmailProps {
  userName: string;
  appUrl: string;
}

const features = [
  {
    icon: "🗺️",
    title: "Radar Layers",
    description:
      "Visualize precipitation, wind, temperature, and pressure overlays in real time.",
  },
  {
    icon: "🔔",
    title: "Custom Alerts",
    description:
      "Get notified for severe weather, UV index spikes, or wind advisories at your locations.",
  },
  {
    icon: "📅",
    title: "Detailed Forecasts",
    description:
      "Hourly and 10-day outlooks with atmospheric data beyond basic temperature.",
  },
];

export default function WelcomeEmail({ userName, appUrl }: WelcomeEmailProps) {
  return (
    <LayerWeatherBase preview={`Welcome to Layer Weather, ${userName}!`}>
      {/* Hero */}
      <Section style={styles.hero}>
        <Text style={styles.headline}>Welcome aboard, {userName}.</Text>
        <Text style={styles.subtext}>
          Your account is ready. Layer Weather gives you a cleaner, smarter view
          of the atmosphere — from radar imagery to daily digests tailored to
          your locations.
        </Text>
      </Section>

      {/* Features */}
      <Section style={styles.featuresSection}>
        <Text style={styles.sectionLabel}>WHAT'S WAITING FOR YOU</Text>
        {features.map((f) => (
          <Section key={f.title} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Section style={styles.featureContent}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.description}</Text>
            </Section>
          </Section>
        ))}
      </Section>

      {/* CTA */}
      <Section style={styles.ctaSection}>
        <Text style={styles.ctaText}>
          Start by setting your home location so we can tailor your forecast.
        </Text>
        <Button href={`${appUrl}/onboarding`} style={styles.button}>
          Set Your Home Location →
        </Button>
      </Section>
    </LayerWeatherBase>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    padding: "40px 32px 24px",
  },
  headline: {
    color: colors.textPrimary,
    fontSize: "26px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    lineHeight: "32px",
    margin: "0 0 12px",
  },
  subtext: {
    color: colors.textMuted,
    fontSize: "15px",
    lineHeight: "24px",
    margin: 0,
  },
  featuresSection: {
    padding: "4px 32px 24px",
  },
  sectionLabel: {
    color: colors.accent,
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    margin: "0 0 20px",
  },
  featureRow: {
    display: "flex",
    marginBottom: "16px",
  },
  featureIcon: {
    fontSize: "22px",
    margin: "0 14px 0 0",
    lineHeight: "1",
  },
  featureContent: {
    flex: "1",
  },
  featureTitle: {
    color: colors.textPrimary,
    fontSize: "14px",
    fontWeight: "600",
    margin: "0 0 2px",
  },
  featureDesc: {
    color: colors.textMuted,
    fontSize: "13px",
    lineHeight: "20px",
    margin: 0,
  },
  ctaSection: {
    backgroundColor: colors.bg,
    borderTop: `1px solid ${colors.border}`,
    padding: "28px 32px",
    textAlign: "center",
  },
  ctaText: {
    color: colors.textMuted,
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 20px",
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
