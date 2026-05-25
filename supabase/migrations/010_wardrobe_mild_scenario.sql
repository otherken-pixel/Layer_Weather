-- Add 'mild' scenario (60–64°F light jacket zone) to weather wardrobes.
-- Splits the existing 'warm' (60–71°F) band which was too broad — it now
-- covers warmth_2/3 (65–71°F) while 'mild' covers warmth_4 (60–64°F).
alter table user_weather_wardrobes
  drop constraint if exists user_weather_wardrobes_scenario_check;

alter table user_weather_wardrobes
  add constraint user_weather_wardrobes_scenario_check
  check (scenario in ('hot','warm','mild','cool','cold','rainy','snowy'));
