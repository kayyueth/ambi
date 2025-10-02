-- Migration: Change subject from text to text[] (array)
-- This allows users to have multiple subject tags

-- First, convert existing single subjects to arrays
-- If subject is NULL or empty, set to empty array
-- If subject has a value, convert it to a single-element array
ALTER TABLE public.profiles 
ALTER COLUMN subject TYPE text[] 
USING CASE 
  WHEN subject IS NULL OR subject = '' THEN ARRAY[]::text[]
  ELSE ARRAY[subject]::text[]
END;

-- Set default to empty array for new records
ALTER TABLE public.profiles 
ALTER COLUMN subject SET DEFAULT ARRAY[]::text[];

