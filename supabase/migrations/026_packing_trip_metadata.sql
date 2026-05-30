-- Trip metadata, per-day outfits, and checklist state for travel packing MVP

alter table packing_trips
  add column if not exists trip_name text,
  add column if not exists trip_type text,
  add column if not exists activities text[] default '{}',
  add column if not exists laundry_access boolean not null default false,
  add column if not exists daily_outfits jsonb,
  add column if not exists checklist_state jsonb;

comment on column packing_trips.trip_name is 'User-facing trip label';
comment on column packing_trips.trip_type is 'business | leisure | family | adventure | beach | other';
comment on column packing_trips.daily_outfits is 'Per-day outfit recommendations from rules engine';
comment on column packing_trips.checklist_state is 'Map of item keys to { packed: boolean }';
