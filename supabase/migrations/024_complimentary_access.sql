-- Complimentary (server-granted) Pro access.
--
-- Lets admins grant free Pro to specific users without an Apple transaction.
-- Premium gating in the app reads profiles.comp_access, so setting it here
-- unlocks Pro on the user's next launch. Time-limited grants auto-expire on the
-- client (comp_access_until is checked live); lifetime grants leave it NULL.
--
-- SECURITY: the client writes to its own profiles row with the anon key
-- (see src/lib/supabase.ts upsertProfile), so these columns MUST NOT be settable
-- by app users — otherwise anyone could grant themselves Pro. A trigger ignores
-- any change to them from authenticated/anon requests; only the service role or
-- direct dashboard/SQL access may set them.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS comp_access       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comp_access_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comp_note         TEXT;

-- ── Block end-user writes to the comp_* columns ─────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_comp_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
BEGIN
  -- Only restrict end-user (client) requests. Service role, edge functions, and
  -- direct dashboard/SQL access (no JWT → jwt_role is NULL) may set comp fields.
  IF jwt_role IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.comp_access       := false;
      NEW.comp_access_until := NULL;
      NEW.comp_note         := NULL;
    ELSE
      NEW.comp_access       := OLD.comp_access;
      NEW.comp_access_until := OLD.comp_access_until;
      NEW.comp_note         := OLD.comp_note;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_comp_columns ON public.profiles;
CREATE TRIGGER trg_protect_comp_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_comp_columns();

-- ── Admin helpers (service-role / SQL editor only) ──────────────────────────
-- Grant comp Pro by email. until = NULL → lifetime; a timestamp → expires then.
--   select grant_comp_access('vip@example.com');                        -- lifetime
--   select grant_comp_access('beta@example.com', now() + interval '1 year', 'beta cohort');
CREATE OR REPLACE FUNCTION public.grant_comp_access(
  target_email text,
  until         timestamptz DEFAULT NULL,
  note          text        DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.profiles;
BEGIN
  UPDATE public.profiles
     SET comp_access       = true,
         comp_access_until = until,
         comp_note         = note,
         updated_at        = now()
   WHERE lower(email) = lower(target_email)
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile found with email %', target_email;
  END IF;
  RETURN result;
END;
$$;

--   select revoke_comp_access('vip@example.com');
CREATE OR REPLACE FUNCTION public.revoke_comp_access(target_email text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.profiles;
BEGIN
  UPDATE public.profiles
     SET comp_access       = false,
         comp_access_until = NULL,
         comp_note         = NULL,
         updated_at        = now()
   WHERE lower(email) = lower(target_email)
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile found with email %', target_email;
  END IF;
  RETURN result;
END;
$$;

-- App users must never call these; service role & dashboard/SQL retain access.
REVOKE EXECUTE ON FUNCTION public.grant_comp_access(text, timestamptz, text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_comp_access(text)                    FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.grant_comp_access(text, timestamptz, text) TO service_role;
GRANT  EXECUTE ON FUNCTION public.revoke_comp_access(text)                    TO service_role;
