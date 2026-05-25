alter table profiles
  add column if not exists formality_preference text default 'casual'
    check (formality_preference in ('activewear','casual','business'));
