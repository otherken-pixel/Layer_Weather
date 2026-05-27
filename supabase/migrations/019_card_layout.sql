-- Persist card layout (order + minimize state) per user for cross-device sync
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS card_layout JSONB DEFAULT NULL;
