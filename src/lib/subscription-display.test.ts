import { describe, it, expect } from "vitest";
import { getProDisplayState } from "@/lib/subscription-display";
import type { Profile } from "@/types";

function baseProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    email: "test@example.com",
    display_name: "Test",
    theme_preference: null,
    accent_color: null,
    temp_unit: "F",
    outfit_display_mode: "visual",
    style_preference: ["neutral"],
    formality_preference: "casual",
    commute_start: null,
    commute_end: null,
    fcm_token: null,
    last_latitude: null,
    last_longitude: null,
    last_city: null,
    saved_locations: null,
    nerd_mode_enabled: false,
    nerd_mode_cards: [],
    card_layout: null,
    subscription_status: "none",
    subscription_tier: null,
    subscription_expires_at: null,
    trial_started_at: null,
    original_transaction_id: null,
    web_subscription_status: "none",
    web_subscription_tier: null,
    web_subscription_expires_at: null,
    comp_access: false,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("getProDisplayState", () => {
  it("returns not pro when no entitlements", () => {
    const state = getProDisplayState(baseProfile());
    expect(state.isPro).toBe(false);
    expect(state.showManage).toBe(false);
  });

  it("shows Apple subscription with manage target apple", () => {
    const state = getProDisplayState(
      baseProfile({
        subscription_status: "active",
        subscription_tier: "monthly",
        subscription_expires_at: "2030-06-01T00:00:00.000Z",
      }),
    );
    expect(state.isPro).toBe(true);
    expect(state.source).toBe("apple");
    expect(state.manageTarget).toBe("apple");
    expect(state.subline).toContain("Monthly");
    expect(state.subline).toContain("renews");
  });

  it("shows web subscription with manage target web", () => {
    const state = getProDisplayState(
      baseProfile({
        web_subscription_status: "trialing",
        web_subscription_tier: "annual",
        web_subscription_expires_at: "2030-07-01T00:00:00.000Z",
      }),
    );
    expect(state.source).toBe("web");
    expect(state.manageTarget).toBe("web");
    expect(state.subline).toContain("Free trial");
  });

  it("prefers complimentary over paid subscriptions", () => {
    const state = getProDisplayState(
      baseProfile({
        comp_access: true,
        subscription_status: "active",
        web_subscription_status: "active",
      }),
    );
    expect(state.source).toBe("comp");
    expect(state.showManage).toBe(false);
    expect(state.subline).toContain("Complimentary");
  });

  it("notes secondary subscription when both apple and web are active", () => {
    const state = getProDisplayState(
      baseProfile({
        subscription_status: "active",
        subscription_tier: "monthly",
        subscription_expires_at: "2030-01-01T00:00:00.000Z",
        web_subscription_status: "active",
        web_subscription_tier: "annual",
        web_subscription_expires_at: "2031-01-01T00:00:00.000Z",
      }),
    );
    expect(state.source).toBe("web");
    expect(state.secondarySource).toBe("apple");
    expect(state.footnote).toContain("App Store");
  });
});
