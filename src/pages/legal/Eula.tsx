import React from "react";
import LegalPage from "./LegalPage";

const SECTIONS = [
  {
    heading: "1. Grant of Licence",
    body: (
      <p style={{ margin: 0 }}>Subject to the terms of this End User Licence Agreement ('EULA'), Layer Weather grants you a limited, non-exclusive, non-transferable, revocable licence to download, install, and use the Layer Weather mobile application ('App') on devices you own or control, solely for your personal, non-commercial use.</p>
    ),
  },
  {
    heading: "2. Licence Restrictions",
    body: (
      <>
        <p style={{ margin: "0 0 8px" }}>You may not:</p>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Copy, modify, or create derivative works of the App or any part thereof.</li>
          <li>Reverse engineer, disassemble, decompile, or attempt to extract the source code of the App, except to the extent expressly permitted by applicable law.</li>
          <li>Sell, sublicence, rent, lease, lend, or otherwise transfer the App or this licence to any third party.</li>
          <li>Remove, alter, or obscure any proprietary notices (including copyright notices) on the App.</li>
          <li>Use the App in any manner that could damage, disable, overburden, or impair our servers or networks.</li>
          <li>Use the App to develop a competing product or service.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "3. Ownership",
    body: (
      <p style={{ margin: 0 }}>The App is licensed to you, not sold. Layer Weather retains all right, title, and interest in and to the App, including all intellectual property rights therein. This EULA does not grant you any rights to trademarks, service marks, or logos of Layer Weather. All rights not expressly granted are reserved.</p>
    ),
  },
  {
    heading: "4. Third-Party Components",
    body: (
      <p style={{ margin: 0 }}>The App includes or uses certain open-source software and third-party components, each of which is subject to its own licence terms. Your use of those components is governed by the applicable open-source or third-party licences. Nothing in this EULA limits your rights under, or grants you rights that supersede, those licences.</p>
    ),
  },
  {
    heading: "5. Updates",
    body: (
      <p style={{ margin: 0 }}>Layer Weather may from time to time provide updates, patches, or new versions of the App. Such updates may be required for continued use of the Service and may be delivered automatically. Updated versions of the App are subject to this EULA unless a new licence agreement accompanies the update, in which case the new agreement will govern.</p>
    ),
  },
  {
    heading: "6. App Store Terms",
    body: (
      <p style={{ margin: 0 }}>If you downloaded the App from the Apple App Store, your use is also subject to Apple's App Store Terms of Service. Apple is not a party to this EULA and is not responsible for the App or its content. Apple has no obligation to furnish any maintenance or support services with respect to the App. In the event of any failure of the App to conform to any applicable warranty, you may notify Apple and Apple may refund the purchase price (if any); to the maximum extent permitted by applicable law, Apple has no other warranty obligation.</p>
    ),
  },
  {
    heading: "7. Disclaimer of Warranties",
    body: (
      <p style={{ margin: 0 }}>THE APP IS PROVIDED 'AS IS' WITHOUT WARRANTY OF ANY KIND. LAYER WEATHER EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.</p>
    ),
  },
  {
    heading: "8. Limitation of Liability",
    body: (
      <p style={{ margin: 0 }}>IN NO EVENT SHALL LAYER WEATHER BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) ARISING IN ANY WAY OUT OF THE USE OF THE APP, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. LAYER WEATHER'S TOTAL LIABILITY ARISING OUT OF THIS EULA SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE APP IN THE PRECEDING 12 MONTHS.</p>
    ),
  },
  {
    heading: "9. Termination",
    body: (
      <p style={{ margin: 0 }}>This EULA is effective until terminated. Your rights under this licence will terminate automatically and without notice if you breach any term of this EULA. Upon termination, you must cease all use of the App and destroy all copies in your possession or control. Sections 3, 7, 8, and 10 shall survive termination.</p>
    ),
  },
  {
    heading: "10. Governing Law",
    body: (
      <p style={{ margin: 0 }}>This EULA is governed by the laws of the State of Delaware, United States. Any disputes arising under this EULA shall be subject to the exclusive jurisdiction of the state and federal courts located in Delaware.</p>
    ),
  },
  {
    heading: "11. Contact",
    body: (
      <p style={{ margin: 0 }}>For questions regarding this EULA, contact us at <strong>legal@layerweather.com</strong>.</p>
    ),
  },
];

export default function Eula() {
  return (
    <LegalPage
      title="EULA"
      effectiveDate="May 26, 2025"
      intro="This End User Licence Agreement ('EULA') is a legal agreement between you and Layer Weather governing your use of the Layer Weather application. By downloading, installing, or using the App you agree to be bound by this EULA."
      sections={SECTIONS}
    />
  );
}
