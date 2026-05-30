ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_daily_digest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_weekly_recap boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_severe_alerts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_marketing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS digest_send_hour smallint NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS digest_timezone text NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS email_unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_profiles_digest_send_hour ON public.profiles(digest_send_hour)
  WHERE email_daily_digest = true;

CREATE INDEX IF NOT EXISTS idx_profiles_weekly_recap ON public.profiles(email_weekly_recap)
  WHERE email_weekly_recap = true;

CREATE OR REPLACE FUNCTION public.unsubscribe_email(token uuid, list text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF list = 'daily_digest' THEN
    UPDATE public.profiles SET email_daily_digest = false WHERE email_unsubscribe_token = token;
  ELSIF list = 'weekly_recap' THEN
    UPDATE public.profiles SET email_weekly_recap = false WHERE email_unsubscribe_token = token;
  ELSIF list = 'severe_alerts' THEN
    UPDATE public.profiles SET email_severe_alerts = false WHERE email_unsubscribe_token = token;
  ELSIF list = 'all' THEN
    UPDATE public.profiles SET
      email_daily_digest = false,
      email_weekly_recap = false,
      email_severe_alerts = false,
      email_marketing = false
    WHERE email_unsubscribe_token = token;
  ELSE
    RETURN false;
  END IF;
  RETURN FOUND;
END;
$$;
