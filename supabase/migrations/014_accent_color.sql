-- Add accent_color preference to user profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent_color text DEFAULT NULL;
