-- Nerd Mode: master toggle + ordered list of enabled card IDs
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nerd_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nerd_mode_cards   TEXT[]  NOT NULL DEFAULT '{}';
