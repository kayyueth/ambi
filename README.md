This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase Setup

1. Install dependencies (already in `package.json`):

```bash
npm i @supabase/supabase-js @supabase/ssr --save-exact
```

2. Configure environment variables. Copy `env.example` to `.env.local` and fill in values from your Supabase project settings (API):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

3. Use the helpers:

- Server (Route Handlers/Server Actions):

```ts
import { getSupabaseServerClient } from "lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("examples").select("*");
  return Response.json({ data, error });
}
```

- Client components:

```ts
"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "lib/supabase/client";

export function Example() {
  const [rows, setRows] = useState([] as Array<Record<string, unknown>>);
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("examples")
      .select("*")
      .then(({ data }) => setRows(data ?? []));
  }, []);
  return <pre>{JSON.stringify(rows, null, 2)}</pre>;
}
```

Notes:

- Ensure `cookies()` is used inside Server Actions or Route Handlers when mutating auth cookies.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
