import React from "react";
import LegalPage from "./LegalPage";

const SECTIONS = [
  {
    heading: "1. Acceptance of Terms",
    body: (
      <p style={{ margin: 0 }}>By creating an account or using the Layer Weather application ('Service'), you agree to be bound by these Terms of Service ('Terms'). If you do not agree, do not use the Service. We may update these Terms periodically; continued use after changes are posted constitutes acceptance of the updated Terms.</p>
    ),
  },
  {
    heading: "2. Description of Service",
    body: (
      <p style={{ margin: 0 }}>Layer Weather is a weather-based outfit and packing recommendation app. The Service uses your location, personal comfort preferences, and third-party weather data to suggest what to wear each day and what to pack for upcoming trips. Weather data, forecasts, and outfit suggestions are provided for informational purposes only and are not guaranteed to be accurate or suitable for your specific needs.</p>
    ),
  },
  {
    heading: "3. Account Registration",
    body: (
      <>
        <p style={{ margin: "0 0 8px" }}>You must create an account to use the Service. You agree to:</p>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Provide accurate, current, and complete registration information.</li>
          <li>Maintain the security of your account credentials and promptly notify us of any unauthorised access.</li>
          <li>Take responsibility for all activity that occurs under your account.</li>
          <li>Not create accounts for others without their explicit consent.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "4. Subscriptions and Payments",
    body: (
      <>
        <p style={{ margin: "0 0 8px" }}>Layer Weather offers free and paid subscription tiers. Paid features are billed through the Apple App Store or Google Play Store on the subscription schedule you selected at purchase. The following terms apply:</p>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <li><strong>Auto-renewal.</strong> Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.</li>
          <li><strong>Cancellation.</strong> You may cancel at any time through your device's App Store subscription settings. Cancellation takes effect at the end of the paid period; no partial refunds are issued for unused time.</li>
          <li><strong>Price changes.</strong> We may change subscription pricing with reasonable notice. Continued use after the effective date constitutes acceptance of the new price.</li>
          <li><strong>Refunds.</strong> Refund requests are handled by Apple or Google under their respective refund policies.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "5. Acceptable Use",
    body: (
      <>
        <p style={{ margin: "0 0 8px" }}>You agree not to:</p>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
          <li>Attempt to reverse-engineer, decompile, or disassemble the app or its components.</li>
          <li>Scrape, crawl, or systematically extract data from the Service.</li>
          <li>Interfere with or disrupt the integrity or performance of the Service.</li>
          <li>Upload or transmit viruses, malware, or other harmful code.</li>
          <li>Use automated means to create accounts or access the Service.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "6. Intellectual Property",
    body: (
      <p style={{ margin: 0 }}>All content, features, and functionality of the Service — including but not limited to the app design, clothing illustrations, source code, algorithms, and text — are the exclusive property of Layer Weather and are protected by copyright, trademark, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable licence to use the Service for personal, non-commercial purposes. No rights are transferred to you beyond this licence.</p>
    ),
  },
  {
    heading: "7. Disclaimer of Warranties",
    body: (
      <p style={{ margin: 0 }}>THE SERVICE IS PROVIDED 'AS IS' AND 'AS AVAILABLE' WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY OF WEATHER DATA, OR NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.</p>
    ),
  },
  {
    heading: "8. Limitation of Liability",
    body: (
      <p style={{ margin: 0 }}>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, LAYER WEATHER AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
    ),
  },
  {
    heading: "9. Termination",
    body: (
      <p style={{ margin: 0 }}>We may suspend or terminate your account at any time for violations of these Terms, fraudulent activity, or other conduct we deem harmful to the Service or other users. You may delete your account at any time from Settings → Delete Account. Upon termination, your licence to use the Service ends immediately. Provisions that by their nature should survive termination (including intellectual property, disclaimer of warranties, and limitation of liability) shall survive.</p>
    ),
  },
  {
    heading: "10. Governing Law",
    body: (
      <p style={{ margin: 0 }}>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved exclusively in the state or federal courts located in Delaware.</p>
    ),
  },
  {
    heading: "11. Contact Us",
    body: (
      <p style={{ margin: 0 }}>For questions about these Terms, contact us at <strong>legal@layerweather.com</strong>.</p>
    ),
  },
];

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      effectiveDate="May 26, 2025"
      intro="Please read these Terms of Service carefully before using Layer Weather. These Terms form a legally binding agreement between you and Layer Weather."
      sections={SECTIONS}
    />
  );
}
