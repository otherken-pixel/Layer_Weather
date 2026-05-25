import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useIsDark } from "@/hooks/useDarkMode";

interface HelpItem {
  question: string;
  answer: React.ReactNode;
}

interface HelpSection {
  id: string;
  icon: string;
  title: string;
  items: HelpItem[];
}

const SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    icon: "🚀",
    title: "Getting Started",
    items: [
      {
        question: "What does WearToday do?",
        answer: (
          <>
            <p>WearToday recommends what to wear based on your local weather and your personal comfort preferences. Every morning it checks the forecast for your location, factors in your commute times, and suggests a complete outfit — from what to layer to whether you need an umbrella.</p>
            <p style={{ marginTop: 8 }}>The more you use it and give feedback, the better your recommendations become.</p>
          </>
        ),
      },
      {
        question: "How does first-time onboarding work?",
        answer: (
          <>
            <p>When you first sign in, WearToday walks you through a short setup:</p>
            <ol style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Swipe calibration</strong> — Swipe right on outfits you'd wear, left on ones that feel too hot or cold. This sets your initial temperature thresholds.</li>
              <li><strong>Thermal sensitivity</strong> — Slide to tell the app whether you run hot, cold, or right in the middle.</li>
              <li><strong>Rain tolerance</strong> — Choose how much rain it takes before you'd change your plans or outfit.</li>
              <li><strong>Location</strong> — Enter a city or allow GPS access so the app knows where to pull weather from.</li>
            </ol>
            <p style={{ marginTop: 8 }}>You can always redo this from Settings → Recalibrate.</p>
          </>
        ),
      },
      {
        question: "How does calibration improve over time?",
        answer: (
          <p>Each time you rate an outfit on the Today tab (too hot, too cold, or just right), the app adjusts your temperature thresholds. Over time it learns your exact comfort zone so recommendations get more accurate. The calibration data is shown in Settings under Temperature Profile.</p>
        ),
      },
    ],
  },
  {
    id: "today",
    icon: "☀️",
    title: "Today Tab",
    items: [
      {
        question: "How do I read the Today screen?",
        answer: (
          <>
            <p>The Today screen has three main areas:</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Sky header</strong> — Animated sky that reflects current conditions (clear, cloudy, rainy, snowy).</li>
              <li><strong>Outfit recommendation</strong> — The main card showing what to wear. Tap the outfit illustration to toggle between visual (SVG illustration) and text list views.</li>
              <li><strong>Weather widgets</strong> — Scroll down for the 7-day forecast, air quality index, nowcast (next-hour rain intensity), and any active weather alerts.</li>
            </ul>
          </>
        ),
      },
      {
        question: "How do I give outfit feedback?",
        answer: (
          <>
            <p>On the outfit card you'll see feedback buttons — typically thumbs up/down or temperature indicators. Tap the one that matches how you actually felt in the suggested outfit.</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Too hot</strong> — Lowers your temperature thresholds so future suggestions are lighter.</li>
              <li><strong>Too cold</strong> — Raises thresholds so suggestions are warmer.</li>
              <li><strong>Just right</strong> — Confirms the current calibration.</li>
            </ul>
            <p style={{ marginTop: 8 }}>Changes take effect on the next recommendation.</p>
          </>
        ),
      },
      {
        question: "How do I switch locations?",
        answer: (
          <>
            <p>Tap the location pill at the top of the Today screen to open the location picker. From there you can:</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>Switch to any of your saved locations (up to 5).</li>
              <li>Use your current GPS position.</li>
              <li>Search for a new city.</li>
            </ul>
            <p style={{ marginTop: 8 }}>Save frequently used locations in Settings → Saved Locations so they appear here quickly.</p>
          </>
        ),
      },
      {
        question: "What is the 7-day forecast card?",
        answer: (
          <p>Scroll down on the Today tab to see a 7-day outlook. Each day shows the high/low temperature and a weather icon. This helps you plan your wardrobe for the week ahead — for example, knowing a cold front arrives Thursday so you should have a coat ready.</p>
        ),
      },
      {
        question: "What is the Nowcast card?",
        answer: (
          <p>The Nowcast card shows rain intensity predictions for the next 60 minutes in 5-minute intervals. It's useful for deciding whether to grab an umbrella right now, even if the overall day forecast looks dry.</p>
        ),
      },
      {
        question: "What does the Air Quality card show?",
        answer: (
          <p>The AQI (Air Quality Index) card shows the current air quality level for your location — Good, Moderate, Unhealthy, etc. This is particularly helpful if you're sensitive to pollution or planning outdoor exercise.</p>
        ),
      },
    ],
  },
  {
    id: "wardrobe",
    icon: "👔",
    title: "Wardrobe",
    items: [
      {
        question: "How does the Wardrobe feature work?",
        answer: (
          <>
            <p>Your Wardrobe lets you build a personal outfit for each of six weather types using the app's clothing illustrations. Once set up, WearToday automatically shows your chosen outfit on the Today screen whenever the weather matches that type — no guessing, no generic suggestions.</p>
            <p style={{ marginTop: 8 }}>For example, if you set up a Rainy Day wardrobe with a rain jacket, jeans, and rain boots, that exact outfit will appear every time it rains.</p>
          </>
        ),
      },
      {
        question: "What are the six weather types?",
        answer: (
          <ul style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            <li><strong>☀️ Hot Day</strong> — Feels like 72°F (22°C) or above, no rain or snow. Typically shorts and a t-shirt kind of day.</li>
            <li><strong>🌤️ Nice Day</strong> — Feels like 60–71°F (15–21°C), clear or partly cloudy. A comfortable layer-optional day.</li>
            <li><strong>🍂 Chilly Day</strong> — Feels like 45–59°F (7–14°C). Light jacket weather.</li>
            <li><strong>🧤 Cold Day</strong> — Feels like below 45°F (7°C), no snow. Time for a heavy coat and warm layers.</li>
            <li><strong>🌧️ Rainy Day</strong> — Rain expected at any temperature. Takes priority over the temperature bands above.</li>
            <li><strong>❄️ Snowy Day</strong> — Snow expected. Takes the highest priority regardless of temperature.</li>
          </ul>
        ),
      },
      {
        question: "How do I set up a wardrobe for a weather type?",
        answer: (
          <>
            <p>Go to the <strong>Wardrobe tab</strong>. You'll see six cards, one for each weather type. Tap any card to open the outfit editor. Inside the editor:</p>
            <ol style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>A <strong>live preview</strong> at the top shows your outfit as you build it — it updates instantly as you make selections.</li>
              <li>Use the <strong>category tabs</strong> — Top, Bottom, Outer, Shoes, Extras — to switch between clothing slots.</li>
              <li>Tap any <strong>clothing illustration</strong> in the grid to select it. The selected item gets a colored border. Tap it again to deselect.</li>
              <li>The <strong>Extras tab</strong> (accessories) supports multiple selections — pick as many as you like, such as an umbrella and sunglasses together.</li>
              <li>Outerwear is optional — leave it unselected if the weather type doesn't call for a layer.</li>
              <li>Tap <strong>Save Wardrobe</strong> when you're happy with the outfit.</li>
            </ol>
            <p style={{ marginTop: 8 }}>The card in the grid will immediately show a mini preview of your saved outfit.</p>
          </>
        ),
      },
      {
        question: "How does my wardrobe appear on the Today screen?",
        answer: (
          <>
            <p>When the current weather matches one of your saved wardrobes, the Today tab automatically shows your outfit instead of the default system illustration. You'll also see a banner at the bottom of the outfit card confirming which wardrobe is active — for example, <em>"Your Rainy Day wardrobe"</em> — with an Edit shortcut.</p>
            <p style={{ marginTop: 8 }}>If the weather matches a type you haven't set up yet, a dashed prompt appears: <em>"Set up your wardrobe for this weather →"</em>. Tap it to go directly to that editor.</p>
          </>
        ),
      },
      {
        question: "What is Style Preference and how do I set it?",
        answer: (
          <>
            <p>Style Preference filters which clothing illustrations appear in the wardrobe editor so you only see options relevant to you. It's found in <strong>Settings → Wardrobe Style</strong>. The three options are:</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Feminine</strong> — Shows dresses, women's cuts, and shared styles. For example, the Dress and Women's Jeans options will appear.</li>
              <li><strong>Masculine</strong> — Shows men's cuts and shared styles. Gender-specific feminine options are hidden.</li>
              <li><strong>Show All</strong> — Every clothing illustration is available regardless of style. Good if you want the full selection.</li>
            </ul>
            <p style={{ marginTop: 8 }}>Changing this setting filters what you see in the editor — it doesn't affect wardrobes you've already saved.</p>
          </>
        ),
      },
      {
        question: "Do I need to set up all six wardrobes?",
        answer: (
          <p>No — you can set up as many or as few as you like. For any weather type you haven't configured, WearToday falls back to its standard system-generated outfit recommendation based on your temperature calibration. The app works fine with just one or two wardrobes set up for the conditions you care about most.</p>
        ),
      },
      {
        question: "Can I choose a dress instead of separate top and bottom?",
        answer: (
          <p>Yes. Under the <strong>Top tab</strong>, select the Dress illustration. When a dress is chosen, the Bottom slot is automatically ignored — the dress spans the full top row of the outfit preview. You can still choose footwear and accessories as normal. To go back to a separate top and bottom, simply select a different item in the Top tab (like a T-Shirt or Sweater), and the Bottom tab becomes active again.</p>
        ),
      },
      {
        question: "How do I edit or clear a saved wardrobe?",
        answer: (
          <>
            <p>Tap the scenario card on the Wardrobe tab. The editor opens pre-filled with your current selections. Make any changes and tap <strong>Save Wardrobe</strong> to update.</p>
            <p style={{ marginTop: 8 }}>To remove a wardrobe entirely, tap <strong>Clear this wardrobe</strong> at the bottom of the editor. The card will return to its empty placeholder state and the weather type will fall back to system recommendations.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "packing",
    icon: "🧳",
    title: "Packing",
    items: [
      {
        question: "How do I create a packing list?",
        answer: (
          <>
            <p>Go to the Packing tab and follow these steps:</p>
            <ol style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>Type your travel destination in the search bar and select from the results.</li>
              <li>Set your departure and return dates using the date pickers.</li>
              <li>Tap <strong>Pack for [Destination]</strong> — the app fetches the weather forecast for your exact travel dates and builds a packing list based on expected conditions.</li>
              <li>Tap <strong>Save Trip</strong> to store the trip so you can come back and refresh it as your departure approaches.</li>
            </ol>
          </>
        ),
      },
      {
        question: "How is the packing list generated?",
        answer: (
          <p>WearToday pulls the weather forecast for your destination covering your exact travel dates. It uses Apple WeatherKit (primary) for trips within 10 days, and an extended 16-day forecast for trips up to 16 days out. The same outfit logic from the Today tab — your warmth thresholds, rain tolerance, and personal wardrobe — is applied to recommend the right types and quantities of clothing. If you've added items to your Wardrobe, those are matched by name in the list with a green checkmark.</p>
        ),
      },
      {
        question: "Can I save multiple upcoming trips?",
        answer: (
          <>
            <p>Yes — tap <strong>Save Trip</strong> after generating a packing list, and the trip is added to the <em>My Trips</em> section below the form. You can save as many future trips as you like. Each trip card shows the destination, date range, and how far away it is.</p>
            <p style={{ marginTop: 8 }}>For trips more than 16 days away, you can still save the trip — the forecast won't be available yet, but the card will show when the forecast unlocks so you know when to come back.</p>
          </>
        ),
      },
      {
        question: "How do I refresh a saved trip's packing list?",
        answer: (
          <>
            <p>Tap any saved trip card to expand it, then tap <strong>↻ Refresh Weather</strong>. The app fetches the latest forecast for your trip dates and regenerates the packing list. If anything changed since your last refresh, a banner highlights:</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong style={{ color: "#15803D" }}>+ Now needed</strong> — items added because of new weather (e.g. rain jacket added when rain arrives).</li>
              <li><strong style={{ color: "#6B7280" }}>No longer needed</strong> — items removed because conditions improved (e.g. heavy coat removed if a cold snap passes).</li>
            </ul>
            <p style={{ marginTop: 8 }}>The updated list and new weather snapshot are saved automatically.</p>
          </>
        ),
      },
      {
        question: "What is the 1-day-out notification?",
        answer: (
          <p>The night before any saved trip departs, WearToday checks the latest weather forecast against your stored packing list. If conditions have changed significantly — a temperature swing of 10°F or more, new rain days, or unexpected snow — you'll receive a push notification prompting you to open the app and review your updated packing list. If conditions are stable, you'll get a simple reminder that your trip starts tomorrow. Notifications require push permission to be enabled on your device.</p>
        ),
      },
      {
        question: "How far ahead can I see a forecast?",
        answer: (
          <>
            <p>Forecast availability depends on how soon your trip is:</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Within 10 days</strong> — Full Apple WeatherKit forecast. Most accurate.</li>
              <li><strong>11–16 days</strong> — Extended Open-Meteo forecast. Good directional accuracy, less precise day-to-day.</li>
              <li><strong>More than 16 days</strong> — No forecast yet. Save the trip and the card will show the exact date the forecast becomes available.</li>
            </ul>
          </>
        ),
      },
      {
        question: "What if my destination isn't found?",
        answer: (
          <p>Try a broader search term — for example, the nearest major city instead of a small town. Well-known cities, regions, and countries always resolve correctly. If you're having trouble with an unusual spelling, try the English name of the location.</p>
        ),
      },
    ],
  },
  {
    id: "radar",
    icon: "🗺️",
    title: "Radar",
    items: [
      {
        question: "How do I use the Radar tab?",
        answer: (
          <>
            <p>The Radar tab shows a live weather radar map centered on your current location.</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Zoom in/out</strong> — Pinch to zoom or use the + / − buttons.</li>
              <li><strong>Pan</strong> — Drag the map to explore surrounding areas.</li>
              <li><strong>Recenter</strong> — Tap the location button to return to your position.</li>
            </ul>
          </>
        ),
      },
      {
        question: "What do the radar colors mean?",
        answer: (
          <>
            <p>Radar colors represent precipitation intensity:</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Light blue / green</strong> — Light rain or drizzle.</li>
              <li><strong>Yellow / orange</strong> — Moderate rain.</li>
              <li><strong>Red</strong> — Heavy rain or storms.</li>
              <li><strong>Purple</strong> — Extreme precipitation or hail.</li>
            </ul>
            <p style={{ marginTop: 8 }}>No color (transparent overlay) means dry conditions in that area.</p>
          </>
        ),
      },
      {
        question: "How current is the radar data?",
        answer: (
          <p>The radar imagery is sourced from the RainViewer API and updates every few minutes. The timestamp shown on the radar indicates when the latest image was captured. Tap the refresh button to pull the most recent available frame.</p>
        ),
      },
    ],
  },
  {
    id: "settings",
    icon: "⚙️",
    title: "Settings & Customization",
    items: [
      {
        question: "How do I change temperature units?",
        answer: (
          <p>Go to Settings → Units and toggle between °F (Fahrenheit) and °C (Celsius). All temperature displays throughout the app — Today, Packing, and Radar — will update immediately after you save.</p>
        ),
      },
      {
        question: "What is Display Mode?",
        answer: (
          <>
            <p>Display Mode controls how your outfit recommendation appears on the Today tab:</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Visual</strong> — Shows an illustrated flat-lay of the outfit using SVG clothing graphics.</li>
              <li><strong>Text</strong> — Shows a plain bulleted list of clothing items.</li>
            </ul>
            <p style={{ marginTop: 8 }}>Choose whichever is clearer for you. The toggle is also available directly on the Today tab.</p>
          </>
        ),
      },
      {
        question: "How do I change my accent color (theme)?",
        answer: (
          <p>Go to Settings → Appearance and tap any of the 12 color swatches. The app's accent color — used for buttons, active tabs, highlights, and interactive elements — updates instantly. Tap Save Changes to persist your choice.</p>
        ),
      },
      {
        question: "What are Commute Times and how do they affect suggestions?",
        answer: (
          <p>Under Settings → Commute, set your morning departure time and evening return time. WearToday uses these windows to check the weather during your actual time outdoors — not just the daily high or low. For example, if you leave at 7:30 AM when it's cold but return at 6:00 PM when it's warm, the app will suggest layers you can remove during the day.</p>
        ),
      },
      {
        question: "How do I manage saved locations?",
        answer: (
          <>
            <p>You can save up to 5 locations for quick switching. To add a location:</p>
            <ol style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>Go to Settings → Location.</li>
              <li>Type a city name in the text field and tap <strong>Save city</strong>. Or tap <strong>Use current GPS location</strong> to save your device's position.</li>
            </ol>
            <p style={{ marginTop: 8 }}>To remove a saved location, scroll to Settings → Saved Locations and tap the × button next to any location. Switch between locations from the location picker on the Today tab.</p>
          </>
        ),
      },
      {
        question: "What is the Temperature Profile in Settings?",
        answer: (
          <p>The Temperature Profile section shows your current calibration data — the specific temperatures at which the app suggests shorts, a light jacket, or a heavy coat, as well as your thermal sensitivity and rain tolerance levels. These values are read-only here; they update automatically as you give outfit feedback on the Today tab, or you can reset them by running the onboarding calibration again.</p>
        ),
      },
      {
        question: "What is Today's Agenda?",
        answer: (
          <p>The Agenda setting tells WearToday what kind of day you're having so it can filter outfit suggestions by appropriate style. Options include Work, Casual, Exercise, Event, Travel, and Home. Setting it to Exercise, for example, will prioritize activewear items from your wardrobe over formal ones.</p>
        ),
      },
      {
        question: "How do I recalibrate my temperature preferences?",
        answer: (
          <p>From Settings, tap Recalibrate (or equivalent button) to re-run the onboarding calibration steps — swipe calibration, thermal sensitivity slider, and rain tolerance. This resets your thresholds from scratch, which is useful if your climate changes seasonally or if the recommendations have drifted off over time.</p>
        ),
      },
    ],
  },
];

function AccordionItem({
  item,
  isDark,
  cardBg,
  cardBorder,
  rowTextColor,
  hintColor,
  accentColor,
}: {
  item: HelpItem;
  isDark: boolean;
  cardBg: string;
  cardBorder: string | undefined;
  rowTextColor: string;
  hintColor: string;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: cardBg,
        border: cardBorder ?? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: rowTextColor, flex: 1, lineHeight: 1.4 }}>
          {item.question}
        </span>
        <span
          style={{
            fontSize: 18,
            color: accentColor,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        >
          ›
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "0 16px 16px",
                fontSize: 14,
                lineHeight: 1.65,
                color: hintColor,
                borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                paddingTop: 12,
              }}
            >
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Help() {
  const navigate = useNavigate();
  const isDark = useIsDark();

  const pageBg = isDark ? "#1C1C1E" : "#F2F2F7";
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const rowTextColor = isDark ? "#F4F4F5" : "#111827";
  const hintColor = isDark ? "#9BA4B4" : "#4B5563";
  const sectionLabelColor = isDark ? "#9BA4B4" : "#6B7280";
  const accentColor = "var(--accent-primary)";

  return (
    <div style={{ minHeight: "100%", background: pageBg, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div
        style={{
          background: pageBg,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: 16,
          paddingLeft: 16,
          paddingRight: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            color: rowTextColor,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="Go back"
        >
          ‹
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: rowTextColor, margin: 0, letterSpacing: "-0.02em" }}>
          Help
        </h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "0 14px 40px", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Intro blurb */}
        <div
          style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: 20,
            padding: 16,
          }}
        >
          <p style={{ fontSize: 14, lineHeight: 1.65, color: hintColor, margin: 0 }}>
            Welcome to WearToday! Browse the topics below to learn how each part of the app works. Tap any question to expand the answer.
          </p>
        </div>

        {SECTIONS.map((section) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {/* Section header */}
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: sectionLabelColor,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                paddingLeft: 4,
                margin: 0,
              }}
            >
              {section.icon} {section.title}
            </p>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item) => (
                <AccordionItem
                  key={item.question}
                  item={item}
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  rowTextColor={rowTextColor}
                  hintColor={hintColor}
                  accentColor={accentColor}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
