-- Extend profiles table with fields the app code expects
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name       text,
  ADD COLUMN IF NOT EXISTS commute_start      text DEFAULT '07:30',
  ADD COLUMN IF NOT EXISTS commute_end        text DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS last_latitude      double precision,
  ADD COLUMN IF NOT EXISTS last_longitude     double precision,
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz DEFAULT now();

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
