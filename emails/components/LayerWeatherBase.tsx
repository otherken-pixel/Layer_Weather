import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export const colors = {
  bg: "#0f1117",
  surface: "#1a1d27",
  border: "#2a2d3a",
  accent: "#3b82f6",
  alertAmber: "#f59e0b",
  alertRed: "#ef4444",
  textPrimary: "#f1f5f9",
  textMuted: "#64748b",
};

interface LayerWeatherBaseProps {
  preview: string;
  children: React.ReactNode;
}

export function LayerWeatherBase({ preview, children }: LayerWeatherBaseProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Text style={styles.logoText}>⛅ Layer Weather</Text>
          </Section>

          {/* Content */}
          {children}

          {/* Footer */}
          <Hr style={styles.divider} />
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Layer Weather · Real-time atmospheric data, beautifully layered.
            </Text>
            <Text style={styles.footerLinks}>
              <Link href="#" style={styles.footerLink}>
                Privacy Policy
              </Link>{" "}
              ·{" "}
              <Link href="#" style={styles.footerLink}>
                Terms of Service
              </Link>{" "}
              ·{" "}
              <Link href="#" style={styles.footerLink}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={styles.footerMeta}>
              You're receiving this email because you have an account with Layer
              Weather.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: colors.bg,
    fontFamily: "system-ui, -apple-system, sans-serif",
    margin: 0,
    padding: "32px 0",
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: "12px",
    border: `1px solid ${colors.border}`,
    maxWidth: "560px",
    margin: "0 auto",
    overflow: "hidden",
  },
  header: {
    backgroundColor: colors.bg,
    padding: "20px 32px",
    borderBottom: `1px solid ${colors.border}`,
  },
  logoText: {
    color: colors.textPrimary,
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "-0.3px",
    margin: 0,
  },
  divider: {
    borderColor: colors.border,
    margin: "0 32px",
  },
  footer: {
    padding: "24px 32px 28px",
  },
  footerText: {
    color: colors.textMuted,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0 0 8px",
  },
  footerLinks: {
    color: colors.textMuted,
    fontSize: "12px",
    margin: "0 0 8px",
  },
  footerLink: {
    color: colors.textMuted,
    textDecoration: "underline",
  },
  footerMeta: {
    color: colors.textMuted,
    fontSize: "11px",
    lineHeight: "16px",
    margin: 0,
  },
};
