import {
  Button,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { colors, LayerWeatherBase } from "./components/LayerWeatherBase";

export interface TrialEndingEmailProps {
  userName: string;
  daysRemaining: 1 | 2 | 3;
  trialEndDate: string;
  appUrl: string;
  unsubscribeUrl: string;
}

const premiumFeatures = [
  {
    icon: "🗺️",
    title: "Advanced Radar Layers",
    description: "Wind, pressure, humidity, and precipitation overlays in real time.",
  },
  {
    icon: "🔔",
    title: "Severe Weather Alerts",
    description: "Push notifications for warnings, watches, and advisories at your locations.",
  },
  {
    icon: "📅",
    title: "Extended 10-Day Forecasts",
    description: "Detailed hourly breakdowns with atmospheric data beyond the basics.",
  },
  {
    icon: "📍",
    title: "Unlimited Saved Locations",
    description: "Monitor weather for every place that matters to you.",
  },
];

export default function TrialEndingEmail({
  userName,
  daysRemaining,
  trialEndDate,
  appUrl,
  unsubscribeUrl,
}: TrialEndingEmailProps) {
  const urgencyColor =
    daysRemaining === 1
      ? colors.alertRed
      : daysRemaining === 2
      ? colors.alertAmber
      : "#f59e0b";

  const urgencyBg =
    daysRemaining === 1 ? "#1a0808" : daysRemaining === 2 ? "#1a1000" : "#14110a";

  const urgencyBorder =
    daysRemaining === 1 ? "#7f1d1d" : daysRemaining === 2 ? "#78350f" : "#5c3d00";

  const dayWord = daysRemaining === 1 ? "day" : "days";

  return (
    <LayerWeatherBase
      preview={`Your Layer Weather trial ends in ${daysRemaining} ${dayWord} — keep your premium access`}
    >
      {/* Urgency Banner */}
      <Section
        style={{
          backgroundColor: urgencyBg,
          borderBottom: `2px solid ${urgencyBorder}`,
          padding: "32px 32px 28px",
          textAlign: "center",
        }}
      >
        {/* Big countdown number */}
        <Text
          style={{
            color: urgencyColor,
            fontSize: "72px",
            fontWeight: "800",
            letterSpacing: "-3px",
            lineHeight: "1",
            margin: "0 0 6px",
          }}
        >
          {daysRemaining}
        </Text>
        <Text
          style={{
            color: urgencyColor,
            fontSize: "13px",
            fontWeight: "700",
            letterSpacing: "2px",
            margin: "0 0 16px",
            textTransform: "uppercase",
          }}
        >
          {dayWord} remaining
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: "20px",
            fontWeight: "700",
            letterSpacing: "-0.3px",
            lineHeight: "28px",
            margin: "0 0 8px",
          }}
        >
          Your free trial ends {trialEndDate}.
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "14px",
            lineHeight: "22px",
            margin: 0,
          }}
        >
          Hi {userName} — upgrade now to keep everything you've been using.
        </Text>
      </Section>

      {/* Features they'll lose */}
      <Section style={{ padding: "28px 32px 0" }}>
        <Text
          style={{
            color: colors.accent,
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            margin: "0 0 18px",
          }}
        >
          WHAT YOU'LL LOSE ACCESS TO
        </Text>
        {premiumFeatures.map((feature) => (
          <Section
            key={feature.title}
            style={{
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              marginBottom: "8px",
              padding: "14px 18px",
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: "14px",
                fontWeight: "600",
                margin: "0 0 3px",
              }}
            >
              {feature.icon} {feature.title}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: "13px",
                lineHeight: "20px",
                margin: 0,
              }}
            >
              {feature.description}
            </Text>
          </Section>
        ))}
      </Section>

      {/* CTAs */}
      <Section style={{ padding: "28px 32px 8px", textAlign: "center" }}>
        <Button
          href={`${appUrl}/upgrade`}
          style={{
            backgroundColor: colors.accent,
            borderRadius: "8px",
            color: "#ffffff",
            display: "inline-block",
            fontSize: "15px",
            fontWeight: "700",
            padding: "14px 32px",
            textDecoration: "none",
          }}
        >
          Keep My Premium →
        </Button>
      </Section>

      <Section style={{ padding: "12px 32px 28px", textAlign: "center" }}>
        <Text style={{ color: colors.textMuted, fontSize: "13px", margin: 0 }}>
          <Link
            href={`${appUrl}/pricing`}
            style={{ color: colors.accent, textDecoration: "underline" }}
          >
            See all plans and pricing
          </Link>
        </Text>
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
          You're receiving this because your Layer Weather trial is ending soon.
        </Text>
      </Section>
    </LayerWeatherBase>
  );
}
