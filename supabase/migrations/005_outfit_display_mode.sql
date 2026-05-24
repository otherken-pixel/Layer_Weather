ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS outfit_display_mode text NOT NULL DEFAULT 'visual'
    CHECK (outfit_display_mode IN ('visual', 'text'));
