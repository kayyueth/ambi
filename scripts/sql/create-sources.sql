create extension if not exists "pgcrypto";

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  year text,
  publisher text,
  isbn text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sources_title_idx on public.sources (title);
create index if not exists sources_updated_at_idx on public.sources (updated_at desc);

alter table public.sources enable row level security;

create policy "Sources are viewable by everyone" on public.sources
for select using (true);

create policy "Sources can be created by authenticated users" on public.sources
for insert to authenticated
with check (auth.uid() = created_by);

create policy "Sources can be updated by creators" on public.sources
for update to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);
