# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js App Router project. Key directories:
- `app/`: routes, pages, and API route handlers (e.g., `app/api/**/route.ts`).
- `components/`: shared UI and feature components; `components/ui/` hosts Radix-based primitives.
- `lib/`: Supabase clients, utilities, auth context, and file-processing helpers.
- `public/`: static assets (icons, SVGs).
- `scripts/`: Supabase admin scripts (seeding, SQL migrations, bulk uploads).
- `types/`: custom TypeScript type declarations.

## Build, Test, and Development Commands
- `npm run dev`: start the dev server with Turbopack.
- `npm run build`: production build.
- `npm run start`: run the production server after a build.
- `npm run lint`: run ESLint.
- `npm run seed:supabase`: seed Supabase with mock data (requires `.env.local`).

## Coding Style & Naming Conventions
- TypeScript + React; strict mode is enabled in `tsconfig.json`.
- 2-space indentation, semicolons, and double quotes are the prevailing style.
- Components use PascalCase and live in `components/`; hooks should follow `useX` naming.
- Prefer the `@/` path alias for internal imports.
- Styling is Tailwind CSS; add global styles in `app/globals.css`.

## Testing Guidelines
- No automated test framework or coverage tooling is configured yet.
- Validate changes via the dev server and targeted manual flows.
- If you add tests, document the runner and command in `package.json` and keep tests near the code they cover.

## Commit & Pull Request Guidelines
- Commit messages follow a lightweight conventional style: `feat:`, `chore:`, `optimization:`, `revert:` (use concise, imperative summaries).
- PRs should include a short rationale, testing notes, and screenshots for UI changes.
- Call out any new environment variables or Supabase schema changes; include migration or script steps.

## Configuration & Data Notes
- Copy `env.example` to `.env.local` and set Supabase keys; never expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
- Supabase scripts typically run via `npx tsx scripts/<name>.ts <file>` with `.env.local` loaded.
