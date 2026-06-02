alter table packing_trips
  add column if not exists trip_reminder_sent_date date;

comment on column packing_trips.trip_reminder_sent_date is 'UTC date when day-before departure push reminder was sent';
