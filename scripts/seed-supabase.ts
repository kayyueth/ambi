/*
  Seed Supabase with mock terms and definitions.
  Uses service role key; DO NOT run in the browser.
*/

import { createClient } from "@supabase/supabase-js";
import * as path from "node:path";
import * as fs from "node:fs";

// Load env from .env.local if present
try {
  const envLocal = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocal)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("dotenv").config({ path: envLocal });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("dotenv").config();
  }
} catch {
  // ignore
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

interface SeedTerm {
  term: string;
  slug: string;
  definitions: Array<{
    text: string;
    source: string;
    weight: number;
    status: "draft" | "pending" | "published" | "rejected";
  }>;
}

function toSlug(term: string): string {
  return encodeURIComponent(term.trim().toLowerCase().replace(/\s+/g, "-"));
}

const TERMS: SeedTerm[] = [
  {
    term: "Social Construct",
    slug: toSlug("Social Construct"),
    definitions: [
      {
        text: "An idea or category whose meaning and significance are produced through social practices rather than inherent natural properties.",
        source: "Intro to Sociology, 5th ed.",
        weight: 0.72,
        status: "published",
      },
      {
        text: "A concept that exists because people agree to act as if it exists, shaping institutions and behavior.",
        source: "Stanford Encyclopedia (paraphrase)",
        weight: 0.64,
        status: "published",
      },
    ],
  },
  {
    term: "Habitus",
    slug: toSlug("Habitus"),
    definitions: [
      {
        text: "Durable, embodied dispositions that guide perception and action, produced by socialization and history.",
        source: "Bourdieu, Outline of a Theory of Practice",
        weight: 0.68,
        status: "published",
      },
      {
        text: "A system of internalized schemes that generate practices consistent with social structures.",
        source: "Sociology glossary",
        weight: 0.59,
        status: "pending",
      },
    ],
  },
];

async function main() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const t of TERMS) {
    const { data: existing, error: findErr } = await supabase
      .from("terms")
      .select("id")
      .eq("slug", t.slug)
      .maybeSingle();
    if (findErr) throw findErr;

    let termId: string;
    if (existing?.id) {
      termId = existing.id;
    } else {
      const { data: insertTerm, error: termErr } = await supabase
        .from("terms")
        .insert({ slug: t.slug, term: t.term })
        .select("id")
        .single();
      if (termErr) throw termErr;
      termId = insertTerm.id as string;
    }

    for (const d of t.definitions) {
      const { error: defErr } = await supabase.from("definitions").insert({
        term_id: termId,
        text: d.text,
        source: d.source,
        weight: d.weight,
        status: d.status,
        user_id: null,
      });
      if (defErr) throw defErr;
    }
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
