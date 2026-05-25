create table if not exists user_weather_wardrobes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  scenario      text not null check (scenario in ('hot','warm','cool','cold','rainy','snowy')),
  top_svg       text,
  bottom_svg    text,
  outerwear_svg text,
  footwear_svg  text,
  accessory_svgs text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, scenario)
);

alter table user_weather_wardrobes enable row level security;

create policy "Users can manage their own weather wardrobes"
  on user_weather_wardrobes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_weather_wardrobes_user
  on user_weather_wardrobes (user_id);
