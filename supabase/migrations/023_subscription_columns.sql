ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none'
    CONSTRAINT profiles_subscription_status_check
    CHECK (subscription_status IN ('none', 'trialing', 'active', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT
    CONSTRAINT profiles_subscription_tier_check
    CHECK (subscription_tier IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_transaction_id TEXT;
