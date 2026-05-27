-- style_preference stores JSON-encoded StylePreference[] (e.g. ["feminine","neutral"]).
-- Drop the legacy scalar CHECK from migration 006 so upserts no longer fail.
alter table public.profiles
  drop constraint if exists profiles_style_preference_check;
