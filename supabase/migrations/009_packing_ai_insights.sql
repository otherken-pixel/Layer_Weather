-- AI-generated packing insights (on-demand via Gemini; cached per trip)
alter table packing_trips
  add column if not exists ai_insights jsonb,
  add column if not exists ai_generated_at timestamptz;

comment on column packing_trips.ai_insights is 'Cached Gemini response: summary, daily highlights, packing notes, recommendations';
comment on column packing_trips.ai_generated_at is 'When ai_insights was last generated';
