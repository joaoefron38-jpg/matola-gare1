
-- Public read tables (anyone including anon can view)
GRANT SELECT ON public.library_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;

GRANT SELECT ON public.knowledge_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_items TO authenticated;
GRANT ALL ON public.knowledge_items TO service_role;

GRANT SELECT ON public.gallery_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;

GRANT SELECT ON public.news_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.news_items TO authenticated;
GRANT ALL ON public.news_items TO service_role;

GRANT SELECT ON public.school_info TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.school_info TO authenticated;
GRANT ALL ON public.school_info TO service_role;

-- Auth-only tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.view_history TO authenticated;
GRANT ALL ON public.view_history TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions_log TO authenticated;
GRANT ALL ON public.sessions_log TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.online_presence TO authenticated;
GRANT ALL ON public.online_presence TO service_role;
