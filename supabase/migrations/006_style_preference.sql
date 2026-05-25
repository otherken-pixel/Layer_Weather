alter table profiles
  add column if not exists style_preference text default 'all'
    check (style_preference in ('feminine','masculine','all'));
