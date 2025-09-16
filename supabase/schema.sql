-- Required extensions
create extension if not exists pg_trgm;

-- Terms and Definitions schema for Supabase

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  term text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.definitions (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.terms(id) on delete cascade,
  text text not null,
  source text not null,
  weight double precision not null default 0.5,
  status text not null check (status in ('draft','pending','published','rejected')) default 'pending',
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists terms_slug_idx on public.terms(slug);
create index if not exists terms_term_trgm_idx on public.terms using gin (term gin_trgm_ops);
create index if not exists definitions_term_id_idx on public.definitions(term_id);
create index if not exists definitions_status_idx on public.definitions(status);

-- Row Level Security
alter table public.terms enable row level security;
alter table public.definitions enable row level security;

-- Policies: Terms are readable by anyone; inserts/updates only by authenticated users
create policy if not exists terms_read_all on public.terms
  for select using (true);

create policy if not exists terms_write_auth on public.terms
  for all to authenticated using (true) with check (true);

-- Policies: Definitions readable to all if published; authors can read their own; inserts by authenticated users; updates/deletes only by owner while not published
create policy if not exists defs_read_published on public.definitions
  for select using (status = 'published');

create policy if not exists defs_read_own on public.definitions
  for select to authenticated using (auth.uid() = user_id);

create policy if not exists defs_insert_auth on public.definitions
  for insert to authenticated with check (auth.uid() = user_id);

create policy if not exists defs_update_own_unpublished on public.definitions
  for update to authenticated using (auth.uid() = user_id and status != 'published') with check (auth.uid() = user_id and status != 'published');

create policy if not exists defs_delete_own_unpublished on public.definitions
  for delete to authenticated using (auth.uid() = user_id and status != 'published');

-- Updated timestamp triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_terms_updated_at on public.terms;
create trigger set_terms_updated_at before update on public.terms
for each row execute function public.set_updated_at();

drop trigger if exists set_definitions_updated_at on public.definitions;
create trigger set_definitions_updated_at before update on public.definitions
for each row execute function public.set_updated_at();


