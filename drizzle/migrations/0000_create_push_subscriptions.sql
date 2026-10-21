create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_id uuid,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant insert, update on public.push_subscriptions to anon;
grant all on public.push_subscriptions to service_role;

alter table public.push_subscriptions enable row level security;

create policy "Registos visiveis apenas ao proprietario"
  on public.push_subscriptions for select to authenticated
  using (auth.uid() = user_id);

create policy "Visitantes e utilizadores registam o seu navegador"
  on public.push_subscriptions for insert to anon, authenticated
  with check ((auth.uid() is null and user_id is null) or user_id = auth.uid());

create policy "Atualizacao apenas do proprietario"
  on public.push_subscriptions for update to anon, authenticated
  using ((auth.uid() is null and user_id is null) or user_id = auth.uid())
  with check ((auth.uid() is null and user_id is null) or user_id = auth.uid());

create policy "Remocao apenas do proprietario"
  on public.push_subscriptions for delete to authenticated
  using (auth.uid() = user_id);