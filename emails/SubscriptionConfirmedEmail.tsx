import {
  Button,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { colors, LayerWeatherBase } from "./components/LayerWeatherBase";

export interface SubscriptionConfirmedEmailProps {
  userName: string;
  planName: string;
  nextBillingDate: string;
  appUrl: string;
}

const green = "#22c55e";
const greenBg = "#0d1f14";
const greenBorder = "#14532d";

const premiumFeatures = [
  {
    icon: "🗺️",
    title: "Advanced Radar Layers",
    description: "Wind, pressure, humidity, and precipitation overlays in real time.",
  },
  {
    icon: "🔔",
    title: "Severe Weather Alerts",
    description: "Instant push notifications for warnings, watches, and advisories.",
  },
  {
    icon: "📅",
    title: "Extended 10-Day Forecasts",
    description: "Hour-by-hour atmospheric breakdowns far beyond the basics.",
  },
  {
    icon: "📍",
    title: "Unlimited Saved Locations",
    description: "Monitor weather for every place that matters to you.",
  },
];

export default function SubscriptionConfirmedEmail({
  userName,
  planName,
  nextBillingDate,
  appUrl,
}: SubscriptionConfirmedEmailProps) {
  return (
    <LayerWeatherBase
      preview={`You're all set, ${userName} — welcome to Layer Weather Premium`}
    >
      {/* Confirmation hero */}
      <Section
        style={{
          backgroundColor: greenBg,
          borderBottom: `2px solid ${greenBorder}`,
          padding: "36px 32px 30px",
          textAlign: "center",
        }}
      >
        {/* Green check badge */}
        <Text
          style={{
            backgroundColor: green,
            borderRadius: "50%",
            color: "#ffffff",
            display: "inline-block",
            fontSize: "24px",
            fontWeight: "700",
            height: "52px",
            lineHeight: "52px",
            margin: "0 auto 20px",
            textAlign: "center",
            width: "52px",
          }}
        >
          ✓
        </Text>
        <Text
          style={{
            color: green,
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "2px",
            margin: "0 0 10px",
            textTransform: "uppercase",
          }}
        >
          Subscription Confirmed
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: "24px",
            fontWeight: "700",
            letterSpacing: "-0.4px",
            lineHeight: "32px",
            margin: "0 0 8px",
          }}
        >
          Welcome to Premium, {userName}.
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "14px",
            lineHeight: "22px",
            margin: 0,
          }}
        >
          You now have full access to every Layer Weather feature.
        </Text>
      </Section>

      {/* Plan details */}
      <Section style={{ padding: "24px 32px 0" }}>
        <Section
          style={{
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            padding: "18px 20px",
          }}
        >
          <Text
            style={{
              color: colors.textMuted,
              fontSize: "10px",
              fontWeight: "700",
              letterSpacing: "1.2px",
              margin: "0 0 6px",
            }}
          >
            YOUR PLAN
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: "16px",
              fontWeight: "700",
              letterSpacing: "-0.2px",
              margin: "0 0 12px",
            }}
          >
            {planName}
          </Text>
          <Hr style={{ borderColor: colors.border, margin: "0 0 12px" }} />
          <Text
            style={{
              color: colors.textMuted,
              fontSize: "10px",
              fontWeight: "700",
              letterSpacing: "1.2px",
              margin: "0 0 4px",
            }}
          >
            NEXT BILLING DATE
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: "14px",
              fontWeight: "600",
              margin: 0,
            }}
          >
            {nextBillingDate}
          </Text>
        </Section>
      </Section>

      {/* Features unlocked */}
      <Section style={{ padding: "24px 32px 0" }}>
        <Text
          style={{
            color: colors.accent,
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            margin: "0 0 16px",
          }}
        >
          NOW UNLOCKED
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

      {/* CTA */}
      <Section style={{ padding: "28px 32px 32px", textAlign: "center" }}>
        <Button
          href={`${appUrl}/app`}
          style={{
            backgroundColor: green,
            borderRadius: "8px",
            color: "#ffffff",
            display: "inline-block",
            fontSize: "15px",
            fontWeight: "700",
            padding: "13px 32px",
            textDecoration: "none",
          }}
        >
          Open Layer Weather →
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
            margin: "0 0 6px",
          }}
        >
          Layer Weather · Real-time atmospheric data, beautifully layered.
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "11px",
            lineHeight: "16px",
            margin: 0,
          }}
        >
          Questions about your subscription? Reply to this email or visit {appUrl}/support.
        </Text>
      </Section>
    </LayerWeatherBase>
  );
}
