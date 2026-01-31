drop policy if exists "Sources can be deleted by creators" on public.sources;
create policy "Sources can be deleted by creators" on public.sources
for delete to authenticated
using (created_by = auth.uid());

