import { Button, Column, Hr, Row, Section, Text } from "@react-email/components";
import * as React from "react";
import { colors, LayerWeatherBase } from "./components/LayerWeatherBase";

export interface WeeklyRecapEmailProps {
  userName: string;
  location: string;
  weekSummary: string;
  avgHighTemp: number;
  avgLowTemp: number;
  unit: "F" | "C";
  rainiestDay: string;
  hottestDay: string;
  hottestTemp: number;
  coldestDay: string;
  coldestTemp: number;
  nextWeekOutlook: string;
  appUrl: string;
  unsubscribeUrl: string;
}

export default function WeeklyRecapEmail({
  userName,
  location,
  weekSummary,
  avgHighTemp,
  avgLowTemp,
  unit,
  rainiestDay,
  hottestDay,
  hottestTemp,
  coldestDay,
  coldestTemp,
  nextWeekOutlook,
  appUrl,
  unsubscribeUrl,
}: WeeklyRecapEmailProps) {
  const deg = `°${unit}`;

  return (
    <LayerWeatherBase
      preview={`Your week in weather — ${location}`}
      appUrl={appUrl}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Hero */}
      <Section
        style={{
          backgroundColor: colors.bg,
          borderBottom: `1px solid ${colors.border}`,
          padding: "36px 32px 30px",
        }}
      >
        <Text
          style={{
            color: colors.accent,
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "2px",
            margin: "0 0 12px",
          }}
        >
          WEEKLY RECAP
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: "30px",
            fontWeight: "700",
            letterSpacing: "-0.7px",
            lineHeight: "36px",
            margin: "0 0 10px",
          }}
        >
          Your week in weather.
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "14px",
            margin: 0,
          }}
        >
          📍 {location}
        </Text>
      </Section>

      {/* Week summary prose */}
      <Section style={{ padding: "28px 32px 0" }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: "15px",
            margin: "0 0 6px",
          }}
        >
          Hi {userName},
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "14px",
            lineHeight: "23px",
            margin: 0,
          }}
        >
          {weekSummary}
        </Text>
      </Section>

      {/* Stat grid — row 1 */}
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
          THIS WEEK AT A GLANCE
        </Text>
        <Row style={{ marginBottom: "10px" }}>
          <Column style={{ paddingRight: "5px", width: "50%" }}>
            <Section
              style={{
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                padding: "16px 18px",
              }}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: "9px",
                  fontWeight: "700",
                  letterSpacing: "1.2px",
                  margin: "0 0 8px",
                }}
              >
                AVG HIGH
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: "28px",
                  fontWeight: "700",
                  letterSpacing: "-0.5px",
                  lineHeight: "1",
                  margin: "0 0 4px",
                }}
              >
                {avgHighTemp}{deg}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: "11px",
                  margin: 0,
                }}
              >
                Average daytime high
              </Text>
            </Section>
          </Column>
          <Column style={{ paddingLeft: "5px", width: "50%" }}>
            <Section
              style={{
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                padding: "16px 18px",
              }}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: "9px",
                  fontWeight: "700",
                  letterSpacing: "1.2px",
                  margin: "0 0 8px",
                }}
              >
                AVG LOW
              </Text>
              <Text
                style={{
                  color: "#93c5fd",
                  fontSize: "28px",
                  fontWeight: "700",
                  letterSpacing: "-0.5px",
                  lineHeight: "1",
                  margin: "0 0 4px",
                }}
              >
                {avgLowTemp}{deg}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: "11px",
                  margin: 0,
                }}
              >
                Average overnight low
              </Text>
            </Section>
          </Column>
        </Row>

        {/* Stat grid — row 2 */}
        <Row style={{ marginBottom: "0" }}>
          <Column style={{ paddingRight: "5px", width: "50%" }}>
            <Section
              style={{
                backgroundColor: colors.bg,
                border: `1px solid #1e3a5f`,
                borderRadius: "8px",
                padding: "16px 18px",
              }}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: "9px",
                  fontWeight: "700",
                  letterSpacing: "1.2px",
                  margin: "0 0 8px",
                }}
              >
                RAINIEST DAY
              </Text>
              <Text
                style={{
                  color: "#60a5fa",
                  fontSize: "22px",
                  fontWeight: "700",
                  letterSpacing: "-0.3px",
                  lineHeight: "1",
                  margin: "0 0 4px",
                }}
              >
                {rainiestDay}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: "11px",
                  margin: 0,
                }}
              >
                Most precipitation
              </Text>
            </Section>
          </Column>
          <Column style={{ paddingLeft: "5px", width: "50%" }}>
            <Section
              style={{
                backgroundColor: colors.bg,
                border: `1px solid #3d2a0a`,
                borderRadius: "8px",
                padding: "16px 18px",
              }}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: "9px",
                  fontWeight: "700",
                  letterSpacing: "1.2px",
                  margin: "0 0 8px",
                }}
              >
                HOTTEST DAY
              </Text>
              <Text
                style={{
                  color: colors.alertAmber,
                  fontSize: "22px",
                  fontWeight: "700",
                  letterSpacing: "-0.3px",
                  lineHeight: "1",
                  margin: "0 0 4px",
                }}
              >
                {hottestDay}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: "11px",
                  margin: 0,
                }}
              >
                Peak: {hottestTemp}{deg}
              </Text>
            </Section>
          </Column>
        </Row>
      </Section>

      {/* Coldest day footnote */}
      <Section style={{ padding: "12px 32px 0" }}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: "12px",
            margin: 0,
          }}
        >
          Coldest day: {coldestDay} at {coldestTemp}{deg}.
        </Text>
      </Section>

      <Hr style={{ borderColor: colors.border, margin: "24px 32px" }} />

      {/* Week summary prose */}
      <Section style={{ padding: "0 32px 0" }}>
        <Text
          style={{
            color: colors.accent,
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            margin: "0 0 12px",
          }}
        >
          NEXT WEEK OUTLOOK
        </Text>
        <Section
          style={{
            backgroundColor: "#13171f",
            border: `1px solid ${colors.border}`,
            borderLeft: `3px solid ${colors.accent}`,
            borderRadius: "8px",
            padding: "16px 20px",
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: "14px",
              lineHeight: "23px",
              margin: 0,
            }}
          >
            {nextWeekOutlook}
          </Text>
        </Section>
      </Section>

      {/* CTA */}
      <Section style={{ padding: "28px 32px 32px", textAlign: "center" }}>
        <Button
          href={`${appUrl}/app/forecast`}
          style={{
            backgroundColor: colors.accent,
            borderRadius: "8px",
            color: "#ffffff",
            display: "inline-block",
            fontSize: "14px",
            fontWeight: "700",
            padding: "13px 30px",
            textDecoration: "none",
          }}
        >
          View Full Forecast →
        </Button>
      </Section>
    </LayerWeatherBase>
  );
}
