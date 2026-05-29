import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Cloud, Star, Zap } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { PRODUCT_IDS } from "@/lib/storekit";
import { Capacitor } from "@capacitor/core";

const FEATURES = [
  "AI-powered daily outfit recommendations",
  "7-day detailed weather forecast",
  "Live weather radar",
  "Smart packing lists",
  "Wardrobe management",
  "Home screen widgets & Apple Watch",
];

const MONTHLY_PRICE = "$1.99";
const ANNUAL_PRICE  = "$19.99";
const ANNUAL_PER_MONTH = "$1.67";
const ANNUAL_SAVINGS = "Save 16%";

const BACKGROUND_STARS = Array.from({ length: 18 }, () => ({
  width: Math.random() * 2 + 1,
  height: Math.random() * 2 + 1,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 60}%`,
  opacity: Math.random() * 0.4 + 0.1,
  duration: Math.random() * 3 + 2,
  delay: Math.random() * 2,
}));

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const {
    products,
    isLoadingProducts,
    isPurchasing,
    purchaseError,
    clearPurchaseError,
    purchase,
    restorePurchases,
    productsLoadedFromStore,
  } = useSubscription();

  const monthlyProduct = products.find((p) => p.id === PRODUCT_IDS.MONTHLY);
  const annualProduct  = products.find((p) => p.id === PRODUCT_IDS.ANNUAL);

  const displayMonthlyPrice = monthlyProduct?.displayPrice ?? MONTHLY_PRICE;
  const displayAnnualPrice  = annualProduct?.displayPrice  ?? ANNUAL_PRICE;

  const hasTrial =
    selectedPlan === "monthly"
      ? monthlyProduct?.introductoryOffer?.type === "freeTrial"
      : annualProduct?.introductoryOffer?.type  === "freeTrial";

  const trialDays =
    selectedPlan === "monthly"
      ? monthlyProduct?.introductoryOffer?.periodValue
      : annualProduct?.introductoryOffer?.periodValue;

  const trialLabel = hasTrial ? `${trialDays ?? 14}-day free trial, then ` : "";

  async function handleCTA() {
    clearPurchaseError();
    const productId = selectedPlan === "monthly" ? PRODUCT_IDS.MONTHLY : PRODUCT_IDS.ANNUAL;
    await purchase(productId);
  }

  const ctaLabel = hasTrial
    ? `Start ${trialDays ?? 14}-Day Free Trial`
    : `Subscribe — ${selectedPlan === "monthly" ? displayMonthlyPrice + "/mo" : displayAnnualPrice + "/yr"}`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: "linear-gradient(160deg, #0d1117 0%, #111827 50%, #1a1a2e 100%)" }}
    >
      {/* Decorative background stars */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {BACKGROUND_STARS.map((star, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: star.width,
              height: star.height,
              left: star.left,
              top: star.top,
              opacity: star.opacity,
            }}
            animate={{ opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: star.duration, repeat: Infinity, delay: star.delay }}
          />
        ))}
        <motion.div
          className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #6C63FF, transparent)" }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/3 -right-20 w-48 h-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #9D97FF, transparent)" }}
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 7, repeat: Infinity }}
        />
      </div>

      <div className="relative flex flex-col items-center px-5 pt-14 pb-10 gap-6 min-h-full">
        {/* Logo + brand */}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #6C63FF, #4A3FDB)" }}
          >
            <Cloud className="text-white" size={30} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#9D97FF" }}>
              Layer Weather
            </p>
            <h1 className="text-3xl font-black text-white tracking-tight">Pro</h1>
          </div>
        </motion.div>

        {/* Hero headline */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold text-white leading-tight">
            {hasTrial ? `Start your ${trialDays ?? 14}-day\nfree trial` : "Upgrade to Pro"}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            Everything you need to dress for any weather
          </p>
        </motion.div>

        {/* Feature list */}
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(108,99,255,0.3)" }}
                >
                  <Check size={11} className="text-white" strokeWidth={3} />
                </div>
                <span className="text-sm text-white/80">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Plan selector */}
        <motion.div
          className="w-full max-w-sm flex gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Monthly */}
          <button
            className="flex-1 rounded-2xl p-4 text-left transition-all"
            style={{
              background: selectedPlan === "monthly" ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)",
              border: selectedPlan === "monthly" ? "2px solid #6C63FF" : "2px solid rgba(255,255,255,0.1)",
            }}
            onClick={() => setSelectedPlan("monthly")}
          >
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Monthly</p>
            <p className="text-xl font-bold text-white">{displayMonthlyPrice}</p>
            <p className="text-xs text-white/50 mt-0.5">per month</p>
          </button>

          {/* Annual — recommended */}
          <button
            className="flex-1 rounded-2xl p-4 text-left relative overflow-hidden transition-all"
            style={{
              background: selectedPlan === "annual" ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)",
              border: selectedPlan === "annual" ? "2px solid #6C63FF" : "2px solid rgba(255,255,255,0.1)",
            }}
            onClick={() => setSelectedPlan("annual")}
          >
            {/* Save badge */}
            <div
              className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: "linear-gradient(90deg, #6C63FF, #9D97FF)", color: "#fff" }}
            >
              {ANNUAL_SAVINGS}
            </div>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Annual</p>
            <p className="text-xl font-bold text-white">{displayAnnualPrice}</p>
            <p className="text-xs text-white/50 mt-0.5">{ANNUAL_PER_MONTH}/mo · billed yearly</p>
          </button>
        </motion.div>

        {!isLoadingProducts && !productsLoadedFromStore && (
          <p className="text-sm text-amber-400/90 text-center px-4 max-w-sm">
            App Store plans are not loading. Subscriptions may still be awaiting Apple approval, or the
            product IDs in the app may not match App Store Connect.
          </p>
        )}

        {/* Error message */}
        <AnimatePresence>
          {purchaseError && (
            <motion.p
              className="text-sm text-red-400 text-center px-4"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {purchaseError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          className="w-full max-w-sm flex flex-col gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <button
            onClick={handleCTA}
            disabled={isPurchasing || (!Capacitor.isNativePlatform() && true)}
            className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #6C63FF, #4A3FDB)" }}
          >
            {isPurchasing ? (
              <motion.div
                className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <>
                <Zap size={16} />
                {ctaLabel}
              </>
            )}
          </button>

          {hasTrial && (
            <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              {trialLabel}
              {selectedPlan === "monthly"
                ? `${displayMonthlyPrice}/month`
                : `${displayAnnualPrice}/year`}
              . Cancel anytime.
            </p>
          )}

          <button
            onClick={restorePurchases}
            disabled={isPurchasing}
            className="text-sm text-center py-2 transition-opacity"
            style={{ color: "#9D97FF" }}
          >
            Restore Purchases
          </button>
        </motion.div>

        {/* Legal footer */}
        <p className="text-center text-xs px-6 pb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
          Payment will be charged to your Apple ID at confirmation of purchase. Subscription automatically
          renews unless cancelled at least 24 hours before the end of the current period. You can manage
          your subscription in App Store settings.
        </p>
      </div>
    </div>
  );
}
