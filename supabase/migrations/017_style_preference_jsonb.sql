-- style_preference is a multi-select array (feminine, masculine, neutral).
-- Migration 006 used a single text enum that rejects JSON array values and 'neutral'.

alter table profiles drop constraint if exists profiles_style_preference_check;

alter table profiles
  alter column style_preference drop default;

alter table profiles
  alter column style_preference type jsonb
  using (
    case
      when style_preference is null then '["feminine","masculine","neutral"]'::jsonb
      when style_preference = 'all' then '["feminine","masculine","neutral"]'::jsonb
      when style_preference ~ '^\s*\[' then style_preference::jsonb
      else jsonb_build_array(style_preference)
    end
  );

alter table profiles
  alter column style_preference set default '["feminine","masculine","neutral"]'::jsonb;

alter table profiles
  add constraint profiles_style_preference_check
  check (
    jsonb_typeof(style_preference) = 'array'
    and jsonb_array_length(style_preference) > 0
    and style_preference <@ '["feminine","masculine","neutral","all"]'::jsonb
  );
