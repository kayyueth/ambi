# Subject Tags Migration Guide

## Overview

The profile `subject` field has been updated to support multiple subject keywords as tags. Users can now add multiple subjects to their profile instead of just one.

## Database Changes

The `subject` column in the `profiles` table has been changed from `text` to `text[]` (array of text).

## How to Apply the Migration

### Option 1: Using Supabase Dashboard SQL Editor

1. Log into your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `supabase/migrate-subjects-to-array.sql`
4. Execute the query

### Option 2: Using psql Command Line

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrate-subjects-to-array.sql
```

Replace `your-db-host` with your actual Supabase database host.

### Option 3: For New Databases

If you're setting up a fresh database, just run the updated `supabase/schema.sql` file:

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/schema.sql
```

## What Changed

### Database Schema

- `subject text` → `subject text[]`
- Default value is now an empty array: `ARRAY[]::text[]`
- Existing single subjects are automatically converted to single-element arrays

### UI Changes

- Profile view now displays multiple subject badges
- Edit mode allows adding/removing subject tags
- Tags can be added by typing and pressing Enter or clicking the "Add" button
- Tags can be removed by clicking the × button on each tag

### Code Changes

- `ProfileFormState.subject` is now `string[]` instead of `string`
- Added `addSubject()` and `removeSubject()` functions
- Added keyboard shortcut (Enter) to add subjects quickly
- Profile loading handles both old (string) and new (array) formats for backward compatibility

## User Experience

Users can now:

1. Click "Edit" on their profile
2. Type a subject keyword (e.g., "Physics")
3. Press Enter or click "Add"
4. Repeat for multiple subjects
5. Remove subjects by clicking the × on any tag
6. Save their profile with multiple subject tags

The subjects will be displayed as separate badges both in edit and view modes.
