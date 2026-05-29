import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import StoreKit, { PRODUCT_IDS, type StoreKitProduct } from "@/lib/storekit";
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
}

export function useSubscription(): UseSubscriptionReturn {
  const { profile, setProfile } = useAppStore();
  const [products, setProducts] = useState<StoreKitProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  const subscriptionStatus: SubscriptionStatus = profile?.subscription_status ?? "none";
  const isPremium = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const isTrialing = subscriptionStatus === "trialing";

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
      if (error) throw new Error(error.message);
      applyValidationResult(data);
    },
    [applyValidationResult],
  );

  // On mount: load products and sync entitlement from App Store
  useEffect(() => {
    // Capture in a local const so TypeScript narrows non-null inside async callbacks
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
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }

      // Sync entitlement if Supabase profile doesn't show premium but App Store says so
      try {
        const entitlement = await sk.getCurrentEntitlement();
        if (entitlement.isActive && entitlement.jwsTransaction && !isPremium) {
          await validateWithServer(entitlement.jwsTransaction);
        }
      } catch (e) {
        console.error("StoreKit entitlement sync failed:", e);
      }
    };

    init();

    // Listen for background transaction updates (renewals, revocations)
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const purchase = useCallback(
    async (productId: string): Promise<void> => {
      if (!StoreKit) return;
      setIsPurchasing(true);
      setPurchaseError(null);
      try {
        const { jwsTransaction } = await StoreKit.purchase({ productId });
        await validateWithServer(jwsTransaction);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg !== "USER_CANCELLED" && msg !== "PENDING") {
          setPurchaseError("Purchase failed. Please try again.");
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
    } catch {
      setPurchaseError("Restore failed. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  }, [validateWithServer]);

  return {
    isPremium,
    isTrialing,
    subscriptionStatus,
    subscriptionTier: profile?.subscription_tier ?? null,
    expiresAt: profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null,
    products,
    isLoadingProducts,
    isPurchasing,
    purchaseError,
    clearPurchaseError: () => setPurchaseError(null),
    purchase,
    restorePurchases,
  };
}
