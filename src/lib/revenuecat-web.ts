import { Capacitor } from "@capacitor/core";
import { ErrorCode, Purchases, type PurchasesError } from "@revenuecat/purchases-js";
import { getProfile } from "@/lib/supabase";
import { useAppStore } from "@/store";
import type { SubscriptionStatus } from "@/types";

export function getRevenueCatApiKey(): string | null {
  const key =
    (import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined)?.trim() ||
    (import.meta.env.VITE_REVENUECAT_WEB_API_KEY as string | undefined)?.trim() ||
    "";
  return key.length > 0 ? key : null;
}

export function isRevenueCatWebConfigured(): boolean {
  return !Capacitor.isNativePlatform() && getRevenueCatApiKey() != null;
}

let configuredUserId: string | null = null;

export function configureRevenueCatWeb(appUserId: string): Purchases | null {
  if (Capacitor.isNativePlatform()) return null;
  const apiKey = getRevenueCatApiKey();
  if (!apiKey || !appUserId) return null;

  if (Purchases.isConfigured() && configuredUserId === appUserId) {
    return Purchases.getSharedInstance();
  }

  if (Purchases.isConfigured() && configuredUserId !== appUserId) {
    void Purchases.getSharedInstance().changeUser(appUserId);
    configuredUserId = appUserId;
    return Purchases.getSharedInstance();
  }

  const purchases = Purchases.configure({ apiKey, appUserId });
  configuredUserId = appUserId;
  return purchases;
}

export function isWebSubscriptionActive(status: SubscriptionStatus | undefined): boolean {
  return status === "active" || status === "trialing";
}

/** Poll Supabase until the webhook updates web_subscription_* (or timeout). */
export async function syncProfileAfterWebPurchase(maxAttempts = 10, intervalMs = 1500): Promise<void> {
  const userId = useAppStore.getState().userId;
  const setProfile = useAppStore.getState().setProfile;
  if (!userId) return;

  for (let i = 0; i < maxAttempts; i++) {
    const fresh = await getProfile(userId);
    if (fresh) {
      setProfile(fresh);
      if (isWebSubscriptionActive(fresh.web_subscription_status)) return;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export function isUserCancelledError(error: unknown): boolean {
  const rc = error as PurchasesError | undefined;
  return rc?.errorCode === ErrorCode.UserCancelledError;
}

/**
 * Renders the RevenueCat-hosted paywall (configured in the RC dashboard).
 * Products: monthly + yearly (Web Billing); iOS uses separate App Store products.
 */
export async function presentRevenueCatPaywall(options: {
  appUserId: string;
  htmlTarget: HTMLElement;
  customerEmail?: string;
}): Promise<void> {
  const purchases = configureRevenueCatWeb(options.appUserId);
  if (!purchases) throw new Error("RevenueCat is not configured");

  await purchases.preload();
  await purchases.presentPaywall({
    htmlTarget: options.htmlTarget,
    customerEmail: options.customerEmail,
  });
}

/** RevenueCat Web Billing customer portal URL (manage/cancel web subscription). */
export async function getWebManagementUrl(appUserId: string): Promise<string | null> {
  const purchases = configureRevenueCatWeb(appUserId);
  if (!purchases) return null;
  try {
    const info = await purchases.getCustomerInfo();
    return info.managementURL ?? null;
  } catch (e) {
    console.error("getWebManagementUrl failed:", e);
    return null;
  }
}
