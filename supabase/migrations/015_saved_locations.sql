-- Add saved_locations column to sync location list across devices
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS saved_locations jsonb DEFAULT '[]'::jsonb;
