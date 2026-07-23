
-- Logo for platform
ALTER TABLE public.school_info ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Admin chat table
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  content TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read admin messages" ON public.admin_messages;
CREATE POLICY "admins read admin messages" ON public.admin_messages FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins insert admin messages" ON public.admin_messages;
CREATE POLICY "admins insert admin messages" ON public.admin_messages FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND auth.uid() = user_id);

DROP POLICY IF EXISTS "admins delete own admin messages" ON public.admin_messages;
CREATE POLICY "admins delete own admin messages" ON public.admin_messages FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(),'admin') AND auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS admin_messages_created_at_idx ON public.admin_messages (created_at DESC);

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.online_presence;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
