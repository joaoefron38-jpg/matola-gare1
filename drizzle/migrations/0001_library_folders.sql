CREATE TABLE public.library_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.library_folders TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.library_folders TO authenticated;
GRANT ALL ON public.library_folders TO service_role;
GRANT REFERENCES ON public.library_folders TO authenticated;

ALTER TABLE public.library_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pastas leitura publica"
  ON public.library_folders FOR SELECT TO public
  USING (true);

CREATE POLICY "pastas escrita admin"
  ON public.library_folders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.library_items
  ADD COLUMN folder_id uuid REFERENCES public.library_folders(id) ON DELETE SET NULL;