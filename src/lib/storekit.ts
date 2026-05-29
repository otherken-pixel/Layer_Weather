import { registerPlugin } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";

export interface StoreKitProduct {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  introductoryOffer: {
    type: "freeTrial" | "introductoryPrice" | "payUpFront" | "unknown" | "none";
    periodUnit: "day" | "week" | "month" | "year";
    periodValue: number;
    displayPrice: string;
  } | null;
}

export interface StoreKitEntitlement {
  isActive: boolean;
  jwsTransaction: string | null;
  productId: string | null;
  tier: "monthly" | "annual" | null;
  expiresAt: string | null;
  isTrialing: boolean;
  originalTransactionId: string | null;
}

export interface StoreKitPluginInterface {
  loadProducts(options: { productIds: string[] }): Promise<{ products: StoreKitProduct[] }>;
  purchase(options: { productId: string }): Promise<{ jwsTransaction: string }>;
  restorePurchases(): Promise<{ transactions: { jwsTransaction: string }[] }>;
  getCurrentEntitlement(): Promise<StoreKitEntitlement>;
  addListener(
    event: "transactionUpdated",
    handler: (data: { jwsTransaction: string }) => void,
  ): Promise<{ remove: () => void }>;
}

export const PRODUCT_IDS = {
  MONTHLY: "com.layerweather.app.pro.monthly.v2",
  ANNUAL:  "com.layerweather.app.pro.annual.v2",
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

const StoreKitPlugin = Capacitor.isNativePlatform()
  ? registerPlugin<StoreKitPluginInterface>("StoreKitPlugin")
  : null;

export default StoreKitPlugin;
