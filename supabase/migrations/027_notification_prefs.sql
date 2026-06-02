-- Push notification preferences stored as JSONB on the profile.
-- Avoids adding N boolean columns for every notification type.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_prefs jsonb NOT NULL DEFAULT '{}';
