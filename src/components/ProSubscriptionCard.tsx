import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Sparkles } from "lucide-react";
import { APPLE_SUBSCRIPTIONS_URL, type ProDisplayState } from "@/lib/subscription-display";
import { getWebManagementUrl } from "@/lib/revenuecat-web";

interface ProSubscriptionCardProps {
  proDisplay: ProDisplayState;
  userId: string | null;
  isDark: boolean;
  cardBg: string;
  cardBorder: string | undefined;
  cardShadow: string;
  hintColor: string;
  rowTextColor: string;
}

export default function ProSubscriptionCard({
  proDisplay,
  userId,
  isDark,
  cardBg,
  cardBorder,
  cardShadow,
  hintColor,
  rowTextColor,
}: ProSubscriptionCardProps) {
  const [webManageUrl, setWebManageUrl] = useState<string | null>(null);
  const [loadingManage, setLoadingManage] = useState(false);

  useEffect(() => {
    if (!userId || proDisplay.manageTarget !== "web") {
      setWebManageUrl(null);
      return;
    }
    let cancelled = false;
    setLoadingManage(true);
    getWebManagementUrl(userId)
      .then((url) => {
        if (!cancelled) setWebManageUrl(url);
      })
      .finally(() => {
        if (!cancelled) setLoadingManage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, proDisplay.manageTarget]);

  if (!proDisplay.isPro) return null;

  function openManage() {
    if (proDisplay.manageTarget === "apple") {
      window.open(APPLE_SUBSCRIPTIONS_URL, "_blank", "noopener,noreferrer");
      return;
    }
    if (proDisplay.manageTarget === "web" && webManageUrl) {
      window.open(webManageUrl, "_blank", "noopener,noreferrer");
    }
  }

  const manageDisabled =
    proDisplay.manageTarget === "web" && (loadingManage || !webManageUrl);

  const manageLabel =
    proDisplay.manageTarget === "apple"
      ? "Manage in App Store"
      : "Manage subscription";

  return (
    <div
      className="rounded-[20px] p-4 flex flex-col gap-3"
      style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,var(--accent-primary),var(--accent-dark))" }}
        >
          <Sparkles size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(var(--accent-rgb),0.2)",
                color: "var(--accent-primary)",
              }}
            >
              {proDisplay.badgeLabel}
            </span>
            {proDisplay.status === "trialing" && (
              <span className="text-xs font-semibold" style={{ color: hintColor }}>
                Trial
              </span>
            )}
          </div>
          <p className="text-sm font-medium mt-1.5" style={{ color: rowTextColor }}>
            {proDisplay.subline}
          </p>
          {proDisplay.footnote && (
            <p className="text-xs mt-1" style={{ color: hintColor }}>
              {proDisplay.footnote}
            </p>
          )}
        </div>
      </div>

      {proDisplay.showManage && (
        <button
          type="button"
          onClick={openManage}
          disabled={manageDisabled}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border-0 cursor-pointer disabled:opacity-50"
          style={{
            background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
            color: "var(--accent-primary)",
          }}
        >
          {loadingManage && proDisplay.manageTarget === "web"
            ? "Loading…"
            : manageLabel}
        </button>
      )}

      {proDisplay.manageTarget === "web" &&
        !loadingManage &&
        !webManageUrl &&
        Capacitor.isNativePlatform() && (
          <p className="text-xs" style={{ color: hintColor }}>
            Open layerweather.com in a browser to manage your web subscription, or check your
            subscription confirmation email.
          </p>
        )}
    </div>
  );
}
