import { Capacitor } from "@capacitor/core";
import { Purchases, type Offering, type Package } from "@revenuecat/purchases-js";
import "@revenuecat/purchases-js/styles";

/** Package identifiers in RevenueCat (must match dashboard). */
export const RC_PACKAGE_IDS = {
  MONTHLY: "monthly",
  ANNUAL: "annual",
} as const;

const ENTITLEMENT_ID =
  (import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID as string | undefined)?.trim() || "pro";

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
    Purchases.getSharedInstance().changeUser(appUserId);
    configuredUserId = appUserId;
    return Purchases.getSharedInstance();
  }

  const purchases = Purchases.configure({ apiKey, appUserId });
  configuredUserId = appUserId;
  return purchases;
}

export async function loadRevenueCatOffering(
  purchases: Purchases,
): Promise<Offering | null> {
  const offerings = await purchases.getOfferings();
  return offerings.current;
}

export function findPackage(
  offering: Offering,
  packageId: string,
): Package | undefined {
  return (
    offering.packagesById[packageId] ??
    offering.availablePackages.find((p) => p.identifier === packageId)
  );
}

export function packageDisplayPrice(pkg: Package): string | undefined {
  return pkg.webBillingProduct?.price?.formattedPrice;
}

export function packageHasFreeTrial(pkg: Package): boolean {
  const product = pkg.webBillingProduct;
  if (!product) return false;
  return product.freeTrialPhase != null || product.introPricePhase != null;
}

export function packageTrialDays(pkg: Package): number | undefined {
  const product = pkg.webBillingProduct;
  if (!product) return undefined;
  const trial = product.freeTrialPhase ?? product.introPricePhase;
  if (!trial?.periodDuration) return undefined;
  const match = trial.periodDuration.match(/^P(\d+)([DWMY])$/);
  if (!match) return undefined;
  const n = Number(match[1]);
  switch (match[2]) {
    case "D":
      return n;
    case "W":
      return n * 7;
    case "M":
      return n * 30;
    case "Y":
      return n * 365;
    default:
      return n;
  }
}

export async function purchaseRevenueCatPackage(
  purchases: Purchases,
  rcPackage: Package,
  options: { customerEmail?: string; htmlTarget?: HTMLElement },
): Promise<void> {
  await purchases.purchase({
    rcPackage,
    customerEmail: options.customerEmail,
    htmlTarget: options.htmlTarget,
    skipSuccessPage: true,
  });
}

export async function syncRevenueCatEntitlement(
  purchases: Purchases,
): Promise<{ isActive: boolean; isTrialing: boolean }> {
  const entitled = await purchases.isEntitledTo(ENTITLEMENT_ID);
  if (!entitled) return { isActive: false, isTrialing: false };
  const info = await purchases.getCustomerInfo();
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  if (!ent) return { isActive: false, isTrialing: false };
  const isTrialing = ent.periodType === "trial" || ent.periodType === "intro";
  return { isActive: true, isTrialing };
}

export function resetRevenueCatWebConfig(): void {
  configuredUserId = null;
}
