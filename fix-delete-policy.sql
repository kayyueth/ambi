-- Fix delete policy to allow users to delete their own contributions regardless of status
-- This fixes the issue where published contributions couldn't be deleted

-- Drop the existing restrictive policy
drop policy if exists defs_delete_own_unpublished on public.definitions;

-- Create a new policy that allows users to delete their own contributions regardless of status
create policy defs_delete_own on public.definitions
  for delete
  to authenticated
  using (auth.uid() = user_id);
