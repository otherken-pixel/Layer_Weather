CREATE TABLE IF NOT EXISTS public.outfit_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_type text NOT NULL,
  feels_like_temp numeric NOT NULL,
  weather_code integer NOT NULL DEFAULT 0,
  wind_speed numeric NOT NULL DEFAULT 0,
  feedback text NOT NULL CHECK (feedback IN ('thumbs_up', 'thumbs_down')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outfit_feedback_user_created
  ON public.outfit_feedback (user_id, created_at DESC);

ALTER TABLE public.outfit_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feedback"
  ON public.outfit_feedback
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT ON public.outfit_feedback TO authenticated;
