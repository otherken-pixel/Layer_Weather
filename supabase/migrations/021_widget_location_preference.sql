-- Widget & Watch location override (synced from app Settings)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS widget_location_preference jsonb DEFAULT NULL;

COMMENT ON COLUMN public.profiles.widget_location_preference IS
  'Optional override for widget/watch: { "mode": "today"|"home"|"saved", "savedKey": "city|lat|lon" }';
