import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import StoreKit, { PRODUCT_IDS, type StoreKitProduct } from "@/lib/storekit";
import { isSubscriptionActive } from "@/lib/revenuecat-web";
import { supabase } from "@/lib/supabase";
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
}

function isPluginUnimplemented(raw: string): boolean {
  return raw.includes("not implemented") || raw.includes("UNIMPLEMENTED");
}

function profileIsPremium(profile: ReturnType<typeof useAppStore.getState>["profile"]): boolean {
  if (!profile) return false;
  const compActive =
    profile.comp_access === true &&
    (!profile.comp_access_until || new Date(profile.comp_access_until).getTime() > Date.now());
  if (compActive) return true;
  if (profile.subscription_status === "active" || profile.subscription_status === "trialing") {
    return true;
  }
  return isSubscriptionActive(profile.web_subscription_status);
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
  if (raw.includes("Subscription service is unavailable")) return raw;
  if (raw.length > 120) return `${raw.slice(0, 120)}…`;
  return raw || defaultMessage;
}

export function useSubscription(): UseSubscriptionReturn {
  const { profile, setProfile } = useAppStore();
  const [products, setProducts] = useState<StoreKitProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [storeKitUnavailable, setStoreKitUnavailable] = useState(false);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  const appleStatus: SubscriptionStatus = profile?.subscription_status ?? "none";
  const webStatus: SubscriptionStatus = profile?.web_subscription_status ?? "none";
  const compActive =
    profile?.comp_access === true &&
    (!profile.comp_access_until || new Date(profile.comp_access_until).getTime() > Date.now());
  const isPremium =
    compActive || isSubscriptionActive(appleStatus) || isSubscriptionActive(webStatus);
  const isTrialing = appleStatus === "trialing" || webStatus === "trialing";

  const subscriptionStatus: SubscriptionStatus = isSubscriptionActive(appleStatus)
    ? appleStatus
    : isSubscriptionActive(webStatus)
      ? webStatus
      : webStatus !== "none"
        ? webStatus
        : appleStatus;

  const subscriptionTier: SubscriptionTier | null = isSubscriptionActive(webStatus)
    ? profile?.web_subscription_tier ?? profile?.subscription_tier ?? null
    : profile?.subscription_tier ?? profile?.web_subscription_tier ?? null;

  const expiresAtRaw = isSubscriptionActive(webStatus)
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
        const premium = profileIsPremium(useAppStore.getState().profile);
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

  const purchase = useCallback(
    async (productId: string): Promise<void> => {
      if (!StoreKit) return;
      setIsPurchasing(true);
      setPurchaseError(null);
      try {
        const { jwsTransaction } = await StoreKit.purchase({ productId });
        await validateWithServer(jwsTransaction);
      } catch (e: unknown) {
        const msg = await subscriptionErrorMessage(e);
        if (msg !== "USER_CANCELLED" && msg !== "PENDING") {
          setPurchaseError(friendlyPurchaseError(msg));
        }
      } finally {
        setIsPurchasing(false);
      }
    },
    [validateWithServer],
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
  };
}
