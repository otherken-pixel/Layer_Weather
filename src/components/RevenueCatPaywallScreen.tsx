import { useEffect, useRef, useState } from "react";
import { Cloud } from "lucide-react";
import { useAppStore } from "@/store";
import {
  isRevenueCatWebConfigured,
  isUserCancelledError,
  presentRevenueCatPaywall,
  syncProfileAfterWebPurchase,
} from "@/lib/revenuecat-web";

/**
 * Web-only paywall: RevenueCat dashboard paywall (monthly / yearly packages).
 * iOS uses {@link PaywallScreen} + StoreKit — unchanged.
 */
export default function RevenueCatPaywallScreen() {
  const { userId, profile } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const presentedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !containerRef.current || presentedRef.current) return;
    if (!isRevenueCatWebConfigured()) {
      setError("Web subscriptions are not configured. Add VITE_REVENUECAT_API_KEY to your environment.");
      setLoading(false);
      return;
    }

    presentedRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        await presentRevenueCatPaywall({
          appUserId: userId,
          htmlTarget: containerRef.current!,
          customerEmail: profile?.email ?? undefined,
        });
        if (!cancelled) await syncProfileAfterWebPurchase();
      } catch (e) {
        if (!cancelled && !isUserCancelledError(e)) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg || "Could not load the subscription page. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, profile?.email]);

  if (!isRevenueCatWebConfigured()) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "#0d1117" }}
      >
        <p className="text-sm text-amber-400/90 max-w-sm">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#0d1117" }}
    >
      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 pt-16 px-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6C63FF, #4A3FDB)" }}
          >
            <Cloud className="text-white" size={28} />
          </div>
          <p className="text-sm text-white/60">Loading subscription options…</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 text-center px-6 py-4">{error}</p>
      )}

      <div ref={containerRef} className="flex-1 w-full min-h-0" />
    </div>
  );
}
