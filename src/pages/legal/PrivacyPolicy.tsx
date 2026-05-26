import React from "react";
import LegalPage from "./LegalPage";

const SECTIONS = [
  {
    heading: "1. Information We Collect",
    body: (
      <>
        <p style={{ margin: "0 0 8px" }}><strong>Account information.</strong> When you register, we collect your email address and a hashed password. If you sign in via a third-party provider (e.g. Apple, Google), we receive only the email address and identifier provided by that service.</p>
        <p style={{ margin: "0 0 8px" }}><strong>Location data.</strong> We collect the city or GPS coordinates you provide so we can fetch weather forecasts. Location is stored on our servers only if you save it as a named location in Settings. We never share precise coordinates with third parties; only the resolved city name is retained.</p>
        <p style={{ margin: "0 0 8px" }}><strong>Preference &amp; calibration data.</strong> We store your temperature thresholds, thermal sensitivity, rain tolerance, outfit formality, style preference, wardrobe selections, commute times, and outfit feedback. This data is used solely to personalise your experience.</p>
        <p style={{ margin: 0 }}><strong>Usage data.</strong> We collect anonymous, aggregated usage signals (e.g. which tabs are visited) to improve the app. We do not sell or share individual usage data.</p>
      </>
    ),
  },
  {
    heading: "2. How We Use Your Information",
    body: (
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
        <li>To provide and personalise weather-based outfit recommendations.</li>
        <li>To generate packing lists based on forecast data for your travel destinations.</li>
        <li>To send transactional emails (account verification, password reset).</li>
        <li>To send push notifications for trip reminders and packing list updates, if you grant permission.</li>
        <li>To diagnose bugs and improve app reliability.</li>
        <li>To process subscription payments via RevenueCat and the relevant app store.</li>
      </ul>
    ),
  },
  {
    heading: "3. Third-Party Services",
    body: (
      <>
        <p style={{ margin: "0 0 8px" }}>Layer Weather uses the following third-party services, each with its own privacy policy:</p>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <li><strong>Supabase</strong> — Authentication and database hosting. Your account and preference data is stored in a Supabase-managed PostgreSQL database.</li>
          <li><strong>Apple WeatherKit</strong> — Primary weather forecast provider. Location coordinates are transmitted to Apple to retrieve forecasts.</li>
          <li><strong>Open-Meteo</strong> — Extended 16-day forecast provider used for trips beyond 10 days.</li>
          <li><strong>RainViewer</strong> — Radar imagery provider. Your map position is transmitted to retrieve radar tiles.</li>
          <li><strong>RevenueCat</strong> — Subscription management. Payment data is processed by your app store (Apple App Store or Google Play); we receive only subscription status via RevenueCat.</li>
          <li><strong>Anthropic (Claude API)</strong> — AI-powered packing advice. Only destination name, travel dates, and weather summary are transmitted; no personal account data is included.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "4. Data Retention",
    body: (
      <p style={{ margin: 0 }}>We retain your account and preference data for as long as your account is active. If you delete your account from Settings → Delete Account, all personal data (email, preferences, wardrobe, saved locations, calibration data) is permanently deleted within 30 days. Anonymous, aggregated analytics data may be retained indefinitely.</p>
    ),
  },
  {
    heading: "5. Data Security",
    body: (
      <p style={{ margin: 0 }}>All data is transmitted over HTTPS/TLS. Passwords are never stored in plaintext. We use Supabase row-level security to ensure each user can only access their own data. We regularly review our security practices, but no system is 100% secure — please use a strong, unique password for your account.</p>
    ),
  },
  {
    heading: "6. Children's Privacy",
    body: (
      <p style={{ margin: 0 }}>Layer Weather is not directed to children under 13 (or under 16 in the EU). We do not knowingly collect personal data from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.</p>
    ),
  },
  {
    heading: "7. Your Rights",
    body: (
      <>
        <p style={{ margin: "0 0 8px" }}>Depending on your jurisdiction, you may have the right to access, correct, export, or delete your personal data. You can:</p>
        <ul style={{ margin: "0 0 8px", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
          <li>Update your preferences at any time in the Settings tab.</li>
          <li>Delete your account and all associated data from Settings → Delete Account.</li>
          <li>Request a copy of your data or ask questions by emailing us at the address below.</li>
        </ul>
        <p style={{ margin: 0 }}>EU/EEA residents may have additional rights under the GDPR, including the right to lodge a complaint with a supervisory authority.</p>
      </>
    ),
  },
  {
    heading: "8. Changes to This Policy",
    body: (
      <p style={{ margin: 0 }}>We may update this Privacy Policy from time to time. We will notify you of material changes by displaying a notice in the app or sending an email. The "Effective" date at the top of this page reflects the latest revision. Continued use of the app after changes take effect constitutes acceptance.</p>
    ),
  },
  {
    heading: "9. Contact Us",
    body: (
      <p style={{ margin: 0 }}>If you have questions about this Privacy Policy or your personal data, please contact us at <strong>privacy@layerweather.com</strong>.</p>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="May 26, 2025"
      intro="Layer Weather ('we', 'our', or 'us') is committed to protecting your privacy. This Privacy Policy explains what personal data we collect, how we use it, and your rights regarding it. By using the app you agree to this policy."
      sections={SECTIONS}
    />
  );
}
