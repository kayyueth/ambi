# Supabase Integration Guide

## Overview

Your application has been successfully integrated with Supabase! All data uploads, searches, and contributions now use the Supabase database instead of mock data.

## 🗄️ Database Schema

The schema matches your existing data structure perfectly:

### Tables

**`terms`**

- `id` (uuid, primary key)
- `slug` (text, unique)
- `term` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**`definitions`**

- `id` (uuid, primary key)
- `term_id` (uuid, foreign key to terms.id)
- `text` (text)
- `source` (text)
- `weight` (double precision, default 0.5)
- `status` (text, enum: 'draft', 'pending', 'published', 'rejected')
- `user_id` (uuid, references auth.users.id)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Security Features

- Row Level Security (RLS) enabled
- Public read access for published definitions
- Authenticated users can manage their own contributions
- Proper foreign key relationships with cascade delete

## 🚀 Setup Instructions

### 1. Environment Variables

Make sure you have these environment variables set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For migrations
```

### 2. Database Setup

Run the schema migration:

```bash
# Apply the schema to your Supabase database
psql -h your-db-host -U postgres -d postgres -f supabase/schema.sql
```

### 3. Migrate Existing Data

Run the migration script to populate your database with existing mock data:

```bash
npx tsx scripts/migrate-to-supabase.ts
```

## 🔄 Updated API Endpoints

All API endpoints now use Supabase:

### Upload API (`/api/upload`)

- **POST**: Upload text or file definitions
- Creates terms and definitions in Supabase
- Handles both file uploads (PDF/OCR) and direct text input

### Search API (`/api/search`)

- **GET**: Search terms using PostgreSQL full-text search
- Uses trigram indexing for fuzzy matching

### Term API (`/api/term/[slug]`)

- **GET**: Fetch term and published definitions
- Only shows published definitions to public users

### Contributions API (`/api/contributions`)

- **GET**: Fetch user contributions grouped by status
- Requires `userId` parameter

### Individual Contribution API (`/api/contributions/[id]`)

- **GET**: Fetch specific contribution
- **PATCH**: Update contribution status
- **DELETE**: Delete contribution

## 🔐 Authentication Integration

The system is ready for Supabase Auth integration:

- User IDs are properly stored in the database
- Row Level Security policies are configured
- Anonymous contributions are supported (user_id = null)

To enable full authentication, you'll need to:

1. Set up Supabase Auth in your frontend
2. Update the upload forms to include real user IDs
3. Implement proper authentication checks in your API routes

## 📊 Data Migration

The migration script (`scripts/migrate-to-supabase.ts`) will:

1. Clear existing data (optional)
2. Migrate all terms from mock data
3. Migrate all definitions with proper relationships
4. Preserve user IDs and status information

## 🛠️ Development

### Local Development

1. Set up your Supabase project
2. Configure environment variables
3. Run the schema migration
4. Run the data migration script
5. Start your development server

### Testing

Test the integration by:

1. Uploading a new definition via the API
2. Searching for terms
3. Fetching term details
4. Managing user contributions

## 🔍 Key Features

- **Full-text search** with PostgreSQL trigram indexing
- **File processing** (PDF text extraction, OCR for images)
- **Status management** (draft, pending, published, rejected)
- **User attribution** with proper foreign key relationships
- **Row Level Security** for data protection
- **Automatic timestamps** with triggers

## 🚨 Important Notes

1. **Service Role Key**: Keep your service role key secure and never expose it in client-side code
2. **RLS Policies**: The current policies allow public read access to published content and authenticated user management
3. **User IDs**: Currently using string-based user IDs; update to UUID format when integrating with Supabase Auth
4. **Error Handling**: All API endpoints include proper error handling and logging

## 🔧 Troubleshooting

### Common Issues

1. **Connection Errors**: Verify your environment variables are correct
2. **Permission Errors**: Ensure RLS policies are properly configured
3. **Migration Failures**: Check that the schema was applied correctly
4. **Search Not Working**: Verify the pg_trgm extension is enabled

### Debug Mode

Enable debug logging by checking the console output in your API routes.

---

Your application is now fully integrated with Supabase! 🎉
