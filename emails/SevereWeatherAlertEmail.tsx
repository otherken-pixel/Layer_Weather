import {
  Button,
  Column,
  Hr,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { colors, LayerWeatherBase } from "./components/LayerWeatherBase";

export type AlertSeverity = "advisory" | "watch" | "warning" | "extreme";

export interface SevereWeatherAlertEmailProps {
  userName: string;
  location: string;
  alertSeverity: AlertSeverity;
  alertHeadline: string;
  alertDescription: string;
  startTime: string;
  endTime: string;
  appUrl: string;
  unsubscribeUrl: string;
}

const severityConfig: Record<
  AlertSeverity,
  {
    label: string;
    icon: string;
    bannerBg: string;
    bannerBorder: string;
    badgeBg: string;
    headlineColor: string;
    contentBg: string;
    contentBorder: string;
    descColor: string;
    buttonBg: string;
  }
> = {
  advisory: {
    label: "ADVISORY",
    icon: "ℹ️",
    bannerBg: "#1a1800",
    bannerBorder: "#713f12",
    badgeBg: "#ca8a04",
    headlineColor: "#fde68a",
    contentBg: "#141200",
    contentBorder: "#5c3a00",
    descColor: "#fcd34d",
    buttonBg: "#ca8a04",
  },
  watch: {
    label: "WATCH",
    icon: "👁",
    bannerBg: "#2a1a00",
    bannerBorder: "#92400e",
    badgeBg: colors.alertAmber,
    headlineColor: "#fcd34d",
    contentBg: "#1a1000",
    contentBorder: "#78350f",
    descColor: "#fbbf24",
    buttonBg: colors.alertAmber,
  },
  warning: {
    label: "WARNING",
    icon: "⚠️",
    bannerBg: "#2a0e0e",
    bannerBorder: "#991b1b",
    badgeBg: colors.alertRed,
    headlineColor: "#fca5a5",
    contentBg: "#1a0a0a",
    contentBorder: "#7f1d1d",
    descColor: "#f87171",
    buttonBg: colors.alertRed,
  },
  extreme: {
    label: "EXTREME",
    icon: "🚨",
    bannerBg: "#2d0a0a",
    bannerBorder: "#b91c1c",
    badgeBg: "#dc2626",
    headlineColor: "#fca5a5",
    contentBg: "#1a0808",
    contentBorder: "#7f1d1d",
    descColor: "#f87171",
    buttonBg: "#dc2626",
  },
};

export default function SevereWeatherAlertEmail({
  userName,
  location,
  alertSeverity,
  alertHeadline,
  alertDescription,
  startTime,
  endTime,
  appUrl,
  unsubscribeUrl,
}: SevereWeatherAlertEmailProps) {
  const cfg = severityConfig[alertSeverity];

  return (
    <LayerWeatherBase
      preview={`${cfg.label}: ${alertHeadline} — ${location}`}
    >
      {/* Full-width alert banner */}
      <Section
        style={{
          backgroundColor: cfg.bannerBg,
          borderBottom: `3px solid ${cfg.bannerBorder}`,
          padding: "32px 32px 28px",
        }}
      >
        {/* Severity badge */}
        <Text
          style={{
            backgroundColor: cfg.badgeBg,
            borderRadius: "5px",
            color: "#ffffff",
            display: "inline-block",
            fontSize: "11px",
            fontWeight: "800",
            letterSpacing: "1.8px",
            margin: "0 0 18px",
            padding: "5px 12px",
          }}
        >
          {cfg.icon} {cfg.label}
        </Text>

        {/* Headline */}
        <Text
          style={{
            color: cfg.headlineColor,
            fontSize: "24px",
            fontWeight: "700",
            letterSpacing: "-0.5px",
            lineHeight: "32px",
            margin: "0 0 10px",
          }}
        >
          {alertHeadline}
        </Text>

        {/* Location */}
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "13px",
            fontWeight: "500",
            letterSpacing: "0.3px",
            margin: 0,
          }}
        >
          📍 {location}
        </Text>
      </Section>

      {/* Alert window — time range */}
      <Section
        style={{
          backgroundColor: cfg.contentBg,
          borderBottom: `1px solid ${cfg.contentBorder}`,
          padding: "22px 32px",
        }}
      >
        <Text
          style={{
            color: colors.accent,
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            margin: "0 0 16px",
          }}
        >
          ALERT WINDOW
        </Text>
        <Row>
          <Column style={{ width: "50%" }}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: "10px",
                fontWeight: "700",
                letterSpacing: "0.8px",
                margin: "0 0 5px",
                textTransform: "uppercase",
              }}
            >
              Begins
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: "15px",
                fontWeight: "600",
                margin: 0,
              }}
            >
              {startTime}
            </Text>
          </Column>
          <Column style={{ width: "50%" }}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: "10px",
                fontWeight: "700",
                letterSpacing: "0.8px",
                margin: "0 0 5px",
                textTransform: "uppercase",
              }}
            >
              Expires
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: "15px",
                fontWeight: "600",
                margin: 0,
              }}
            >
              {endTime}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Alert details */}
      <Section
        style={{
          backgroundColor: cfg.contentBg,
          borderBottom: `1px solid ${cfg.contentBorder}`,
          padding: "22px 32px 28px",
        }}
      >
        <Text
          style={{
            color: colors.accent,
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            margin: "0 0 12px",
          }}
        >
          DETAILS
        </Text>
        <Text
          style={{
            color: cfg.descColor,
            fontSize: "14px",
            lineHeight: "23px",
            margin: 0,
          }}
        >
          {alertDescription}
        </Text>
      </Section>

      {/* Personal note + CTA */}
      <Section style={{ padding: "28px 32px 32px", textAlign: "center" }}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "14px",
            lineHeight: "22px",
            margin: "0 0 22px",
          }}
        >
          Stay safe, {userName}. Open the app for live radar and real-time updates for {location}.
        </Text>
        <Button
          href={`${appUrl}/app/alerts`}
          style={{
            backgroundColor: cfg.buttonBg,
            borderRadius: "8px",
            color: "#ffffff",
            display: "inline-block",
            fontSize: "14px",
            fontWeight: "700",
            padding: "13px 30px",
            textDecoration: "none",
          }}
        >
          View Live Radar →
        </Button>
      </Section>

      {/* Footer */}
      <Hr style={{ borderColor: colors.border, margin: "0 32px" }} />
      <Section style={{ padding: "20px 32px 28px" }}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "12px",
            lineHeight: "18px",
            margin: "0 0 8px",
          }}
        >
          Layer Weather · Real-time atmospheric data, beautifully layered.
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "12px",
            margin: "0 0 6px",
          }}
        >
          <Link href="#" style={{ color: colors.textMuted, textDecoration: "underline" }}>
            Privacy Policy
          </Link>
          {" · "}
          <Link href="#" style={{ color: colors.textMuted, textDecoration: "underline" }}>
            Terms of Service
          </Link>
          {" · "}
          <Link href={unsubscribeUrl} style={{ color: colors.textMuted, textDecoration: "underline" }}>
            Unsubscribe
          </Link>
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "11px",
            lineHeight: "16px",
            margin: 0,
          }}
        >
          You received this alert because you have severe weather notifications enabled for {location}.
        </Text>
      </Section>
    </LayerWeatherBase>
  );
}
