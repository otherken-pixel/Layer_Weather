import { Button, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { colors, LayerWeatherBase } from "./components/LayerWeatherBase";

export interface SubscriptionExpiredEmailProps {
  userName: string;
  expiredDate: string;
  appUrl: string;
}

const missedFeatures = [
  { icon: "🗺️", label: "Advanced radar layers" },
  { icon: "🔔", label: "Severe weather alerts" },
  { icon: "📅", label: "Extended 10-day forecasts" },
  { icon: "📍", label: "Unlimited saved locations" },
];

export default function SubscriptionExpiredEmail({
  userName,
  expiredDate,
  appUrl,
}: SubscriptionExpiredEmailProps) {
  return (
    <LayerWeatherBase
      preview={`Your Layer Weather Premium access ended — come back anytime`}
      appUrl={appUrl}
    >
      {/* Hero */}
      <Section
        style={{
          borderBottom: `1px solid ${colors.border}`,
          padding: "36px 32px 28px",
        }}
      >
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "2px",
            margin: "0 0 12px",
            textTransform: "uppercase",
          }}
        >
          Subscription Ended
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: "24px",
            fontWeight: "700",
            letterSpacing: "-0.4px",
            lineHeight: "32px",
            margin: "0 0 10px",
          }}
        >
          We'll miss you, {userName}.
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "14px",
            lineHeight: "22px",
            margin: 0,
          }}
        >
          Your Premium access expired on {expiredDate}. Your account is still
          active — you've just been moved to the free tier.
        </Text>
      </Section>

      {/* What they're missing */}
      <Section style={{ padding: "24px 32px 0" }}>
        <Text
          style={{
            color: colors.accent,
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            margin: "0 0 14px",
          }}
        >
          WHAT YOU'RE NOW MISSING
        </Text>
        <Section
          style={{
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            padding: "18px 20px",
          }}
        >
          {missedFeatures.map((f, i) => (
            <Text
              key={f.label}
              style={{
                color: colors.textPrimary,
                fontSize: "14px",
                fontWeight: "500",
                lineHeight: "20px",
                margin: i < missedFeatures.length - 1 ? "0 0 10px" : "0",
              }}
            >
              {f.icon} {f.label}
            </Text>
          ))}
        </Section>
      </Section>

      {/* Resubscribe CTA */}
      <Section style={{ padding: "28px 32px 8px", textAlign: "center" }}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "14px",
            lineHeight: "22px",
            margin: "0 0 20px",
          }}
        >
          Resubscribe anytime — your saved locations and settings are still here.
        </Text>
        <Button
          href={`${appUrl}/upgrade`}
          style={{
            backgroundColor: colors.accent,
            borderRadius: "8px",
            color: "#ffffff",
            display: "inline-block",
            fontSize: "15px",
            fontWeight: "700",
            padding: "13px 32px",
            textDecoration: "none",
          }}
        >
          Resubscribe to Premium →
        </Button>
      </Section>

      <Section style={{ padding: "12px 32px 28px", textAlign: "center" }}>
        <Text style={{ color: colors.textMuted, fontSize: "13px", margin: 0 }}>
          <Link
            href={`${appUrl}/pricing`}
            style={{ color: colors.accent, textDecoration: "underline" }}
          >
            View plans and pricing
          </Link>
        </Text>
      </Section>
    </LayerWeatherBase>
  );
}
