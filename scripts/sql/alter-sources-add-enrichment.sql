alter table public.sources
  add column if not exists cover_url text,
  add column if not exists openlibrary_key text;

drop policy if exists "Sources can be updated by authenticated users" on public.sources;
drop policy if exists "Sources can be updated by creators" on public.sources;
create policy "Sources can be updated by creators" on public.sources
for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());
