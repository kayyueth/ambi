-- Create a function to get terms sorted by their highest definition weight
-- This function returns the top N terms based on the maximum weight of their published definitions

create or replace function public.get_top_weighted_terms(limit_count integer default 15)
returns table (
  slug text,
  term text,
  max_weight double precision
) 
language sql
stable
as $$
  select 
    t.slug,
    t.term,
    max(d.weight) as max_weight
  from public.terms t
  inner join public.definitions d on d.term_id = t.id
  where d.status = 'published'
  group by t.id, t.slug, t.term
  order by max_weight desc
  limit limit_count;
$$;

-- Grant execute permission to authenticated and anon users
grant execute on function public.get_top_weighted_terms(integer) to authenticated, anon;

