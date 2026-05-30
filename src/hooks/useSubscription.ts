import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Package } from "@revenuecat/purchases-js";
import StoreKit, { PRODUCT_IDS, type StoreKitProduct } from "@/lib/storekit";
import {
  configureRevenueCatWeb,
  findPackage,
  isRevenueCatWebConfigured,
  loadRevenueCatOffering,
  purchaseRevenueCatPackage,
  RC_PACKAGE_IDS,
} from "@/lib/revenuecat-web";
import { supabase, getProfile } from "@/lib/supabase";
import { useAppStore } from "@/store";
import type { SubscriptionStatus, SubscriptionTier } from "@/types";

export interface UseSubscriptionReturn {
  isPremium: boolean;
  isTrialing: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionTier: SubscriptionTier | null;
  expiresAt: Date | null;
  products: StoreKitProduct[];
  isLoadingProducts: boolean;
  isPurchasing: boolean;
  purchaseError: string | null;
  clearPurchaseError: () => void;
  purchase: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  productsLoadedFromStore: boolean;
  storeKitUnavailable: boolean;
  /** Web: RevenueCat packages loaded and ready to purchase. */
  webPackagesReady: boolean;
  isWebPlatform: boolean;
  webMonthlyPackage: Package | null;
  webAnnualPackage: Package | null;
}

function isPluginUnimplemented(raw: string): boolean {
  return raw.includes("not implemented") || raw.includes("UNIMPLEMENTED");
}

function isApplePremium(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

function isWebPremium(status: SubscriptionStatus | undefined): boolean {
  return status === "active" || status === "trialing";
}

function mergedSubscriptionStatus(
  apple: SubscriptionStatus,
  web: SubscriptionStatus | undefined,
): SubscriptionStatus {
  if (isApplePremium(apple)) return apple;
  if (web && isWebPremium(web)) return web;
  if (web && web !== "none") return web;
  return apple;
}

async function subscriptionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string; message?: string };
      const msg = body.error ?? body.message;
      if (msg) return msg;
    } catch {
      /* fall through */
    }
    if (error.message.includes("Failed to send a request to the Edge Function")) {
      return "Subscription service is unavailable. Try again in a few minutes.";
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function friendlyPurchaseError(
  raw: string,
  defaultMessage = "Purchase failed. Please try again.",
): string {
  if (raw === "USER_CANCELLED" || raw === "PENDING") return raw;
  if (isPluginUnimplemented(raw)) {
    return "In-app purchases aren't available in this build. Update Layer Weather to the latest version from the App Store, then try again.";
  }
  if (raw.includes("PRODUCT_NOT_FOUND") || raw.includes("Product not found")) {
    return "Subscription products are not available yet. In App Store Connect, ensure both Pro plans are approved and linked to this app version.";
  }
  if (raw.includes("Not authenticated") || raw.includes("Unauthorized")) {
    return "Sign in to your Layer Weather account, then try subscribing again.";
  }
  if (raw.includes("Invalid transaction signature") || raw.includes("Bundle ID mismatch")) {
    return "Could not verify your purchase with our server. Update the app and try again.";
  }
  if (raw.includes("UserCancelledError") || raw.includes("user cancelled")) {
    return "USER_CANCELLED";
  }
  if (raw.includes("Subscription service is unavailable")) return raw;
  if (raw.includes("RevenueCat") || raw.includes("offerings")) {
    return "Web subscriptions are not available right now. Please try again in a few minutes.";
  }
  if (raw.length > 120) return `${raw.slice(0, 120)}…`;
  return raw || defaultMessage;
}

export function useSubscription(): UseSubscriptionReturn {
  const { profile, setProfile, userId } = useAppStore();
  const [products, setProducts] = useState<StoreKitProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [storeKitUnavailable, setStoreKitUnavailable] = useState(false);
  const [webMonthlyPackage, setWebMonthlyPackage] = useState<Package | null>(null);
  const [webAnnualPackage, setWebAnnualPackage] = useState<Package | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  const isWebPlatform = !Capacitor.isNativePlatform();

  const appleStatus: SubscriptionStatus = profile?.subscription_status ?? "none";
  const webStatus: SubscriptionStatus = profile?.web_subscription_status ?? "none";
  const compActive =
    profile?.comp_access === true &&
    (!profile.comp_access_until || new Date(profile.comp_access_until).getTime() > Date.now());
  const isPremium =
    compActive || isApplePremium(appleStatus) || isWebPremium(webStatus);
  const subscriptionStatus = mergedSubscriptionStatus(appleStatus, webStatus);
  const isTrialing = appleStatus === "trialing" || webStatus === "trialing";

  const subscriptionTier: SubscriptionTier | null = isWebPremium(webStatus)
    ? profile?.web_subscription_tier ?? profile?.subscription_tier ?? null
    : profile?.subscription_tier ?? profile?.web_subscription_tier ?? null;

  const expiresAtRaw = isWebPremium(webStatus)
    ? profile?.web_subscription_expires_at ?? profile?.subscription_expires_at
    : profile?.subscription_expires_at ?? profile?.web_subscription_expires_at;

  const applyValidationResult = useCallback(
    (data: {
      status: SubscriptionStatus;
      tier: SubscriptionTier | null;
      expiresAt: string | null;
      isTrialing: boolean;
    }) => {
      const currentProfile = useAppStore.getState().profile;
      if (!currentProfile) return;
      setProfile({
        ...currentProfile,
        subscription_status: data.status,
        subscription_tier: data.tier,
        subscription_expires_at: data.expiresAt,
      });
    },
    [setProfile],
  );

  const refreshProfileFromServer = useCallback(async () => {
    const userId = useAppStore.getState().userId;
    if (!userId) return;
    const fresh = await getProfile(userId);
    if (fresh) setProfile(fresh);
  }, [setProfile]);

  const validateWithServer = useCallback(
    async (jwsTransaction: string): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("validate-apple-receipt", {
        body: { jwsTransaction },
      });
      if (error) throw error;
      if (!data || typeof data !== "object" || !("status" in data)) {
        throw new Error("Unexpected response from subscription validation");
      }
      applyValidationResult(data as {
        status: SubscriptionStatus;
        tier: SubscriptionTier | null;
        expiresAt: string | null;
        isTrialing: boolean;
      });
    },
    [applyValidationResult],
  );

  // iOS: StoreKit products and entitlement sync
  useEffect(() => {
    const sk = StoreKit;
    if (!Capacitor.isNativePlatform() || !sk) return;

    let cancelled = false;

    const init = async () => {
      setIsLoadingProducts(true);
      try {
        const { products: loaded } = await sk.loadProducts({
          productIds: [PRODUCT_IDS.MONTHLY, PRODUCT_IDS.ANNUAL],
        });
        if (!cancelled) setProducts(loaded);
      } catch (e) {
        console.error("StoreKit loadProducts failed:", e);
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled && isPluginUnimplemented(msg)) setStoreKitUnavailable(true);
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }

      try {
        const entitlement = await sk.getCurrentEntitlement();
        const premium =
          useAppStore.getState().profile?.subscription_status === "active" ||
          useAppStore.getState().profile?.subscription_status === "trialing" ||
          useAppStore.getState().profile?.web_subscription_status === "active" ||
          useAppStore.getState().profile?.web_subscription_status === "trialing";
        if (entitlement.isActive && entitlement.jwsTransaction && !premium) {
          await validateWithServer(entitlement.jwsTransaction);
        }
      } catch (e) {
        console.error("StoreKit entitlement sync failed:", e);
      }
    };

    init();

    sk.addListener("transactionUpdated", async ({ jwsTransaction }) => {
      try {
        await validateWithServer(jwsTransaction);
      } catch (e) {
        console.error("Background transaction validation failed:", e);
      }
    }).then((listener) => {
      listenerRef.current = listener;
    });

    return () => {
      cancelled = true;
      listenerRef.current?.remove();
    };
  }, [validateWithServer]);

  // Web: RevenueCat offerings
  useEffect(() => {
    if (!isWebPlatform || !isRevenueCatWebConfigured() || !userId) return;

    let cancelled = false;

    const init = async () => {
      setIsLoadingProducts(true);
      try {
        const purchases = configureRevenueCatWeb(userId);
        if (!purchases) return;
        const offering = await loadRevenueCatOffering(purchases);
        if (cancelled || !offering) return;
        setWebMonthlyPackage(findPackage(offering, RC_PACKAGE_IDS.MONTHLY) ?? null);
        setWebAnnualPackage(findPackage(offering, RC_PACKAGE_IDS.ANNUAL) ?? null);
      } catch (e) {
        console.error("RevenueCat offerings failed:", e);
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [isWebPlatform, userId]);

  const purchase = useCallback(
    async (productId: string): Promise<void> => {
      setIsPurchasing(true);
      setPurchaseError(null);

      try {
        if (Capacitor.isNativePlatform()) {
          if (!StoreKit) return;
          const { jwsTransaction } = await StoreKit.purchase({ productId });
          await validateWithServer(jwsTransaction);
          return;
        }

        if (!userId) throw new Error("Not authenticated");
        const purchases = configureRevenueCatWeb(userId);
        if (!purchases) throw new Error("RevenueCat is not configured");

        const packageId =
          productId === PRODUCT_IDS.MONTHLY || productId === RC_PACKAGE_IDS.MONTHLY
            ? RC_PACKAGE_IDS.MONTHLY
            : RC_PACKAGE_IDS.ANNUAL;
        const rcPackage =
          packageId === RC_PACKAGE_IDS.MONTHLY ? webMonthlyPackage : webAnnualPackage;
        if (!rcPackage) throw new Error("Subscription package not found");

        await purchaseRevenueCatPackage(purchases, rcPackage, {
          customerEmail: profile?.email ?? undefined,
        });

        // Webhook updates Supabase; poll briefly then refresh profile.
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          await refreshProfileFromServer();
          const p = useAppStore.getState().profile;
          if (isWebPremium(p?.web_subscription_status)) break;
        }
      } catch (e: unknown) {
        const msg = await subscriptionErrorMessage(e);
        if (msg !== "USER_CANCELLED" && msg !== "PENDING") {
          setPurchaseError(friendlyPurchaseError(msg));
        }
      } finally {
        setIsPurchasing(false);
      }
    },
    [
      userId,
      
      profile?.email,
      validateWithServer,
      webMonthlyPackage,
      webAnnualPackage,
      refreshProfileFromServer,
    ],
  );

  const restorePurchases = useCallback(async (): Promise<void> => {
    if (!StoreKit) return;
    setIsPurchasing(true);
    setPurchaseError(null);
    try {
      const { transactions } = await StoreKit.restorePurchases();
      if (transactions.length === 0) {
        setPurchaseError("No previous purchases found.");
        return;
      }
      await validateWithServer(transactions[transactions.length - 1].jwsTransaction);
    } catch (e: unknown) {
      const msg = await subscriptionErrorMessage(e);
      if (msg !== "USER_CANCELLED" && msg !== "PENDING") {
        setPurchaseError(friendlyPurchaseError(msg, "Restore failed. Please try again."));
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [validateWithServer]);

  const webPackagesReady = Boolean(webMonthlyPackage && webAnnualPackage);

  return {
    isPremium,
    isTrialing,
    subscriptionStatus,
    subscriptionTier,
    expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
    products,
    isLoadingProducts,
    isPurchasing,
    purchaseError,
    clearPurchaseError: () => setPurchaseError(null),
    purchase,
    restorePurchases,
    productsLoadedFromStore: products.length > 0,
    storeKitUnavailable,
    webPackagesReady,
    isWebPlatform,
    webMonthlyPackage,
    webAnnualPackage,
  };
}
