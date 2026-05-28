-- NOTE: This file shares the 009_ prefix with 009_formality_preference.sql.
-- Supabase CLI applies migrations in alphabetical filename order; 'formality' < 'packing'
-- so the dependency order is correct. Do not add a dependency on formality_preference here.
-- Future migrations should start from 022_ to avoid further prefix collisions.
--
-- AI-generated packing insights (on-demand via Gemini; cached per trip)
alter table packing_trips
  add column if not exists ai_insights jsonb,
  add column if not exists ai_generated_at timestamptz;

comment on column packing_trips.ai_insights is 'Cached Gemini response: summary, daily highlights, packing notes, recommendations';
comment on column packing_trips.ai_generated_at is 'When ai_insights was last generated';
