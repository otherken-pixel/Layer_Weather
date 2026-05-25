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
        question: "How do I add a clothing item?",
        answer: (
          <>
            <p>Navigate to the Wardrobe tab and tap the + button in the top right corner. Fill in:</p>
            <ol style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Category</strong> — Choose from Tops, Bottoms, Outerwear, Footwear, or Accessories.</li>
              <li><strong>Color</strong> — Enter the color name or pick from common options.</li>
              <li><strong>Warmth rating</strong> — Rate from 1 (very light, like a tank top) to 5 (very warm, like a heavy coat).</li>
              <li><strong>Style tags</strong> — Select all that apply: Casual, Formal, Activewear, Outdoor, Work, or Smart-casual.</li>
            </ol>
            <p style={{ marginTop: 8 }}>Tap Save to add the item to your wardrobe.</p>
          </>
        ),
      },
      {
        question: "What are the clothing categories?",
        answer: (
          <ul style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li><strong>👕 Tops</strong> — T-shirts, shirts, blouses, sweaters, hoodies.</li>
            <li><strong>👖 Bottoms</strong> — Pants, jeans, shorts, skirts, leggings.</li>
            <li><strong>🧥 Outerwear</strong> — Jackets, coats, raincoats, vests.</li>
            <li><strong>👟 Footwear</strong> — Sneakers, boots, sandals, dress shoes.</li>
            <li><strong>🧣 Accessories</strong> — Scarves, hats, gloves, belts, bags.</li>
          </ul>
        ),
      },
      {
        question: "How does the warmth rating work?",
        answer: (
          <>
            <p>The warmth rating (1–5) tells the app how much warmth an item provides. Use this scale as a guide:</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>1</strong> — Very light. Tank tops, shorts, sandals.</li>
              <li><strong>2</strong> — Light. T-shirts, light linen shirts, light sneakers.</li>
              <li><strong>3</strong> — Medium. Long-sleeve shirts, jeans, light fleece.</li>
              <li><strong>4</strong> — Warm. Heavy sweaters, lined pants, ankle boots.</li>
              <li><strong>5</strong> — Very warm. Heavy coats, thermal layers, insulated boots.</li>
            </ul>
            <p style={{ marginTop: 8 }}>The app uses these ratings to build outfits that match the day's temperature range.</p>
          </>
        ),
      },
      {
        question: "What are style tags and why do they matter?",
        answer: (
          <>
            <p>Style tags describe the context in which you'd wear an item. They help WearToday suggest outfits that match your agenda for the day.</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Casual</strong> — Everyday, relaxed wear.</li>
              <li><strong>Formal</strong> — Business dress, suits, formalwear.</li>
              <li><strong>Activewear</strong> — Gym, running, sports.</li>
              <li><strong>Outdoor</strong> — Hiking, camping, rugged activities.</li>
              <li><strong>Work</strong> — Office-appropriate attire.</li>
              <li><strong>Smart-casual</strong> — Polished but not formal; restaurant-ready.</li>
            </ul>
            <p style={{ marginTop: 8 }}>If your Today agenda is set to "Work," the app will prioritize items tagged Work or Formal.</p>
          </>
        ),
      },
      {
        question: "How do I edit or delete an item?",
        answer: (
          <>
            <p>In the Wardrobe tab, tap on any item to open its detail view. From there:</p>
            <ul style={{ marginTop: 8, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>Tap the <strong>edit icon</strong> (pencil) to modify the category, color, warmth rating, or style tags.</li>
              <li>Tap the <strong>delete icon</strong> (trash) and confirm to permanently remove the item.</li>
            </ul>
          </>
        ),
      },
      {
        question: "How does my wardrobe connect to outfit suggestions?",
        answer: (
          <p>When your wardrobe is populated, the Today tab will suggest specific items from your closet rather than generic clothing types. For example, instead of "wear a medium-weight jacket," it might say "wear your Navy Casual Jacket." The more items you add, the more personalized your daily outfit becomes.</p>
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
              <li>Tap the search bar and type your travel destination (city, country, or region).</li>
              <li>Select the correct location from the search results.</li>
              <li>Choose your travel dates.</li>
              <li>Tap <strong>Generate List</strong> — the app fetches the weather forecast for your destination and builds a packing list based on expected conditions.</li>
            </ol>
          </>
        ),
      },
      {
        question: "How is the packing list generated?",
        answer: (
          <p>WearToday pulls a multi-day weather forecast for your destination covering your travel dates. It then applies the same outfit logic used on the Today tab — your warmth thresholds, rain tolerance, and style preferences — to suggest the types and quantities of clothing you'll need. If you've added items to your Wardrobe, those items are referenced by name in the list.</p>
        ),
      },
      {
        question: "Can I customize the generated packing list?",
        answer: (
          <p>Yes. After the list is generated you can check off items you've already packed and add your own custom items. The list is saved so you can return to it as you continue packing in the days before your trip.</p>
        ),
      },
      {
        question: "What if my destination isn't found?",
        answer: (
          <p>Try a broader search term — for example, the nearest major city instead of a small town. The app uses a geocoding API to resolve locations, so well-known cities will always work. If the destination still can't be found, you can enter weather conditions manually to generate a list.</p>
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
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
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
