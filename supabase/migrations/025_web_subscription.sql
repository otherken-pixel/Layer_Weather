-- Web subscriptions (RevenueCat Web Billing / Stripe).
-- Apple subscriptions continue to use subscription_* columns (StoreKit).
-- Premium gating checks both sources.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS web_subscription_status TEXT NOT NULL DEFAULT 'none'
    CONSTRAINT profiles_web_subscription_status_check
    CHECK (web_subscription_status IN ('none', 'trialing', 'active', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS web_subscription_tier TEXT
    CONSTRAINT profiles_web_subscription_tier_check
    CHECK (web_subscription_tier IS NULL OR web_subscription_tier IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS web_subscription_expires_at TIMESTAMPTZ;

-- Block client writes to subscription fields (same pattern as comp_access).
CREATE OR REPLACE FUNCTION public.protect_subscription_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
BEGIN
  IF jwt_role IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_status := 'none';
      NEW.subscription_tier := NULL;
      NEW.subscription_expires_at := NULL;
      NEW.trial_started_at := NULL;
      NEW.original_transaction_id := NULL;
      NEW.web_subscription_status := 'none';
      NEW.web_subscription_tier := NULL;
      NEW.web_subscription_expires_at := NULL;
    ELSE
      NEW.subscription_status := OLD.subscription_status;
      NEW.subscription_tier := OLD.subscription_tier;
      NEW.subscription_expires_at := OLD.subscription_expires_at;
      NEW.trial_started_at := OLD.trial_started_at;
      NEW.original_transaction_id := OLD.original_transaction_id;
      NEW.web_subscription_status := OLD.web_subscription_status;
      NEW.web_subscription_tier := OLD.web_subscription_tier;
      NEW.web_subscription_expires_at := OLD.web_subscription_expires_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_subscription_columns ON public.profiles;
CREATE TRIGGER trg_protect_subscription_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_columns();

-- Idempotent RevenueCat webhook processing
CREATE TABLE IF NOT EXISTS public.revenuecat_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  app_user_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.revenuecat_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.revenuecat_webhook_events IS
  'Processed RevenueCat webhook event IDs for idempotency. Service role only.';
