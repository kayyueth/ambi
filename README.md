# Ambiguity

Ambiguity is a public definitions wiki. It lets people extract, upload, and review definitions, then browse curated terms and sources.

## Highlights

- Search and browse public definitions by term or source
- Upload definitions manually or extract from PDFs and images
- OCR support for images (Tesseract.js) and text extraction for PDFs
- Review workflow for candidate definitions
- Supabase auth, comments, and contribution history

## Tech Stack

- Next.js App Router + React 19
- Supabase (Auth + Postgres)
- Tailwind CSS + Radix UI
- pdf-parse + tesseract.js for file processing

## Getting Started

1. Install dependencies:

```bash
# nvm use 22
npm install
```

2. Create `.env.local` with your Supabase keys:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

3. Run the dev server:

```bash
npm run dev
```

Open http://localhost:3000 to view the app.

## Scripts

- `npm run dev` - start the dev server (Turbopack)
- `npm run build` - production build
- `npm run start` - run the production server
- `npm run lint` - run ESLint
- `npm run seed:supabase` - seed mock terms and definitions

## Supabase Notes

- Server helpers live in `lib/supabase/server.ts` and client helpers in `lib/supabase/client.ts`.
- `SUPABASE_SERVICE_ROLE_KEY` is used only by scripts and server-side code. Never expose it to the browser.

## File Upload Behavior

- PDFs with selectable text use PDF parsing.
- Scanned PDFs are rejected with a message to upload as an image instead.
- Images use OCR and report a confidence score in the UI.
