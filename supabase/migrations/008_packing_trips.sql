create table if not exists packing_trips (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  destination       text not null,
  latitude          numeric not null,
  longitude         numeric not null,
  country_code      text,
  departure_date    date not null,
  return_date       date not null,
  packing_list      jsonb,
  weather_snapshot  jsonb,
  last_generated_at timestamptz,
  created_at        timestamptz not null default now(),
  constraint trip_dates_valid check (return_date >= departure_date)
);

alter table packing_trips enable row level security;

create policy "Users can manage their own trips"
  on packing_trips for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_packing_trips_user
  on packing_trips (user_id);

create index if not exists idx_packing_trips_departure
  on packing_trips (departure_date);
