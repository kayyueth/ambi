# Sources Workspace in Contributions

## Context
Contributions should feel like a workspace. The primary organizing unit becomes a "source" (book or similar), shown as a card wall. Clicking a source card opens a detail view listing the terms/definitions contributed to that source. A separate page lets users create source metadata (title, author, year, publisher, ISBN). No data migration is done at this stage.

## Goals
- Default contributions view shows source cards for sources the user contributed to.
- Each source card links to a source detail page with definition summaries.
- Provide a "new source" page to save source metadata only.
- Source data is public and can be shared across users.

## Non-goals (for this iteration)
- Backfilling existing definitions into a new source model (no migration).
- Automatic file upload/extraction for sources.
- Full moderation workflows for duplicate sources (allow, but not enforced).

## Data Model
- New table: `sources`
  - `id` (uuid)
  - `title` (text, required)
  - `author` (text, optional)
  - `year` (text, optional)
  - `publisher` (text, optional)
  - `isbn` (text, optional)
  - `cover_url` (text, optional; scraped cover link)
  - `openlibrary_key` (text, optional; upstream identifier)
  - `created_by` (uuid, optional)
  - `created_at`, `updated_at` (timestamps)
- Existing `definitions.source` remains the join key for now.
- Future: add `definitions.source_id` and migrate existing rows.

## Routing & Pages
- `/contributions`
  - Default tab: Sources.
  - Source cards show title, contribution count, last updated, and a short definition preview.
  - Provide a button to create a new source (links to `/sources/new`).
- `/sources/new`
  - Form to create source metadata (title required, others optional).
  - Requires sign-in.
  - Optional: auto-fill via Open Library (ISBN preferred).
- `/sources/[source]`
  - `source` is the URL-encoded source title string.
  - Loads metadata (if present) and lists all definitions whose `definitions.source` matches.
  - Displays term name + definition summary + status/weight.

## APIs
- `GET /api/sources`
  - `title=`: return the source metadata for an exact title match.
  - `q=`: search by title substring.
  - `limit=`: cap results (default 50).
- `POST /api/sources`
  - Create a new source metadata record. Requires auth.
- `POST /api/sources/enrich`
  - Fetch suggested metadata from Open Library using ISBN or title/author.
- `POST /api/sources/lookup`
  - Body: `{ "titles": string[] }`.
  - Returns metadata for any matching titles.
- `GET /api/sources/terms?source=...`
  - Returns term + definition summaries filtered by `definitions.source`.

## UX Notes
- Contributions defaults to "my sources" (derived from user contributions).
- Offer a toggle to include all sources (future enhancement).
- Source details should show definition summaries (truncate long text).

## Risks / Tradeoffs
- Title-based matching can create duplicates and typos.
- URL-encoding of titles assumes no unusual path characters; should be acceptable for typical book titles.
- Without migration, metadata may not exist for legacy sources.

## Follow-ups
- Add `source_id` on definitions and migrate.
- Merge/edit tooling for duplicate sources.
- Optional file upload and extraction workflow for sources.
