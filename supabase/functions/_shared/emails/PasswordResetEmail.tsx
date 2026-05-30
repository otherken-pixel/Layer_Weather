import { Button, Link, Section, Text } from "npm:@react-email/components@0.0.28";
import * as React from "npm:react@18";
import { LayerWeatherBase, colors } from "./components/LayerWeatherBase.tsx";

export interface PasswordResetEmailProps {
  resetUrl: string;
  expiresInMinutes: number;
}

export default function PasswordResetEmail({
  resetUrl,
  expiresInMinutes,
}: PasswordResetEmailProps) {
  return (
    <LayerWeatherBase preview="Reset your Layer Weather password">
      {/* Hero */}
      <Section style={styles.hero}>
        <Text style={styles.icon}>🔑</Text>
        <Text style={styles.headline}>Password reset requested.</Text>
        <Text style={styles.subtext}>
          We received a request to reset the password for your Layer Weather
          account. Click the button below to choose a new one.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={styles.ctaSection}>
        <Button href={resetUrl} style={styles.button}>
          Reset Password
        </Button>
        <Text style={styles.expiry}>
          This link expires in {expiresInMinutes} minutes.
        </Text>
      </Section>

      {/* Fallback URL */}
      <Section style={styles.fallbackSection}>
        <Text style={styles.fallbackLabel}>
          Button not working? Copy and paste this URL into your browser:
        </Text>
        <Link href={resetUrl} style={styles.fallbackUrl}>
          {resetUrl}
        </Link>
      </Section>

      {/* Security warning */}
      <Section style={styles.warningSection}>
        <Text style={styles.warningTitle}>⚠️ Didn't request this?</Text>
        <Text style={styles.warningText}>
          If you didn't ask to reset your password, ignore this email — your
          password will not be changed. If you think your account has been
          compromised, contact our support team immediately.
        </Text>
      </Section>
    </LayerWeatherBase>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    padding: "40px 32px 28px",
  },
  icon: {
    fontSize: "32px",
    lineHeight: "1",
    margin: "0 0 16px",
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
  ctaSection: {
    backgroundColor: colors.bg,
    borderTop: `1px solid ${colors.border}`,
    borderBottom: `1px solid ${colors.border}`,
    padding: "32px",
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: "600",
    padding: "14px 32px",
    textDecoration: "none",
  },
  expiry: {
    color: colors.textMuted,
    fontSize: "12px",
    margin: "16px 0 0",
  },
  fallbackSection: {
    padding: "24px 32px",
  },
  fallbackLabel: {
    color: colors.textMuted,
    fontSize: "12px",
    margin: "0 0 8px",
  },
  fallbackUrl: {
    color: colors.accent,
    fontSize: "12px",
    wordBreak: "break-all",
  },
  warningSection: {
    backgroundColor: "#1a1510",
    border: `1px solid #3d2f0a`,
    borderRadius: "8px",
    margin: "0 32px 32px",
    padding: "16px 20px",
  },
  warningTitle: {
    color: colors.alertAmber,
    fontSize: "13px",
    fontWeight: "600",
    margin: "0 0 6px",
  },
  warningText: {
    color: "#a08040",
    fontSize: "13px",
    lineHeight: "20px",
    margin: 0,
  },
};
