create table if not exists public.user_wardrobe (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('tops','bottoms','outerwear','footwear','accessories')),
  name text not null,
  warmth_rating smallint not null default 3 check (warmth_rating between 1 and 5),
  is_waterproof boolean not null default false,
  style_tags text[] not null default '{}',
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_wardrobe enable row level security;

create policy "Users can manage their own wardrobe"
  on public.user_wardrobe
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_wardrobe_user_id_idx on public.user_wardrobe(user_id);
create index if not exists user_wardrobe_category_idx on public.user_wardrobe(user_id, category);
