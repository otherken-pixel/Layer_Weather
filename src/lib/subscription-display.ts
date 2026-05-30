import type { Profile, SubscriptionStatus, SubscriptionTier } from "@/types";

export type ProBillingSource = "apple" | "web" | "comp";

export interface ProDisplayState {
  isPro: boolean;
  source: ProBillingSource | null;
  secondarySource: ProBillingSource | null;
  tier: SubscriptionTier | null;
  status: SubscriptionStatus;
  expiresAt: Date | null;
  badgeLabel: string;
  subline: string;
  footnote: string | null;
  showManage: boolean;
  manageTarget: "apple" | "web" | null;
}

export const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

function isEntitledStatus(status: SubscriptionStatus | undefined): boolean {
  return status === "active" || status === "trialing";
}

function parseExpires(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTier(tier: SubscriptionTier | null): string | null {
  if (tier === "monthly") return "Monthly";
  if (tier === "annual") return "Annual";
  return null;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface SourceInfo {
  source: ProBillingSource;
  status: SubscriptionStatus;
  tier: SubscriptionTier | null;
  expiresAt: Date | null;
}

function appleSource(profile: Profile): SourceInfo | null {
  const status = profile.subscription_status ?? "none";
  if (!isEntitledStatus(status)) return null;
  return {
    source: "apple",
    status,
    tier: profile.subscription_tier ?? null,
    expiresAt: parseExpires(profile.subscription_expires_at),
  };
}

function webSource(profile: Profile): SourceInfo | null {
  const status = profile.web_subscription_status ?? "none";
  if (!isEntitledStatus(status)) return null;
  return {
    source: "web",
    status,
    tier: profile.web_subscription_tier ?? null,
    expiresAt: parseExpires(profile.web_subscription_expires_at),
  };
}

function compSource(profile: Profile): SourceInfo | null {
  if (!profile.comp_access) return null;
  const until = parseExpires(profile.comp_access_until ?? undefined);
  if (until && until.getTime() <= Date.now()) return null;
  return {
    source: "comp",
    status: "active",
    tier: null,
    expiresAt: until,
  };
}

function pickPrimary(
  a: SourceInfo | null,
  b: SourceInfo | null,
): { primary: SourceInfo; secondary: SourceInfo | null } | null {
  if (!a && !b) return null;
  if (a && !b) return { primary: a, secondary: null };
  if (b && !a) return { primary: b, secondary: null };
  const aExp = a!.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bExp = b!.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (bExp > aExp) return { primary: b!, secondary: a! };
  return { primary: a!, secondary: b! };
}

const EMPTY_DISPLAY: ProDisplayState = {
  isPro: false,
  source: null,
  secondarySource: null,
  tier: null,
  status: "none",
  expiresAt: null,
  badgeLabel: "",
  subline: "",
  footnote: null,
  showManage: false,
  manageTarget: null,
};

/** Derives user-facing Pro copy from profile subscription fields (Apple, web, comp). */
export function getProDisplayState(profile: Profile | null | undefined): ProDisplayState {
  if (!profile) return EMPTY_DISPLAY;

  const comp = compSource(profile);
  if (comp) {
    const subline = comp.expiresAt
      ? `Complimentary access until ${formatDisplayDate(comp.expiresAt)}`
      : "Complimentary access";
    return {
      isPro: true,
      source: "comp",
      secondarySource: null,
      tier: null,
      status: "active",
      expiresAt: comp.expiresAt,
      badgeLabel: "Layer Weather Pro",
      subline,
      footnote: null,
      showManage: false,
      manageTarget: null,
    };
  }

  const picked = pickPrimary(appleSource(profile), webSource(profile));
  if (!picked) return EMPTY_DISPLAY;

  const { primary, secondary } = picked;
  const tierLabel = formatTier(primary.tier);
  let subline: string;
  if (primary.status === "trialing") {
    subline = primary.expiresAt
      ? `Free trial · ends ${formatDisplayDate(primary.expiresAt)}`
      : "Free trial";
  } else {
    const plan = tierLabel ? `${tierLabel} plan` : "Pro plan";
    subline = primary.expiresAt
      ? `${plan} · renews ${formatDisplayDate(primary.expiresAt)}`
      : plan;
  }

  let footnote: string | null = null;
  if (secondary) {
    footnote =
      secondary.source === "apple"
        ? "You also have an active subscription through the App Store."
        : "You also have an active subscription on the web.";
  }

  const manageTarget: "apple" | "web" | null =
    primary.source === "apple" ? "apple" : primary.source === "web" ? "web" : null;

  return {
    isPro: true,
    source: primary.source,
    secondarySource: secondary?.source ?? null,
    tier: primary.tier,
    status: primary.status,
    expiresAt: primary.expiresAt,
    badgeLabel: "Layer Weather Pro",
    subline,
    footnote,
    showManage: manageTarget !== null,
    manageTarget,
  };
}
