import { Button, Link, Section, Text } from "npm:@react-email/components@0.0.28";
import * as React from "npm:react@18";
import { LayerWeatherBase, colors } from "./components/LayerWeatherBase.tsx";

export interface MagicLinkEmailProps {
  magicLinkUrl: string;
  expiresInMinutes: number;
  appUrl?: string;
}

export default function MagicLinkEmail({
  magicLinkUrl,
  expiresInMinutes,
  appUrl = "https://layerweather.com",
}: MagicLinkEmailProps) {
  return (
    <LayerWeatherBase preview="Your Layer Weather sign-in link" appUrl={appUrl}>
      {/* Hero */}
      <Section style={styles.hero}>
        <Text style={styles.eyebrow}>SIGN IN REQUEST</Text>
        <Text style={styles.headline}>Your login link is ready.</Text>
        <Text style={styles.subtext}>
          Click the button below to sign in to Layer Weather. No password
          needed.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={styles.ctaSection}>
        <Button href={magicLinkUrl} style={styles.button}>
          Log in to Layer Weather
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
        <Link href={magicLinkUrl} style={styles.fallbackUrl}>
          {magicLinkUrl}
        </Link>
      </Section>

      {/* Security note */}
      <Section style={styles.securitySection}>
        <Text style={styles.securityText}>
          🔒 If you did not request this link, you can safely ignore this email.
          Your account will not be affected. Never share this link with anyone.
        </Text>
      </Section>
    </LayerWeatherBase>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    padding: "40px 32px 28px",
  },
  eyebrow: {
    color: colors.accent,
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    margin: "0 0 12px",
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
  securitySection: {
    backgroundColor: "#12151f",
    borderRadius: "0 0 12px 12px",
    borderTop: `1px solid ${colors.border}`,
    padding: "20px 32px",
  },
  securityText: {
    color: colors.textMuted,
    fontSize: "12px",
    lineHeight: "20px",
    margin: 0,
  },
};
