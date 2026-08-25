CREATE TABLE public.download_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'document',
  status text NOT NULL DEFAULT 'done',
  received bigint NOT NULL DEFAULT 0,
  total bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT download_records_kind_check CHECK (kind IN ('video', 'image', 'audio', 'document')),
  CONSTRAINT download_records_status_check CHECK (status IN ('queued', 'downloading', 'done', 'failed')),
  CONSTRAINT download_records_user_url_unique UNIQUE (user_id, url)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.download_records TO authenticated;
GRANT ALL ON public.download_records TO service_role;

ALTER TABLE public.download_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "download records own read"
ON public.download_records
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "download records own insert"
ON public.download_records
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "download records own update"
ON public.download_records
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "download records own delete"
ON public.download_records
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER download_records_updated
BEFORE UPDATE ON public.download_records
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at();