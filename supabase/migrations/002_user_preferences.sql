-- Persist city label and calibration preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_city text;

-- user_calibration (create if missing from remote-only setup)
CREATE TABLE IF NOT EXISTS public.user_calibration (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  thermal_sensitivity smallint NOT NULL DEFAULT 0,
  shorts_min_temp numeric NOT NULL DEFAULT 72,
  pants_max_temp numeric NOT NULL DEFAULT 75,
  light_jacket_max_temp numeric NOT NULL DEFAULT 65,
  heavy_coat_max_temp numeric NOT NULL DEFAULT 45,
  rain_tolerance text NOT NULL DEFAULT 'moderate' CHECK (rain_tolerance IN ('low', 'moderate', 'high')),
  humidity_sensitivity boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_calibration
  ADD COLUMN IF NOT EXISTS humidity_sensitivity boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_calibration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own calibration" ON public.user_calibration;
CREATE POLICY "Users manage own calibration"
  ON public.user_calibration
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_calibration TO authenticated;
